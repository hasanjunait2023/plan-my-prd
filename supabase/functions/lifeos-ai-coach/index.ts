// AI Coach — weekly review, drift detection, reflection analysis via OpenRouter free model
// Modes: ?mode=weekly | drift | reflection (default: drift)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OR_MODEL = "google/gemini-2.0-flash-exp:free";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const OR_KEY = Deno.env.get("OPENROUTER_API_KEY");
  if (!BOT_TOKEN) return json({ error: "TELEGRAM_BOT_TOKEN missing" }, 500);
  if (!OR_KEY) return json({ error: "OPENROUTER_API_KEY missing" }, 500);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const tgBase = `https://api.telegram.org/bot${BOT_TOKEN}`;

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "drift";

  try {
    const { data: settingsRows } = await supabase
      .from("alert_settings")
      .select("telegram_chat_id")
      .not("telegram_chat_id", "is", null);

    const { data: nodeUsers } = await supabase
      .from("life_nodes")
      .select("user_id")
      .neq("status", "archived");
    const userIds = Array.from(new Set((nodeUsers ?? []).map((n) => n.user_id)));

    let processed = 0;
    const results: any[] = [];

    for (const userId of userIds) {
      let result: { kind: string; title: string; body: string; metadata: any } | null = null;

      if (mode === "weekly") {
        result = await runWeeklyReview(supabase, userId, OR_KEY);
      } else if (mode === "drift") {
        result = await runDriftDetection(supabase, userId, OR_KEY);
      } else if (mode === "reflection") {
        result = await runReflectionAnalysis(supabase, userId, OR_KEY);
      }

      if (!result) continue;

      // Persist insight
      const { data: inserted } = await supabase
        .from("lifeos_ai_insights")
        .insert({
          user_id: userId,
          kind: result.kind,
          title: result.title,
          body: result.body,
          metadata: result.metadata,
        })
        .select("id")
        .single();

      // Push to telegram
      const emoji = mode === "weekly" ? "🗓️" : mode === "drift" ? "⚠️" : "💭";
      const msg = `${emoji} <b>${escapeHtml(result.title)}</b>\n\n${escapeHtml(result.body)}`;

      for (const row of settingsRows ?? []) {
        await fetch(`${tgBase}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: row.telegram_chat_id,
            text: msg.slice(0, 4000),
            parse_mode: "HTML",
          }),
        });
      }

      if (inserted) {
        await supabase
          .from("lifeos_ai_insights")
          .update({ sent_to_telegram: true })
          .eq("id", inserted.id);
      }

      processed++;
      results.push({ userId, kind: result.kind, title: result.title });
    }

    return json({ ok: true, mode, processed, results });
  } catch (e) {
    console.error("[lifeos-ai-coach]", e);
    return json({ error: (e as Error).message }, 500);
  }
});

async function callOpenRouter(apiKey: string, system: string, user: string): Promise<string> {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://lovable.dev",
      "X-Title": "LifeOS AI Coach",
    },
    body: JSON.stringify({
      model: OR_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: 600,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`OpenRouter ${r.status}: ${t}`);
  }
  const data = await r.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

// === WEEKLY REVIEW ===
async function runWeeklyReview(supabase: any, userId: string, orKey: string) {
  const today = dhakaToday();
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  const startStr = start.toISOString().slice(0, 10);

  const { data: focus } = await supabase
    .from("daily_focus")
    .select("date,node_id,rank")
    .eq("user_id", userId)
    .gte("date", startStr)
    .lte("date", today);

  if (!focus || focus.length === 0) return null;

  const nodeIds = Array.from(new Set(focus.map((f: any) => f.node_id)));
  const { data: nodes } = await supabase
    .from("life_nodes")
    .select("id,title,parent_id")
    .in("id", nodeIds);
  const nodeMap = new Map((nodes ?? []).map((n: any) => [n.id, n]));

  const { data: logs } = await supabase
    .from("life_node_logs")
    .select("date,node_id,done,reflection")
    .eq("user_id", userId)
    .gte("date", startStr)
    .lte("date", today);

  const doneSet = new Set(
    (logs ?? []).filter((l: any) => l.done).map((l: any) => `${l.date}:${l.node_id}`),
  );
  const reflections = (logs ?? [])
    .filter((l: any) => l.reflection?.trim())
    .map((l: any) => `${l.date}: ${l.reflection.slice(0, 200)}`)
    .slice(0, 10);

  const totalFocus = focus.length;
  const doneFocus = focus.filter((f: any) => doneSet.has(`${f.date}:${f.node_id}`)).length;
  const rate = Math.round((doneFocus / totalFocus) * 100);

  // Per-task completion
  const taskStats = new Map<string, { title: string; done: number; total: number }>();
  for (const f of focus) {
    const node = nodeMap.get(f.node_id) as any;
    if (!node) continue;
    const cur = taskStats.get(f.node_id) || { title: node.title, done: 0, total: 0 };
    cur.total++;
    if (doneSet.has(`${f.date}:${f.node_id}`)) cur.done++;
    taskStats.set(f.node_id, cur);
  }
  const topTasks = Array.from(taskStats.values())
    .sort((a, b) => b.done / b.total - a.done / a.total)
    .slice(0, 5);

  const summary = `Last 7 days (${startStr} → ${today})
Total priorities: ${totalFocus}, completed: ${doneFocus} (${rate}%)
Top tasks:
${topTasks.map((t) => `- ${t.title}: ${t.done}/${t.total}`).join("\n")}
Reflections:
${reflections.join("\n") || "(none)"}`;

  const ai = await callOpenRouter(
    orKey,
    "You are a sharp, supportive personal productivity coach. Speak directly. Mix Bengali (Banglish) and English naturally — like the user does. Keep under 250 words. Use plain text, no markdown headers.",
    `Weekly review for me. Data:\n${summary}\n\nGive me: (1) Honest performance verdict, (2) ONE clear pattern you spot, (3) ONE specific action for next week. Direct, no fluff.`,
  );

  return {
    kind: "weekly_review",
    title: `Weekly Review — ${rate}% completion`,
    body: ai,
    metadata: { startStr, today, rate, totalFocus, doneFocus },
  };
}

// === DRIFT DETECTION ===
async function runDriftDetection(supabase: any, userId: string, orKey: string) {
  const today = dhakaToday();
  const start = new Date(today);
  start.setDate(start.getDate() - 7);
  const startStr = start.toISOString().slice(0, 10);

  const { data: focus } = await supabase
    .from("daily_focus")
    .select("date,node_id")
    .eq("user_id", userId)
    .gte("date", startStr)
    .lte("date", today);
  if (!focus || focus.length === 0) return null;

  const { data: logs } = await supabase
    .from("life_node_logs")
    .select("date,node_id,done")
    .eq("user_id", userId)
    .gte("date", startStr)
    .lte("date", today);

  const doneSet = new Set(
    (logs ?? []).filter((l: any) => l.done).map((l: any) => `${l.date}:${l.node_id}`),
  );

  // For each node, collect dates where it was scheduled and check skipped
  const skipMap = new Map<string, { scheduled: number; skipped: number; lastSkip: string }>();
  for (const f of focus) {
    const cur = skipMap.get(f.node_id) || { scheduled: 0, skipped: 0, lastSkip: "" };
    cur.scheduled++;
    if (!doneSet.has(`${f.date}:${f.node_id}`)) {
      cur.skipped++;
      if (f.date > cur.lastSkip) cur.lastSkip = f.date;
    }
    skipMap.set(f.node_id, cur);
  }

  // Drift = node scheduled 3+ times AND skipped 3+ in a row recently
  const drifted: { id: string; title: string; skipped: number }[] = [];
  for (const [nodeId, stats] of skipMap) {
    if (stats.skipped >= 3) {
      drifted.push({ id: nodeId, title: "", skipped: stats.skipped });
    }
  }
  if (drifted.length === 0) return null;

  const { data: nodes } = await supabase
    .from("life_nodes")
    .select("id,title,description")
    .in("id", drifted.map((d) => d.id));
  const nodeMap = new Map((nodes ?? []).map((n: any) => [n.id, n]));
  drifted.forEach((d) => {
    const n = nodeMap.get(d.id) as any;
    if (n) d.title = n.title;
  });

  const list = drifted
    .filter((d) => d.title)
    .map((d) => `- "${d.title}" (skipped ${d.skipped}x in 7 days)`)
    .join("\n");
  if (!list) return null;

  const ai = await callOpenRouter(
    orKey,
    "You are a no-bullshit productivity coach. Mix Bengali (Banglish) and English naturally. Be empathetic but direct. Under 150 words. Plain text.",
    `These tasks have been repeatedly skipped:\n${list}\n\nQuick: ki hocche? Possible reasons (overcommitted? wrong time? motivation gap?). Suggest ONE small action — either delete/postpone the task, or shrink it to 2-min version. Direct.`,
  );

  return {
    kind: "drift_alert",
    title: `Drift detected — ${drifted.length} task${drifted.length > 1 ? "s" : ""} stuck`,
    body: ai,
    metadata: { drifted, today },
  };
}

// === REFLECTION ANALYSIS ===
async function runReflectionAnalysis(supabase: any, userId: string, orKey: string) {
  const today = dhakaToday();
  const start = new Date(today);
  start.setDate(start.getDate() - 14);
  const startStr = start.toISOString().slice(0, 10);

  const { data: logs } = await supabase
    .from("life_node_logs")
    .select("date,reflection,done")
    .eq("user_id", userId)
    .gte("date", startStr)
    .lte("date", today)
    .not("reflection", "is", null);

  const reflections = (logs ?? [])
    .filter((l: any) => l.reflection?.trim().length > 5)
    .map((l: any) => `[${l.date} ${l.done ? "✓" : "✗"}] ${l.reflection.slice(0, 250)}`);

  if (reflections.length < 3) return null;

  const ai = await callOpenRouter(
    orKey,
    "You analyze personal journal reflections to surface emotional and behavioral patterns. Mix Bengali (Banglish) and English. Under 200 words. Plain text, warm tone.",
    `Last 14 days reflections:\n${reflections.join("\n")}\n\nWhat patterns dekhcho? Recurring themes, blockers, emotional shifts? Give me 2-3 specific observations + 1 gentle suggestion.`,
  );

  return {
    kind: "reflection_pattern",
    title: `Reflection patterns — last 14 days`,
    body: ai,
    metadata: { count: reflections.length, today },
  };
}

function dhakaToday(): string {
  const now = new Date();
  const dhaka = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  return dhaka.toISOString().slice(0, 10);
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
