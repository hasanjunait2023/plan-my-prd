import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 28 unique pairs
const ALL_PAIRS = [
  "EURUSD","EURGBP","EURJPY","EURAUD","EURNZD","EURCAD","EURCHF",
  "GBPUSD","GBPJPY","GBPAUD","GBPNZD","GBPCAD","GBPCHF",
  "USDJPY","USDCAD","USDCHF",
  "AUDUSD","AUDJPY","AUDNZD","AUDCAD","AUDCHF",
  "NZDUSD","NZDJPY","NZDCAD","NZDCHF",
  "CADJPY","CADCHF",
  "CHFJPY",
];

// Currency → its 7 pairs
const CURRENCY_PAIRS: Record<string, string[]> = {
  USD: ["EURUSD","GBPUSD","USDJPY","AUDUSD","NZDUSD","USDCAD","USDCHF"],
  EUR: ["EURUSD","EURGBP","EURJPY","EURAUD","EURNZD","EURCAD","EURCHF"],
  GBP: ["GBPUSD","EURGBP","GBPJPY","GBPAUD","GBPNZD","GBPCAD","GBPCHF"],
  JPY: ["USDJPY","EURJPY","GBPJPY","AUDJPY","NZDJPY","CADJPY","CHFJPY"],
  AUD: ["AUDUSD","EURAUD","GBPAUD","AUDJPY","AUDNZD","AUDCAD","AUDCHF"],
  NZD: ["NZDUSD","EURNZD","GBPNZD","NZDJPY","AUDNZD","NZDCAD","NZDCHF"],
  CAD: ["USDCAD","EURCAD","GBPCAD","CADJPY","AUDCAD","NZDCAD","CADCHF"],
  CHF: ["USDCHF","EURCHF","GBPCHF","CHFJPY","AUDCHF","NZDCHF","CADCHF"],
};

const FLAGS: Record<string, string> = {
  USD:"🇺🇸",EUR:"🇪🇺",GBP:"🇬🇧",JPY:"🇯🇵",AUD:"🇦🇺",NZD:"🇳🇿",CAD:"🇨🇦",CHF:"🇨🇭"
};

const TIMEFRAME_MAP: Record<string, string> = {
  "1H": "1h", "15M": "15", "3M": "3"
};

const GPT_PROMPT = `# Professional Forex Chart Analysis System

You are an expert forex technical analyst. Analyze the provided chart image using the 200 EMA and price action to determine market bias.

## Rules
- **Above 200 EMA** with bullish structure → RESULT: +1, STRENGTH: STRONG
- **Below 200 EMA** with bearish structure → RESULT: -1, STRENGTH: WEAK
- **At/crossing 200 EMA** OR range-bound OR conflicting signals → RESULT: 0, STRENGTH: NEUTRAL

## Output Format (EXACT — two lines only)
\`\`\`
RESULT: [+1 / -1 / 0]
STRENGTH: [STRONG / WEAK / NEUTRAL]
\`\`\`

No additional text. Only these two lines.`;

function classify(score: number): string {
  if (score >= 5) return "STRONG";
  if (score === 4) return "MID STRONG";
  if (score >= -3) return "NEUTRAL";
  if (score === -4) return "MID WEAK";
  return "WEAK";
}

function getModifiedNumber(currency: string, pair: string, result: number): number {
  const base = pair.substring(0, 3);
  return currency === base ? result : -result;
}

