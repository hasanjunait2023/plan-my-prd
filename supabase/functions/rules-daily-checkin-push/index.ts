// 9:30 PM Daily Check-in Reminder — Telegram inline keyboard + push
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

    // Settings (single-user app — one alert_settings row)
    const { data: settingsRows } = await supabase
      .from("alert_settings")
      .select("telegram_chat_id,rules_checkin_push");

    const enabled = (settingsRows ?? []).filter(
      (s: any) => s.telegram_chat_id && s.rules_checkin_push !== false
    );

    // Find users who already submitted today (skip them)
    const { data: submitted } = await supabase
      .from("daily_rule_adherence")
      .select("user_id")
      .eq("date", today);
    const submittedSet = new Set((submitted ?? []).map((r: any) => r.user_id));

    let telegramSent = 0;
    let pushSent = 0;
    let skipped = 0;

    const text = `🌙 <b>Day's end — Rules Check-in</b>\n\nআজকে কি সব rules maintain করেছ? নিচের button দিয়ে log করো — AI coach pattern বের করে guide করবে।`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ All maintained", callback_data: "rules_chk:all" },
          { text: "❌ Some broken", callback_data: "rules_chk:partial" },
        ],
        [{ text: "📝 Open in app", url: "https://fxjunait.lovable.app/rules?tab=checkin" }],
      ],
    };

    // Single-user assumption: pick the first user as the owner of the chat
    const ownerUserId = userIds[0];

    for (const userId of userIds) {
      if (submittedSet.has(userId)) {
        skipped++;
        continue;
      }

      // Telegram (inline keyboard) — broadcast to enabled chats, store state per chat
      for (const s of enabled) {
        try {
          // Delete previous pending reminder so chat stays clean
          const { data: prev } = await supabase
            .from("telegram_checkin_state")
            .select("message_id,status")
            .eq("chat_id", Number(s.telegram_chat_id))
            .eq("date", today)
            .maybeSingle();
          if (prev?.message_id && prev.status !== "submitted") {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: s.telegram_chat_id, message_id: prev.message_id }),
            }).catch(() => {});
          }

          const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: s.telegram_chat_id,
              text,
              parse_mode: "HTML",
              reply_markup: inlineKeyboard,
            }),
          });
          const data = await r.json();
          if (r.ok && data.result?.message_id) {
            telegramSent++;
            // Initialize state row
            await supabase
              .from("telegram_checkin_state")
              .upsert(
                {
                  chat_id: Number(s.telegram_chat_id),
                  date: today,
                  user_id: ownerUserId,
                  message_id: data.result.message_id,
                  selected_rule_ids: [],
                  reasons: {},
                  status: "awaiting_choice",
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "chat_id,date" },
              );
          }
        } catch (e) {
          console.error("telegram send error", e);
        }
      }

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
