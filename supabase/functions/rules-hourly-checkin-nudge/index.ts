// Hourly check-in nudge — fires every hour from 22:00 BD time until midnight
// Only sends if today's daily_rule_adherence has NOT been submitted yet.
// Same inline keyboard as 9:30 PM push so user can act directly from Telegram.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bangladesh = UTC+6. Send nudges between 22:00 and 23:59 BD time.
const BD_OFFSET_HOURS = 6;
const NUDGE_START_HOUR = 22; // 10 PM BD
const NUDGE_END_HOUR = 23;   // last nudge at 11 PM BD (inclusive)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const tgBase = `https://api.telegram.org/bot${BOT_TOKEN}`;

  // Compute BD local time
  const nowUtc = new Date();
  const bdHour = (nowUtc.getUTCHours() + BD_OFFSET_HOURS) % 24;
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  // Window check (skipped if force=1 for manual testing)
  if (!force && (bdHour < NUDGE_START_HOUR || bdHour > NUDGE_END_HOUR)) {
    return json({ ok: true, skipped: `outside nudge window (BD hour=${bdHour})` });
  }

  // BD-local "today" date (YYYY-MM-DD)
  const bdNow = new Date(nowUtc.getTime() + BD_OFFSET_HOURS * 3600 * 1000);
  const today = bdNow.toISOString().slice(0, 10);

  try {
    const { data: ruleUsers } = await supabase
      .from("trading_rules")
      .select("user_id")
      .eq("active", true)
      .not("user_id", "is", null);
    const userIds = Array.from(new Set((ruleUsers ?? []).map((r: any) => r.user_id))).filter(Boolean);
    if (userIds.length === 0) return json({ ok: true, skipped: "no users with rules" });

    const { data: settingsRows } = await supabase
      .from("alert_settings")
      .select("telegram_chat_id,rules_checkin_push");
    const enabled = (settingsRows ?? []).filter(
      (s: any) => s.telegram_chat_id && s.rules_checkin_push !== false,
    );

    const { data: submitted } = await supabase
      .from("daily_rule_adherence")
      .select("user_id")
      .eq("date", today);
    const submittedSet = new Set((submitted ?? []).map((r: any) => r.user_id));

    let telegramSent = 0;
    let telegramRefreshed = 0;
    let pushSent = 0;
    let skipped = 0;

    const text = `⏰ <b>Reminder — Rules Check-in pending</b>\n\nএখনো আজকের rules check-in করোনি। নিচের button দিয়ে এখুনি log করে নাও।`;
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ All maintained", callback_data: "rules_chk:all" },
          { text: "❌ Some broken", callback_data: "rules_chk:partial" },
        ],
        [{ text: "📝 Open in app", url: "https://fxjunait.lovable.app/rules?tab=checkin" }],
      ],
    };

    const ownerUserId = userIds[0];

    for (const userId of userIds) {
      if (submittedSet.has(userId)) {
        skipped++;
        continue;
      }

      for (const s of enabled) {
        try {
          const chatId = Number(s.telegram_chat_id);
          const { data: prev } = await supabase
            .from("telegram_checkin_state")
            .select("message_id,status")
            .eq("chat_id", chatId)
            .eq("date", today)
            .maybeSingle();

          const refreshed = await refreshExistingReminder(tgBase, chatId, prev, text, inlineKeyboard);
          const nextMessageId = refreshed ? prev?.message_id ?? null : await sendTelegramReminder(tgBase, chatId, text, inlineKeyboard);

          if (nextMessageId) {
            if (refreshed) telegramRefreshed++;
            else telegramSent++;

            await supabase
              .from("telegram_checkin_state")
              .upsert(
                {
                  chat_id: chatId,
                  date: today,
                  user_id: ownerUserId,
                  message_id: nextMessageId,
                  selected_rule_ids: [],
                  reasons: {},
                  status: "awaiting_choice",
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "chat_id,date" },
              );
          }
        } catch (e) {
          console.error("telegram reminder error", e);
        }
      }

      const pushOk = await sendPush(
        supabase,
        userId,
        "⏰ Check-in pending",
        "এখনো rules check-in করোনি — এখনই log করো।",
        "rules-checkin-nudge",
        "/rules?tab=checkin",
      );
      if (pushOk) pushSent++;
    }

    await supabase.from("alert_log").insert({
      alert_type: "rules_checkin_hourly_nudge",
      message: `Hourly nudge (BD ${bdHour}:00): ${telegramSent} new, ${telegramRefreshed} refreshed, ${pushSent} push, ${skipped} already submitted`,
      metadata: { telegramSent, telegramRefreshed, pushSent, skipped, totalUsers: userIds.length, bdHour },
    });

    return json({ ok: true, bdHour, telegramSent, telegramRefreshed, pushSent, skipped, totalUsers: userIds.length });
  } catch (e) {
    console.error("[rules-hourly-checkin-nudge]", e);
    return json({ error: (e as Error).message }, 500);
  }
});

async function refreshExistingReminder(
  tgBase: string,
  chatId: number,
  prev: { message_id?: number | null; status?: string } | null | undefined,
  text: string,
  reply_markup: unknown,
): Promise<boolean> {
  if (!prev?.message_id || prev.status === "submitted") return false;

  try {
    const r = await fetch(`${tgBase}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: prev.message_id,
        text,
        parse_mode: "HTML",
        reply_markup,
      }),
    });

    const data = await r.json().catch(() => null);
    if (r.ok) return true;
    if (data?.description?.includes("message is not modified")) return true;

    console.error("refresh reminder edit error", data);
    return false;
  } catch (e) {
    console.error("refresh reminder edit exception", e);
    return false;
  }
}

async function sendTelegramReminder(
  tgBase: string,
  chatId: number,
  text: string,
  reply_markup: unknown,
): Promise<number | null> {
  try {
    const r = await fetch(`${tgBase}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup,
      }),
    });

    const data = await r.json().catch(() => null);
    if (!r.ok) {
      console.error("telegram send error", data);
      return null;
    }

    return data?.result?.message_id ?? null;
  } catch (e) {
    console.error("telegram send exception", e);
    return null;
  }
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
