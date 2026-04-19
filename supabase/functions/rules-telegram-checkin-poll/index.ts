// Polls Telegram for rules check-in callback queries (inline button taps)
// Runs every minute via pg_cron. Uses dedicated telegram_rules_state offset
// to avoid conflict with the mind-journal poller.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RUNTIME_MS = 50_000;
const MIN_REMAINING_MS = 5_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = Date.now();
  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!BOT_TOKEN) return json({ error: "TELEGRAM_BOT_TOKEN not configured" }, 500);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const tgBase = `https://api.telegram.org/bot${BOT_TOKEN}`;

  // Read offset
  const { data: state } = await supabase
    .from("telegram_rules_state")
    .select("update_offset")
    .eq("id", 1)
    .maybeSingle();
  let currentOffset = state?.update_offset ?? 0;

  let totalProcessed = 0;

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;
    if (remainingMs < MIN_REMAINING_MS) break;
    const timeout = Math.min(45, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    const r = await fetch(`${tgBase}/getUpdates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offset: currentOffset,
        timeout,
        allowed_updates: ["callback_query"],
      }),
    });
    const data = await r.json();
    if (!r.ok) return json({ error: data }, 502);

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    for (const u of updates) {
      currentOffset = Math.max(currentOffset, u.update_id + 1);
      const cb = u.callback_query;
      if (!cb || !cb.data?.startsWith("rules_chk:")) continue;
      try {
        await handleCallback(supabase, tgBase, cb);
        totalProcessed++;
      } catch (err) {
        console.error("callback error", err);
      }
    }

    await supabase
      .from("telegram_rules_state")
      .update({ update_offset: currentOffset, updated_at: new Date().toISOString() })
      .eq("id", 1);
  }

  return json({ ok: true, processed: totalProcessed, finalOffset: currentOffset });
});

const todayStr = () => new Date().toISOString().slice(0, 10);

async function handleCallback(supabase: any, tgBase: string, cb: any) {
  const action = cb.data.split(":")[1] as string; // all | partial | toggle | submit | back
  const arg = cb.data.split(":")[2] as string | undefined;
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;
  const today = todayStr();

  // Always answer callback to dismiss spinner
  const answerCb = (text?: string) =>
    fetch(`${tgBase}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cb.id, text }),
    });

  // Load state
  const { data: stateRow } = await supabase
    .from("telegram_checkin_state")
    .select("*")
    .eq("chat_id", chatId)
    .eq("date", today)
    .maybeSingle();

  if (!stateRow) {
    await answerCb("Session expired. Open the app to check in.");
    return;
  }

  const userId = stateRow.user_id;

  // Already submitted? Block.
  const { data: existingAdh } = await supabase
    .from("daily_rule_adherence")
    .select("id")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (existingAdh && action !== "submit") {
    await answerCb("Already submitted today ✅");
    return;
  }

  // ====== ACTION: ALL MAINTAINED ======
  if (action === "all") {
    const { data: rules } = await supabase
      .from("trading_rules")
      .select("id")
      .eq("user_id", userId)
      .eq("active", true);
    const totalRules = rules?.length ?? 0;

    await supabase.from("daily_rule_adherence").upsert(
      {
        user_id: userId,
        date: today,
        total_rules: totalRules,
        followed_count: totalRules,
        violated_count: 0,
        adherence_score: 100,
        mood: "Calm",
        trades_count: 0,
        general_note: "Submitted via Telegram",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" },
    );

    await supabase
      .from("rule_violations")
      .delete()
      .eq("user_id", userId)
      .eq("date", today);

    await supabase
      .from("telegram_checkin_state")
      .update({ status: "submitted", updated_at: new Date().toISOString() })
      .eq("chat_id", chatId)
      .eq("date", today);

    await editMessage(tgBase, chatId, messageId, {
      text: `✅ <b>Logged — All rules maintained!</b>\n\n🎯 Score: 100%\n📊 ${totalRules}/${totalRules} rules followed\n\nKeep the streak alive! 🔥`,
      parse_mode: "HTML",
    });
    await answerCb("Saved — perfect day! 🎯");
    return;
  }

  // ====== ACTION: PARTIAL — show rule list ======
  if (action === "partial") {
    await renderRuleList(supabase, tgBase, chatId, messageId, userId, today);
    await answerCb();
    return;
  }

  // ====== ACTION: TOGGLE rule ======
  if (action === "toggle" && arg) {
    const ruleId = arg;
    const current: string[] = stateRow.selected_rule_ids ?? [];
    const next = current.includes(ruleId)
      ? current.filter((x) => x !== ruleId)
      : [...current, ruleId];

    await supabase
      .from("telegram_checkin_state")
      .update({ selected_rule_ids: next, status: "selecting", updated_at: new Date().toISOString() })
      .eq("chat_id", chatId)
      .eq("date", today);

    await renderRuleList(supabase, tgBase, chatId, messageId, userId, today);
    await answerCb();
    return;
  }

  // ====== ACTION: BACK to choice ======
  if (action === "back") {
    await supabase
      .from("telegram_checkin_state")
      .update({ selected_rule_ids: [], status: "awaiting_choice", updated_at: new Date().toISOString() })
      .eq("chat_id", chatId)
      .eq("date", today);

    await editMessage(tgBase, chatId, messageId, {
      text: `🌙 <b>Day's end — Rules Check-in</b>\n\nআজকে কি সব rules maintain করেছ?`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ All maintained", callback_data: "rules_chk:all" },
            { text: "❌ Some broken", callback_data: "rules_chk:partial" },
          ],
          [{ text: "📝 Open in app", url: "https://fxjunait.lovable.app/rules?tab=checkin" }],
        ],
      },
    });
    await answerCb();
    return;
  }

  // ====== ACTION: SUBMIT ======
  if (action === "submit") {
    const selected: string[] = stateRow.selected_rule_ids ?? [];

    const { data: rules } = await supabase
      .from("trading_rules")
      .select("id, text, category")
      .eq("user_id", userId)
      .eq("active", true);
    const all = rules ?? [];
    const total = all.length;
    const violated = selected.length;
    const followed = total - violated;
    const score = total > 0 ? Math.round((followed / total) * 100) : 0;

    await supabase.from("daily_rule_adherence").upsert(
      {
        user_id: userId,
        date: today,
        total_rules: total,
        followed_count: followed,
        violated_count: violated,
        adherence_score: score,
        mood: "Calm",
        trades_count: 0,
        general_note: "Submitted via Telegram",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" },
    );

    await supabase
      .from("rule_violations")
      .delete()
      .eq("user_id", userId)
      .eq("date", today);

    if (violated > 0) {
      const violationRows = all
        .filter((r: any) => selected.includes(r.id))
        .map((r: any) => ({
          user_id: userId,
          date: today,
          rule_id: r.id,
          rule_text_snapshot: r.text,
          category_snapshot: r.category || "General",
          reason: "",
          mood: "Calm",
        }));
      await supabase.from("rule_violations").insert(violationRows);
    }

    await supabase
      .from("telegram_checkin_state")
      .update({ status: "submitted", updated_at: new Date().toISOString() })
      .eq("chat_id", chatId)
      .eq("date", today);

    const brokenList = all
      .filter((r: any) => selected.includes(r.id))
      .map((r: any) => `• ${r.text}`)
      .join("\n");

    await editMessage(tgBase, chatId, messageId, {
      text: `✅ <b>Check-in logged</b>\n\n📊 Score: <b>${score}%</b>\n✓ Followed: ${followed}\n✗ Broken: ${violated}\n\n${brokenList ? `<b>Broken rules:</b>\n${brokenList}\n\n` : ""}AI coach will analyze this 🧠`,
      parse_mode: "HTML",
    });
    await answerCb(`Logged — ${score}%`);
    return;
  }

  await answerCb();
}

