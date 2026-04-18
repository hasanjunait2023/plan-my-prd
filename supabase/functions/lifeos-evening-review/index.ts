// Evening Telegram review — sends completion summary at 9pm Asia/Dhaka = 15:00 UTC
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!BOT_TOKEN) return json({ error: "TELEGRAM_BOT_TOKEN not configured" }, 500);

  const tgBase = `https://api.telegram.org/bot${BOT_TOKEN}`;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const today = dhakaToday();

    const { data: settingsRows } = await supabase
      .from("alert_settings")
      .select("telegram_chat_id")
      .not("telegram_chat_id", "is", null);
    if (!settingsRows || settingsRows.length === 0) {
      return json({ ok: true, skipped: "No telegram_chat_id" });
    }

    const { data: nodeUsers } = await supabase
      .from("life_nodes")
      .select("user_id")
      .neq("status", "archived");
    const userIds = Array.from(new Set((nodeUsers ?? []).map((n) => n.user_id)));

    let totalSent = 0;

    for (const userId of userIds) {
      const { data: focus } = await supabase
        .from("daily_focus")
        .select("id,rank,node_id")
        .eq("user_id", userId)
        .eq("date", today)
        .order("rank");
      if (!focus || focus.length === 0) continue;

      const nodeIds = focus.map((f) => f.node_id);
      const { data: nodes } = await supabase
        .from("life_nodes")
        .select("id,title")
        .in("id", nodeIds);
      const nodeMap = new Map((nodes ?? []).map((n) => [n.id, n.title]));

      const { data: logs } = await supabase
        .from("life_node_logs")
        .select("node_id,done")
        .eq("user_id", userId)
        .eq("date", today)
        .in("node_id", nodeIds);
      const doneSet = new Set((logs ?? []).filter((l) => l.done).map((l) => l.node_id));

      const doneCount = focus.filter((f) => doneSet.has(f.node_id)).length;
      const total = focus.length;
      const rate = Math.round((doneCount / total) * 100);

      // Streak — count consecutive prior days with completion
      const streak = await computeStreak(supabase, userId, today);

      let msg = `🌙 <b>Evening Review — ${today}</b>\n\n`;
      msg += `📊 <b>${doneCount}/${total} priorities done</b> (${rate}%)\n`;
      msg += `🔥 Streak: ${streak} day${streak === 1 ? "" : "s"}\n\n`;

      for (const f of focus) {
        const title = nodeMap.get(f.node_id) || "Task";
        const done = doneSet.has(f.node_id);
        msg += `${done ? "✅" : "⬜"} <b>#${f.rank}.</b> ${title}\n`;
      }

      msg += `\n`;
      if (rate === 100) msg += `🏆 <b>Perfect day!</b> Sob ta done — alignment maxed.`;
      else if (rate >= 60) msg += `💪 Solid day. Tomorrow is fresh.`;
      else if (rate > 0) msg += `🌱 Progress > perfection. Reflect: ki block korlo?`;
      else msg += `🤍 Reset day. Tomorrow morning fresh start hobe.`;

      // Quick-complete remaining
      const pending = focus.filter((f) => !doneSet.has(f.node_id));
      const keyboard = pending.map((f) => [{
        text: `✅ Mark #${f.rank} done now`,
        callback_data: `focus_done_${f.id}`,
      }]);

      for (const row of settingsRows) {
        const chatId = row.telegram_chat_id!;
        await fetch(`${tgBase}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: msg,
            parse_mode: "HTML",
            ...(keyboard.length > 0
              ? { reply_markup: { inline_keyboard: keyboard } }
              : {}),
          }),
        });
        totalSent++;
      }
    }

    return json({ ok: true, sent: totalSent });
  } catch (e) {
    console.error("[lifeos-evening-review]", e);
    return json({ error: (e as Error).message }, 500);
  }
});

async function computeStreak(supabase: any, userId: string, today: string): Promise<number> {
  // Look back 60 days
  const start = new Date(today);
  start.setDate(start.getDate() - 60);
  const { data: focusRows } = await supabase
    .from("daily_focus")
    .select("date,node_id")
    .eq("user_id", userId)
    .gte("date", start.toISOString().slice(0, 10));
  const { data: logRows } = await supabase
    .from("life_node_logs")
    .select("date,node_id,done")
    .eq("user_id", userId)
    .gte("date", start.toISOString().slice(0, 10));

  const focusByDate = new Map<string, Set<string>>();
  (focusRows ?? []).forEach((f: any) => {
    if (!focusByDate.has(f.date)) focusByDate.set(f.date, new Set());
    focusByDate.get(f.date)!.add(f.node_id);
  });
  const doneByDate = new Map<string, Set<string>>();
  (logRows ?? []).forEach((l: any) => {
    if (!l.done) return;
    if (!doneByDate.has(l.date)) doneByDate.set(l.date, new Set());
    doneByDate.get(l.date)!.add(l.node_id);
  });

  let streak = 0;
  const cur = new Date(today);
  for (let i = 0; i < 60; i++) {
    const ds = cur.toISOString().slice(0, 10);
    const focusSet = focusByDate.get(ds);
    const doneSet = doneByDate.get(ds);
    if (focusSet && focusSet.size > 0) {
      const done = Array.from(focusSet).filter((id) => doneSet?.has(id)).length;
      const rate = done / focusSet.size;
      if (rate >= 0.6) streak++;
      else break;
    } else if (doneSet && doneSet.size > 0) {
      streak++;
    } else if (i === 0) {
      // Today no data — skip without breaking
    } else {
      break;
    }
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

function dhakaToday(): string {
  const now = new Date();
  const dhaka = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  return dhaka.toISOString().slice(0, 10);
}

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
