// AI-powered weekly coaching plan generator using OpenAI API
// Analyzes last 7 days of rule adherence + violations and produces a focused plan
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gpt-4o-mini";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!OPENAI_API_KEY) {
    return json({ error: "OPENAI_API_KEY not configured" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let manual = false;
  let userIdOverride: string | null = null;
  try {
    if (req.method !== "GET") {
      const body = await req.json().catch(() => ({}));
      manual = !!body.manual;
      userIdOverride = body.user_id ?? null;
    }
  } catch {/* ignore */}

  // If manual & called from client, derive user from JWT
  if (manual && !userIdOverride) {
    const auth = req.headers.get("authorization");
    if (auth) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: auth } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) userIdOverride = user.id;
    }
  }

  try {
    // Determine user list to process
    let userIds: string[] = [];
    if (userIdOverride) {
      userIds = [userIdOverride];
    } else {
      const { data } = await supabase
        .from("daily_rule_adherence")
        .select("user_id")
        .gte("date", isoDaysAgo(7));
      userIds = Array.from(new Set((data ?? []).map((r: any) => r.user_id))).filter(Boolean);
    }

    if (userIds.length === 0) {
      return json({ ok: true, skipped: "no users with recent check-ins" });
    }

    const weekStart = mondayOf(new Date()).toISOString().slice(0, 10);
    const results: any[] = [];

    for (const userId of userIds) {
      try {
        const result = await generatePlanForUser({
          supabase,
          userId,
          weekStart,
          openAiKey: OPENAI_API_KEY,
          telegramBotToken: TELEGRAM_BOT_TOKEN,
        });
        results.push({ userId, ...result });
      } catch (e) {
        console.error(`[coaching-plan] user ${userId}`, e);
        results.push({ userId, error: (e as Error).message });
      }
    }

    return json({ ok: true, weekStart, results });
  } catch (e) {
    console.error("[rules-coaching-plan]", e);
    return json({ error: (e as Error).message }, 500);
  }
});