async function fetchChart(pair: string, interval: string, apiKey: string): Promise<string> {
  const url = `https://api.chart-img.com/v1/tradingview/advanced-chart?symbol=FX:${pair}&interval=${interval}&studies=EMA:200&width=700&height=400`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`chart-img error ${res.status}: ${text}`);
  }
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function analyzeWithGPT(base64Image: string, openrouterKey: string): Promise<{ result: number; strength: string }> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openrouterKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: GPT_PROMPT },
          { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } },
        ],
      }],
      max_tokens: 50,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "";
  
  const resultMatch = raw.match(/RESULT:\s*([+-]?\d)/i);
  const strengthMatch = raw.match(/STRENGTH:\s*(STRONG|WEAK|NEUTRAL)/i);
  
  return {
    result: resultMatch ? parseInt(resultMatch[1]) : 0,
    strength: strengthMatch ? strengthMatch[1].toUpperCase() : "NEUTRAL",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const chartImgKey = Deno.env.get("CHARTIMG_API_KEY")!;
  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY")!;
  const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const action = body.action || "scan";
    const timeframe = body.timeframe || "1H";
    const interval = TIMEFRAME_MAP[timeframe] || "1h";

    if (action === "status") {
      // Return latest scan results for a timeframe
      const { data } = await supabase
        .from("ai_scan_results")
        .select("*")
        .eq("timeframe", timeframe)
        .order("scanned_at", { ascending: false })
        .limit(28);
      
      return new Response(JSON.stringify({ results: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === SCAN ===
    const scanBatchId = crypto.randomUUID();
    const pairResults: Record<string, number> = {};
    const errors: string[] = [];
    let processed = 0;

    // Process in chunks of 4 with 3s delay between chunks
    const CHUNK_SIZE = 4;
    for (let i = 0; i < ALL_PAIRS.length; i += CHUNK_SIZE) {
      const chunk = ALL_PAIRS.slice(i, i + CHUNK_SIZE);
      
      const chunkPromises = chunk.map(async (pair) => {
        try {
          console.log(`[${++processed}/${ALL_PAIRS.length}] Scanning ${pair}...`);
          const base64 = await fetchChart(pair, interval, chartImgKey);
          const analysis = await analyzeWithGPT(base64, openrouterKey);
          pairResults[pair] = analysis.result;
          
          // Store per-pair result
          await supabase.from("ai_scan_results").insert({
            scan_batch_id: scanBatchId,
            timeframe,
            pair,
            result: analysis.result,
            strength_label: analysis.strength,
          });
        } catch (err) {
          console.error(`Error scanning ${pair}:`, err.message);
          errors.push(`${pair}: ${err.message}`);
          pairResults[pair] = 0; // Default to neutral on error
        }
      });

      await Promise.all(chunkPromises);

      // Delay between chunks (skip after last chunk)
      if (i + CHUNK_SIZE < ALL_PAIRS.length) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // === AGGREGATE per currency ===
    const currencyScores: Record<string, { score: number; category: string }> = {};
    const recorded_at = new Date().toISOString();

    for (const [currency, pairs] of Object.entries(CURRENCY_PAIRS)) {
      let totalScore = 0;
      for (const pair of pairs) {
        const rawResult = pairResults[pair] ?? 0;
        totalScore += getModifiedNumber(currency, pair, rawResult);
      }
      const category = classify(totalScore);
      currencyScores[currency] = { score: totalScore, category };
    }

    // Insert into currency_strength
    const strengthRecords = Object.entries(currencyScores).map(([currency, { score, category }]) => ({
      currency,
      strength: score,
      category,
      timeframe,
      recorded_at,
    }));

    await supabase.from("currency_strength").insert(strengthRecords);

    // === BUILD TELEGRAM MESSAGE ===
    const sorted = Object.entries(currencyScores)
      .map(([c, { score, category }]) => ({ currency: c, score, category }))
      .sort((a, b) => b.score - a.score);

    const groups = {
      "🟢 STRONG": sorted.filter(r => r.score >= 5),
      "🟢 MID STRONG": sorted.filter(r => r.score === 4),
      "🟡 NEUTRAL": sorted.filter(r => r.score >= -3 && r.score <= 3),
      "🟠 MID WEAK": sorted.filter(r => r.score === -4),
      "🔴 WEAK": sorted.filter(r => r.score <= -5),
    };

    const bdNow = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const timeStr = bdNow.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    let message = `*💱 FX Co-Relation Strength On ${timeframe}*\n⏰ *${timeStr}*\n\n`;

    for (const [label, items] of Object.entries(groups)) {
      if (items.length === 0) continue;
      message += `*${label}*\n`;
      for (const item of items) {
        const flag = FLAGS[item.currency] || "🏳️";
        if (label.includes("NEUTRAL")) {
          message += `${flag} ${item.currency}   →  ${item.score}\n`;
        } else {
          message += `*${flag} ${item.currency}   →  ${item.score}*\n`;
        }
      }
      message += "\n";
    }

    // Send Telegram
    if (telegramToken) {
      try {
        const { data: alertSettings } = await supabase
          .from("alert_settings")
          .select("telegram_chat_id")
          .limit(1)
          .single();
        
        const chatId = alertSettings?.telegram_chat_id;
        if (chatId) {
          await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              parse_mode: "Markdown",
            }),
          });
        }
      } catch (tgErr) {
        console.error("Telegram send error:", tgErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      scan_batch_id: scanBatchId,
      timeframe,
      pairs_scanned: Object.keys(pairResults).length,
      errors: errors.length > 0 ? errors : undefined,
      currencies: currencyScores,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Scanner error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