async function renderRuleList(
  supabase: any,
  tgBase: string,
  chatId: number,
  messageId: number,
  userId: string,
  today: string,
) {
  const { data: rules } = await supabase
    .from("trading_rules")
    .select("id, text, category")
    .eq("user_id", userId)
    .eq("active", true)
    .order("category", { ascending: true })
    .order("created_at", { ascending: true });

  const { data: stateRow } = await supabase
    .from("telegram_checkin_state")
    .select("selected_rule_ids")
    .eq("chat_id", chatId)
    .eq("date", today)
    .maybeSingle();

  const selected = new Set<string>(stateRow?.selected_rule_ids ?? []);
  const all = rules ?? [];

  // Group by category if many rules
  const grouped: Record<string, any[]> = {};
  for (const r of all) {
    const c = r.category || "General";
    if (!grouped[c]) grouped[c] = [];
    grouped[c].push(r);
  }

  const useGroups = all.length > 8;
  const buttons: any[][] = [];

  if (useGroups) {
    for (const [cat, list] of Object.entries(grouped)) {
      buttons.push([{ text: `— ${cat} —`, callback_data: "rules_chk:noop" }]);
      for (const r of list) {
        const mark = selected.has(r.id) ? "🔴" : "⬜";
        const label = r.text.length > 50 ? r.text.slice(0, 47) + "…" : r.text;
        buttons.push([{ text: `${mark} ${label}`, callback_data: `rules_chk:toggle:${r.id}` }]);
      }
    }
  } else {
    for (const r of all) {
      const mark = selected.has(r.id) ? "🔴" : "⬜";
      const label = r.text.length > 55 ? r.text.slice(0, 52) + "…" : r.text;
      buttons.push([{ text: `${mark} ${label}`, callback_data: `rules_chk:toggle:${r.id}` }]);
    }
  }

  buttons.push([
    { text: "← Back", callback_data: "rules_chk:back" },
    { text: `✅ Submit (${selected.size} broken)`, callback_data: "rules_chk:submit" },
  ]);

  const total = all.length;
  const headerText = `❌ <b>কোন rules broke করেছ?</b>\n\nTap each broken rule. Untouched ones count as followed.\n\n<b>${selected.size} broken / ${total} total</b>`;

  await editMessage(tgBase, chatId, messageId, {
    text: headerText,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons },
  });
}

async function editMessage(tgBase: string, chatId: number, messageId: number, payload: any) {
  try {
    const r = await fetch(`${tgBase}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, ...payload }),
    });
    if (!r.ok) {
      const data = await r.json();
      console.error("editMessageText error", data);
    }
  } catch (e) {
    console.error("editMessage exception", e);
  }
}

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