async function generatePlanForUser({
  supabase,
  userId,
  weekStart,
  openAiKey,
  telegramBotToken,
}: {
  supabase: any;
  userId: string;
  weekStart: string;
  openAiKey: string;
  telegramBotToken?: string;
}) {
  const since = isoDaysAgo(7);

  // Pull recent data
  const { data: adherence } = await supabase
    .from("daily_rule_adherence")
    .select("*")
    .eq("user_id", userId)
    .gte("date", since)
    .order("date", { ascending: false });

  const { data: violations } = await supabase
    .from("rule_violations")
    .select("*")
    .eq("user_id", userId)
    .gte("date", since);

  const { data: rules } = await supabase
    .from("trading_rules")
    .select("id,text,category,active")
    .eq("user_id", userId)
    .eq("active", true);

  if (!adherence || adherence.length === 0) {
    return { skipped: "no check-ins in last 7 days" };
  }

  // Aggregate metrics
  const adherenceAvg = Math.round(
    adherence.reduce((a: number, b: any) => a + Number(b.adherence_score), 0) / adherence.length
  );

  const violationCounts = new Map<string, { rule_id: string; text: string; count: number }>();
  for (const v of violations ?? []) {
    const existing = violationCounts.get(v.rule_id);
    if (existing) existing.count++;
    else violationCounts.set(v.rule_id, { rule_id: v.rule_id, text: v.rule_text_snapshot, count: 1 });
  }
  const topViolated = Array.from(violationCounts.values()).sort((a, b) => b.count - a.count).slice(0, 5);

  const moodViolations = new Map<string, number>();
  const moodDays = new Map<string, number>();
  for (const a of adherence) {
    moodDays.set(a.mood, (moodDays.get(a.mood) ?? 0) + 1);
    moodViolations.set(a.mood, (moodViolations.get(a.mood) ?? 0) + a.violated_count);
  }

  // Build OpenAI prompt
  const systemMsg = `You are an elite trading coach analyzing a trader's weekly rule-discipline data. Be direct, specific, and actionable. Mix concise English with light Bengali (use Bengali for motivation/emphasis only when natural). Focus on patterns, not generic advice.`;

  const userMsg = `Analyze the last 7 days of trading rule adherence for this trader and produce a focused weekly coaching plan.

ADHERENCE LOG (last 7 days):
${adherence.map((a: any) => `- ${a.date} | score: ${a.adherence_score}% | mood: ${a.mood} | trades: ${a.trades_count} | followed: ${a.followed_count}/${a.total_rules}${a.general_note ? ` | note: "${a.general_note.slice(0, 120)}"` : ""}`).join("\n")}

VIOLATIONS (${violations?.length ?? 0} total):
${(violations ?? []).slice(0, 30).map((v: any) => `- ${v.date} | ${v.category_snapshot}: "${v.rule_text_snapshot.slice(0, 80)}" | reason: ${v.reason || "none"} | mood: ${v.mood}`).join("\n") || "(none — perfect week!)"}

ALL ACTIVE RULES:
${(rules ?? []).map((r: any) => `- [${r.id}] (${r.category}) ${r.text}`).join("\n")}

Use the tool to return your analysis.`;

  const tools = [{
    type: "function",
    function: {
      name: "submit_coaching_plan",
      description: "Submit the structured weekly coaching plan",
      parameters: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "2-4 sentence narrative summary of the week's patterns and focus. Direct, personal, motivating. Mix English + light Bengali phrases.",
          },
          focus_rule_ids: {
            type: "array",
            items: { type: "string" },
            description: "Top 3 rule IDs (from the ALL ACTIVE RULES list) to focus on this week — pick the most-violated AND highest-impact rules.",
          },
          action_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short action title (max 8 words)" },
                detail: { type: "string", description: "1-2 sentence specific implementation detail" },
              },
              required: ["title", "detail"],
            },
            description: "3-5 concrete actions the trader should do this week to improve adherence",
          },
          weekly_target: {
            type: "number",
            description: "Realistic adherence % target for this week (60-100). Push 5-10% above current avg.",
          },
        },
        required: ["summary", "focus_rule_ids", "action_items", "weekly_target"],
      },
    },
  }];

  const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: userMsg },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "submit_coaching_plan" } },
      temperature: 0.7,
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    throw new Error(`OpenAI ${aiRes.status}: ${errText.slice(0, 300)}`);
  }

  const aiJson = await aiRes.json();
  const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("OpenAI returned no tool call");
  const parsed = JSON.parse(toolCall.function.arguments);

  // Validate focus rule IDs against actual rules
  const validRuleIds = new Set((rules ?? []).map((r: any) => r.id));
  const focusIds: string[] = (parsed.focus_rule_ids ?? []).filter((id: string) => validRuleIds.has(id)).slice(0, 5);

  const planRow = {
    user_id: userId,
    week_start: weekStart,
    focus_rule_ids: focusIds,
    summary: parsed.summary ?? "",
    action_items: parsed.action_items ?? [],
    metrics: {
      adherence_avg: adherenceAvg,
      top_violated_rules: topViolated,
      days_logged: adherence.length,
      weekly_target: parsed.weekly_target ?? 90,
    },
    model: MODEL,
  };

  const { error: upErr } = await supabase
    .from("coaching_plans")
    .upsert(planRow, { onConflict: "user_id,week_start" });
  if (upErr) throw upErr;

  // Auto-boost focus rules in Memorize Mode (zero out their confidence)
  if (focusIds.length > 0) {
    const upserts = focusIds.map((rid) => ({
      user_id: userId,
      rule_id: rid,
      confidence_score: 0,
      updated_at: new Date().toISOString(),
    }));
    await supabase.from("rule_memorization").upsert(upserts, { onConflict: "user_id,rule_id" });
  }

  // Send Telegram summary
  let telegramSent = false;
  if (telegramBotToken) {
    const { data: settings } = await supabase
      .from("alert_settings")
      .select("telegram_chat_id")
      .not("telegram_chat_id", "is", null);
    const chatIds = (settings ?? []).map((s: any) => s.telegram_chat_id).filter(Boolean);

    let msg = `🧠 <b>Weekly Coaching Plan</b>\n\n`;
    msg += `📊 Last 7d adherence: <b>${adherenceAvg}%</b> · Target: <b>${planRow.metrics.weekly_target}%</b>\n\n`;
    msg += `${escapeHtml(planRow.summary)}\n\n`;
    if (focusIds.length > 0) {
      msg += `🎯 <b>Focus this week:</b>\n`;
      const focusTexts = focusIds.map((id) => (rules ?? []).find((r: any) => r.id === id)?.text).filter(Boolean);
      focusTexts.forEach((t, i) => { msg += `${i + 1}. ${escapeHtml(t!)}\n`; });
      msg += `\n`;
    }
    if (planRow.action_items.length > 0) {
      msg += `✅ <b>Action items:</b>\n`;
      planRow.action_items.forEach((a: any) => { msg += `• ${escapeHtml(a.title)}\n`; });
    }

    for (const chatId of chatIds) {
      try {
        const r = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" }),
        });
        if (r.ok) telegramSent = true;
      } catch (e) {
        console.error("telegram error", e);
      }
    }

    if (telegramSent) {
      await supabase.from("coaching_plans").update({ sent_to_telegram: true }).eq("user_id", userId).eq("week_start", weekStart);
    }
  }

  await supabase.from("alert_log").insert({
    alert_type: "coaching_plan_generated",
    message: `Generated coaching plan: ${focusIds.length} focus rules, ${planRow.action_items.length} actions`,
    metadata: { user_id: userId, week_start: weekStart, adherence_avg: adherenceAvg, telegram_sent: telegramSent },
  });

  return { weekStart, focusCount: focusIds.length, actionCount: planRow.action_items.length, telegramSent };
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function mondayOf(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
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
