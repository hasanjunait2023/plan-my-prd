// Morning Telegram push — sends today's top 3 priorities with quick-complete buttons
// Cron: 7:00 AM Asia/Dhaka = 01:00 UTC
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
    // Determine today's date in Asia/Dhaka
    const today = dhakaToday();

    // Get all alert_settings rows that have a chat id
    const { data: settingsRows } = await supabase
      .from("alert_settings")
      .select("telegram_chat_id")
      .not("telegram_chat_id", "is", null);

    if (!settingsRows || settingsRows.length === 0) {
      return json({ ok: true, skipped: "No telegram_chat_id configured" });
    }

    // Discover users who have life_nodes (active goals)
    const { data: nodeUsers } = await supabase
      .from("life_nodes")
      .select("user_id")
      .neq("status", "archived");

    const userIds = Array.from(new Set((nodeUsers ?? []).map((n) => n.user_id)));
    if (userIds.length === 0) {
      return json({ ok: true, skipped: "No users with life_nodes" });
    }

    let totalSent = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        // Auto-generate today's focus if not set
        let { data: focus } = await supabase
          .from("daily_focus")
          .select("id,rank,reason,node_id")
          .eq("user_id", userId)
          .eq("date", today)
          .order("rank");

        if (!focus || focus.length === 0) {
          // Trigger the planner inline — call generate logic directly
          await autoGenerate(supabase, userId, today);
          const refetched = await supabase
            .from("daily_focus")
            .select("id,rank,reason,node_id")
            .eq("user_id", userId)
            .eq("date", today)
            .order("rank");
          focus = refetched.data ?? [];
        }

        if (focus.length === 0) continue;

        // Resolve node titles
        const nodeIds = focus.map((f) => f.node_id);
        const { data: nodes } = await supabase
          .from("life_nodes")
          .select("id,title")
          .in("id", nodeIds);
        const nodeMap = new Map((nodes ?? []).map((n) => [n.id, n.title]));

        // Build message
        let msg = `☀️ <b>Good morning! Today's Top 3</b>\n<i>${today}</i>\n\n`;
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
        msg += `\n💪 One step at a time. Make it count.`;

        // Send to every chat configured (typically just one user)
        for (const row of settingsRows) {
          const chatId = row.telegram_chat_id!;
          const r = await fetch(`${tgBase}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: msg,
              parse_mode: "HTML",
              reply_markup: { inline_keyboard: keyboard },
            }),
          });
          if (r.ok) totalSent++;
          else errors.push(`chat ${chatId}: ${r.status}`);
        }
      } catch (e) {
        errors.push(`user ${userId}: ${(e as Error).message}`);
      }
    }

    return json({ ok: true, sent: totalSent, errors });
  } catch (e) {
    console.error("[lifeos-morning-push]", e);
    return json({ error: (e as Error).message }, 500);
  }
});

// Compute "today" in Asia/Dhaka (UTC+6)
function dhakaToday(): string {
  const now = new Date();
  const dhaka = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  return dhaka.toISOString().slice(0, 10);
}

// Inline planner — duplicates logic of generate-daily-focus for service-role calls
async function autoGenerate(supabase: any, userId: string, today: string) {
  const { data: nodes } = await supabase
    .from("life_nodes")
    .select("id,title,type,parent_id,priority,progress,status,due_date")
    .eq("user_id", userId)
    .neq("status", "archived");
  if (!nodes || nodes.length === 0) return;

  const byId = new Map<string, any>();
  nodes.forEach((n: any) => byId.set(n.id, n));
  const findMission = (id: string): any => {
    let cur = byId.get(id);
    while (cur) {
      if (cur.type === "mission") return cur;
      if (!cur.parent_id) return null;
      cur = byId.get(cur.parent_id);
    }
    return null;
  };

  const { data: todayLogs } = await supabase
    .from("life_node_logs")
    .select("node_id,done")
    .eq("user_id", userId)
    .eq("date", today);
  const doneToday = new Set((todayLogs ?? []).filter((l: any) => l.done).map((l: any) => l.node_id));

  const todayDate = new Date(today);
  const scored = nodes
    .filter((n: any) => n.progress < 100 && !doneToday.has(n.id))
    .map((n: any) => {
      let score = (6 - (n.priority || 3)) * 20;
      const w: Record<string, number> = {
        daily: 50, weekly: 40, monthly: 25, quarterly: 15, yearly: 10, mission: 5, vision: 0,
      };
      score += w[n.type] ?? 0;
      if (n.due_date) {
        const days = Math.ceil((new Date(n.due_date).getTime() - todayDate.getTime()) / 86400000);
        if (days <= 0) score += 60;
        else if (days <= 3) score += 40;
        else if (days <= 7) score += 25;
        else if (days <= 30) score += 10;
      }
      if (n.progress > 0 && n.progress < 100) score += 15;
      return { node: n, score };
    })
    .sort((a: any, b: any) => b.score - a.score);

  const picked: { node: any; reason: string }[] = [];
  const usedMissions = new Set<string>();

  for (const { node } of scored) {
    const m = findMission(node.id);
    const key = m?.id ?? "none";
    if (picked.length < 3 && !usedMissions.has(key)) {
      picked.push({ node, reason: buildReason(node, m) });
      usedMissions.add(key);
    }
    if (picked.length === 3) break;
  }
  if (picked.length < 3) {
    for (const { node } of scored) {
      if (picked.length >= 3) break;
      if (picked.find((p) => p.node.id === node.id)) continue;
      picked.push({ node, reason: buildReason(node, findMission(node.id)) });
    }
  }

  if (picked.length === 0) return;

  await supabase.from("daily_focus").insert(
    picked.map((p, i) => ({
      user_id: userId,
      date: today,
      node_id: p.node.id,
      rank: i + 1,
      reason: p.reason,
      source: "auto",
    })),
  );
}

function buildReason(node: any, mission: any): string {
  const parts: string[] = [];
  if (node.priority === 1) parts.push("Critical");
  if (node.due_date) {
    const days = Math.ceil((new Date(node.due_date).getTime() - Date.now()) / 86400000);
    if (days <= 0) parts.push("Due today");
    else if (days <= 3) parts.push(`Due in ${days}d`);
    else if (days <= 7) parts.push("Due this week");
  }
  if (node.progress > 0 && node.progress < 100) parts.push(`${Math.round(node.progress)}% done`);
  if (mission) parts.push(`→ ${mission.title}`);
  return parts.join(" • ") || "Active goal";
}

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
