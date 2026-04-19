// 9:30 PM Daily Check-in Reminder — nudges users to log rule adherence
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const today = new Date().toISOString().slice(0, 10);

  try {
    // Pull users with active rules
    const { data: ruleUsers } = await supabase
      .from("trading_rules")
      .select("user_id")
      .eq("active", true)
      .not("user_id", "is", null);
    const userIds = Array.from(new Set((ruleUsers ?? []).map((r: any) => r.user_id))).filter(Boolean);

    if (userIds.length === 0) return json({ ok: true, skipped: "no users with rules" });

    // Fetch settings to filter by checkin toggle
    const { data: settingsRows } = await supabase
      .from("alert_settings")
      .select("telegram_chat_id,rules_checkin_push");
    const enabledChatIds = (settingsRows ?? [])
      .filter((s: any) => s.telegram_chat_id && s.rules_checkin_push !== false)
      .map((s: any) => s.telegram_chat_id);

    // Find users who already submitted today (skip them)
    const { data: submitted } = await supabase
      .from("daily_rule_adherence")
      .select("user_id")
      .eq("date", today);
    const submittedSet = new Set((submitted ?? []).map((r: any) => r.user_id));

    let telegramSent = 0;
    let pushSent = 0;
    let skipped = 0;

    const msg = `🌙 <b>Day's end — rules check-in</b>\n\nআজকের সব trades এ rules মেনেছ? Open the daily check-in and log it now — pattern বের করে AI coach তোমাকে guide করবে।\n\n👉 /rules → "Check-in" tab`;

    for (const userId of userIds) {
      if (submittedSet.has(userId)) {
        skipped++;
        continue;
      }

      // Telegram (broadcast to all chat IDs since they're shared)
      const tgCount = await sendTelegramAll(BOT_TOKEN, enabledChatIds, msg);
      telegramSent += tgCount;

      // Push notification
      const pushOk = await sendPush(
        supabase,
        userId,
        "🌙 Daily rules check-in",
        "আজকের rules check করো — AI coach pattern বের করবে।",
        "rules-checkin",
        "/rules?tab=checkin",
      );
      if (pushOk) pushSent++;
    }

    await supabase.from("alert_log").insert({
      alert_type: "rules_checkin_push",
      message: `Daily check-in nudge: ${telegramSent} Telegram, ${pushSent} Push, ${skipped} already submitted`,
      metadata: { telegramSent, pushSent, skipped, totalUsers: userIds.length },
    });

    return json({ ok: true, telegramSent, pushSent, skipped, totalUsers: userIds.length });
  } catch (e) {
    console.error("[rules-daily-checkin-push]", e);
    return json({ error: (e as Error).message }, 500);
  }
});

async function sendTelegramAll(botToken: string | undefined, chatIds: string[], msg: string): Promise<number> {
  if (!botToken || chatIds.length === 0) return 0;
  let sent = 0;
  for (const chatId of chatIds) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" }),
      });
      if (r.ok) sent++;
    } catch (e) { console.error("telegram error", e); }
  }
  return sent;
}

async function sendPush(supabase: any, userId: string, title: string, body: string, tag: string, url: string): Promise<boolean> {
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

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
