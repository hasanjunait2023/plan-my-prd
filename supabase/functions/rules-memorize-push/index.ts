// Daily rules memorization push — Telegram + Web Push
// Slot: "morning" or "evening"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Slot = "morning" | "evening";

const HEADERS: Record<Slot, string> = {
  morning: "🌅 <b>আজকের দিন শুরু</b> — এই rules মাথায় রাখো",
  evening: "🌙 <b>দিন শেষ</b> — কাল এর জন্য এই rules রিভাইজ করো",
};

const FOOTERS: Record<Slot, string> = {
  morning: "💪 Discipline > Motivation. Stick to the plan.",
  evening: "🧠 Repeat → Internalize → Execute.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let slot: Slot = "morning";
  try {
    const url = new URL(req.url);
    const qs = (url.searchParams.get("slot") || "").toLowerCase();
    if (qs === "morning" || qs === "evening") slot = qs;
    else if (req.method !== "GET") {
      const body = await req.json().catch(() => ({}));
      const bs = (body.slot || "").toLowerCase();
      if (bs === "morning" || bs === "evening") slot = bs;
    }
  } catch {/* default morning */}

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Pull all users that have rules
    const { data: ruleUsers } = await supabase
      .from("trading_rules")
      .select("user_id")
      .eq("active", true)
      .not("user_id", "is", null);
    const userIds = Array.from(new Set((ruleUsers ?? []).map((r) => r.user_id))).filter(Boolean);

    if (userIds.length === 0) return json({ ok: true, skipped: "no users with active rules" });

    // Fetch all settings rows once
    const { data: settingsRows } = await supabase
      .from("alert_settings")
      .select("telegram_chat_id,rules_morning_push,rules_evening_push,rules_per_push");

    // Filter by morning/evening toggle (any row with toggle on)
    const enabledChatIds = (settingsRows ?? [])
      .filter((s: any) =>
        s.telegram_chat_id &&
        (slot === "morning" ? s.rules_morning_push !== false : s.rules_evening_push !== false)
      )
      .map((s: any) => s.telegram_chat_id);

    const perPush = Math.max(
      1,
      Math.min(20, (settingsRows?.[0] as any)?.rules_per_push ?? 5),
    );

    let telegramSent = 0;
    let pushSent = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        const { data: rules } = await supabase
          .from("trading_rules")
          .select("id,text,category")
          .eq("user_id", userId)
          .eq("active", true);

        if (!rules || rules.length === 0) continue;

        // Pull memorization rows for prioritization (lowest confidence first)
        const { data: memos } = await supabase
          .from("rule_memorization")
          .select("rule_id,confidence_score,last_shown_at")
          .eq("user_id", userId);
        const memoMap = new Map<string, { conf: number; last: string | null }>(
          (memos ?? []).map((m: any) => [m.rule_id, { conf: m.confidence_score ?? 0, last: m.last_shown_at }]),
        );

        // Sort by lowest confidence, then oldest last_shown
        const sorted = [...rules].sort((a: any, b: any) => {
          const ma = memoMap.get(a.id) || { conf: 0, last: null };
          const mb = memoMap.get(b.id) || { conf: 0, last: null };
          if (ma.conf !== mb.conf) return ma.conf - mb.conf;
          const la = ma.last ? Date.parse(ma.last) : 0;
          const lb = mb.last ? Date.parse(mb.last) : 0;
          return la - lb;
        });

        const picked = sorted.slice(0, perPush);

        // Build Telegram message
        let msg = `${HEADERS[slot]}\n\n`;
        picked.forEach((r: any, i: number) => {
          msg += `<b>${i + 1}.</b> ${escapeHtml(r.text)}\n   <i>${escapeHtml(r.category || "General")}</i>\n\n`;
        });
        msg += `\n${FOOTERS[slot]}`;

        const tgCount = await sendTelegramAll(BOT_TOKEN, enabledChatIds, msg);
        telegramSent += tgCount;

        // Push notification
        const pushBody = picked
          .map((r: any, i: number) => `${i + 1}. ${r.text}`)
          .join(" · ")
          .slice(0, 220);
        const pushOk = await sendPush(
          supabase,
          userId,
          `${slot === "morning" ? "🌅 Morning" : "🌙 Evening"} — ${picked.length} rule${picked.length === 1 ? "" : "s"}`,
          pushBody,
          `rules-${slot}`,
          "/rules",
        );
        if (pushOk) pushSent++;

        // Update last_shown_at for picked rules
        const now = new Date().toISOString();
        const upserts = picked.map((r: any) => {
          const existing = memoMap.get(r.id);
          return {
            user_id: userId,
            rule_id: r.id,
            confidence_score: existing?.conf ?? 0,
            last_shown_at: now,
            updated_at: now,
          };
        });
        if (upserts.length > 0) {
          await supabase
            .from("rule_memorization")
            .upsert(upserts, { onConflict: "user_id,rule_id" });
        }

        await supabase.from("alert_log").insert({
          alert_type: `rules_${slot}_push`,
          message: `Sent ${slot} rules: ${picked.length} rule(s)`,
          metadata: { user_id: userId, slot, count: picked.length },
        });
      } catch (e) {
        errors.push(`user ${userId}: ${(e as Error).message}`);
      }
    }

    return json({ ok: true, slot, telegramSent, pushSent, errors });
  } catch (e) {
    console.error("[rules-memorize-push]", e);
    return json({ error: (e as Error).message }, 500);
  }
});

async function sendTelegramAll(
  botToken: string | undefined,
  chatIds: string[],
  msg: string,
): Promise<number> {
  if (!botToken || chatIds.length === 0) return 0;
  const tgBase = `https://api.telegram.org/bot${botToken}`;
  let sent = 0;
  for (const chatId of chatIds) {
    try {
      const r = await fetch(`${tgBase}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: msg,
          parse_mode: "HTML",
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
