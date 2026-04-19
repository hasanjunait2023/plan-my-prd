// Slot-specific Life OS push — sends Telegram + Web Push for one time-slot
// Slots: morning (6 AM), afternoon (12 PM), evening (6 PM)
// Query/body param: ?slot=morning|afternoon|evening
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Slot = "morning" | "afternoon" | "evening";

const SLOT_LABEL: Record<Slot, string> = {
  morning: "☀️ Morning",
  afternoon: "🌤 Afternoon",
  evening: "🌙 Evening",
};

const SLOT_GREETING: Record<Slot, string> = {
  morning: "Good morning! Here's your morning block.",
  afternoon: "Midday check-in — afternoon block.",
  evening: "Evening focus — last push of the day.",
};

const SLOT_FOOTER: Record<Slot, string> = {
  morning: "💪 Strong start. One step at a time.",
  afternoon: "🚀 Don't break the chain — keep going.",
  evening: "🌙 Finish strong. Reflect after.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  let slot = (url.searchParams.get("slot") || "").toLowerCase() as Slot;
  if (!slot && req.method !== "GET") {
    try {
      const body = await req.json();
      slot = (body.slot || "").toLowerCase();
    } catch {
      // ignore
    }
  }
  if (!["morning", "afternoon", "evening"].includes(slot)) {
    return json({ error: "slot must be morning|afternoon|evening" }, 400);
  }

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const today = dhakaToday();

    // Pull all users that have life_nodes
    const { data: nodeUsers } = await supabase
      .from("life_nodes")
      .select("user_id")
      .neq("status", "archived");
    const userIds = Array.from(new Set((nodeUsers ?? []).map((n) => n.user_id)));

    if (userIds.length === 0) return json({ ok: true, skipped: "no users" });

    const { data: settingsRows } = await supabase
      .from("alert_settings")
      .select("telegram_chat_id")
      .not("telegram_chat_id", "is", null);

    let telegramSent = 0;
    let pushSent = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        // Fetch focus rows for this slot
        const { data: focus } = await supabase
          .from("daily_focus")
          .select("id,rank,reason,node_id,time_slot")
          .eq("user_id", userId)
          .eq("date", today)
          .eq("time_slot", slot)
          .order("rank");

        if (!focus || focus.length === 0) {
          // Nothing planned — send a gentle nudge instead
          const nudge = `${SLOT_LABEL[slot]} — nothing planned for this slot.\nOpen Life OS → Today/Tomorrow to add a task.`;
          await sendTelegramAll(BOT_TOKEN, settingsRows, nudge, []);
          await sendPush(supabase, userId, `${SLOT_LABEL[slot]} block`, "No tasks planned for this slot.", `lifeos-${slot}`, "/life-os");
          continue;
        }

        const nodeIds = focus.map((f) => f.node_id);
        const { data: nodes } = await supabase
          .from("life_nodes")
          .select("id,title")
          .in("id", nodeIds);
        const nodeMap = new Map((nodes ?? []).map((n) => [n.id, n.title]));

        // Build Telegram message
        let msg = `${SLOT_LABEL[slot]} <b>block</b>\n<i>${SLOT_GREETING[slot]}</i>\n\n`;
        const keyboard: { text: string; callback_data: string }[][] = [];
        for (const f of focus) {
          const title = nodeMap.get(f.node_id) || "Task";
          msg += `<b>#${f.rank}.</b> ${title}\n`;
          if (f.reason) msg += `   <i>${f.reason}</i>\n`;
          msg += "\n";
          keyboard.push([
            { text: `✅ #${f.rank} Done`, callback_data: `focus_done_${f.id}` },
            { text: `⏭ Skip`, callback_data: `focus_skip_${f.id}` },
          ]);
        }
        msg += `\n${SLOT_FOOTER[slot]}`;

        const tgCount = await sendTelegramAll(BOT_TOKEN, settingsRows, msg, keyboard);
        telegramSent += tgCount;

        // Build push body
        const titles = focus
          .map((f) => `${f.rank}. ${nodeMap.get(f.node_id) || "Task"}`)
          .join(" · ");
        const pushOk = await sendPush(
          supabase,
          userId,
          `${SLOT_LABEL[slot]} — ${focus.length} task${focus.length === 1 ? "" : "s"}`,
          titles.slice(0, 220),
          `lifeos-${slot}`,
          "/life-os",
        );
        if (pushOk) pushSent++;

        // Log
        await supabase.from("alert_log").insert({
          alert_type: `lifeos_${slot}_push`,
          message: `Sent ${slot} block: ${focus.length} task(s)`,
          metadata: { user_id: userId, slot, count: focus.length },
        });
      } catch (e) {
        errors.push(`user ${userId}: ${(e as Error).message}`);
      }
    }

    return json({ ok: true, slot, telegramSent, pushSent, errors });
  } catch (e) {
    console.error("[lifeos-slot-push]", e);
    return json({ error: (e as Error).message }, 500);
  }
});

async function sendTelegramAll(
  botToken: string | undefined,
  settingsRows: { telegram_chat_id: string | null }[] | null,
  msg: string,
  keyboard: { text: string; callback_data: string }[][],
): Promise<number> {
  if (!botToken || !settingsRows || settingsRows.length === 0) return 0;
  const tgBase = `https://api.telegram.org/bot${botToken}`;
  let sent = 0;
  for (const row of settingsRows) {
    if (!row.telegram_chat_id) continue;
    try {
      const r = await fetch(`${tgBase}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: row.telegram_chat_id,
          text: msg,
          parse_mode: "HTML",
          ...(keyboard.length > 0 ? { reply_markup: { inline_keyboard: keyboard } } : {}),
        }),
      });
      if (r.ok) sent++;
    } catch (e) {
      console.error("telegram error", e);
    }
  }
  return sent;
}

async function sendPush(
  supabase: any,
  userId: string,
  title: string,
  body: string,
  tag: string,
  url: string,
): Promise<boolean> {
  try {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .limit(1);
    if (!subs || subs.length === 0) return false;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ title, body, tag, url }),
    });
    return r.ok;
  } catch (e) {
    console.error("push error", e);
    return false;
  }
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
