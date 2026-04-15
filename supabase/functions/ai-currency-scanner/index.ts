import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { fetchWithRotation } from "../_shared/apiKeyRotator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALL_PAIRS = [
  "EUR/USD","EUR/GBP","EUR/JPY","EUR/AUD","EUR/NZD","EUR/CAD","EUR/CHF",
  "GBP/USD","GBP/JPY","GBP/AUD","GBP/NZD","GBP/CAD","GBP/CHF",
  "USD/JPY","USD/CAD","USD/CHF",
  "AUD/USD","AUD/JPY","AUD/NZD","AUD/CAD","AUD/CHF",
  "NZD/USD","NZD/JPY","NZD/CAD","NZD/CHF",
  "CAD/JPY","CAD/CHF",
  "CHF/JPY",
];

const CURRENCY_PAIRS: Record<string, string[]> = {
  USD: ["EUR/USD","GBP/USD","USD/JPY","AUD/USD","NZD/USD","USD/CAD","USD/CHF"],
  EUR: ["EUR/USD","EUR/GBP","EUR/JPY","EUR/AUD","EUR/NZD","EUR/CAD","EUR/CHF"],
  GBP: ["GBP/USD","EUR/GBP","GBP/JPY","GBP/AUD","GBP/NZD","GBP/CAD","GBP/CHF"],
  JPY: ["USD/JPY","EUR/JPY","GBP/JPY","AUD/JPY","NZD/JPY","CAD/JPY","CHF/JPY"],
  AUD: ["AUD/USD","EUR/AUD","GBP/AUD","AUD/JPY","AUD/NZD","AUD/CAD","AUD/CHF"],
  NZD: ["NZD/USD","EUR/NZD","GBP/NZD","NZD/JPY","AUD/NZD","NZD/CAD","NZD/CHF"],
  CAD: ["USD/CAD","EUR/CAD","GBP/CAD","CAD/JPY","AUD/CAD","NZD/CAD","CAD/CHF"],
  CHF: ["USD/CHF","EUR/CHF","GBP/CHF","CHF/JPY","AUD/CHF","NZD/CHF","CAD/CHF"],
};

const FLAGS: Record<string, string> = {
  USD:"🇺🇸",EUR:"🇪🇺",GBP:"🇬🇧",JPY:"🇯🇵",AUD:"🇦🇺",NZD:"🇳🇿",CAD:"🇨🇦",CHF:"🇨🇭"
};

const TIMEFRAME_MAP: Record<string, string> = {
  "1H": "1h", "15M": "15min", "3M": "5min"
};

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

// Fetch time_series data using API key rotation from api_key_pool
async function fetchEmaData(
  pair: string,
  interval: string,
  supabase: any
): Promise<{ price: number; ema200: number }> {
  const urlTemplate = `https://api.twelvedata.com/time_series?symbol=${pair}&interval=${interval}&outputsize=201&apikey=__API_KEY__`;
  
  const res = await fetchWithRotation(urlTemplate, "twelvedata", supabase);
  const data = await res.json();
  
  // Check for fallback/exhaustion response from rotator
  if (data.error === "SERVICE_UNAVAILABLE" || data.fallback) {
    throw new Error(`API keys exhausted: ${data.message}`);
  }
  
  if (data.status === "error") throw new Error(`${pair}: ${data.message}`);
  
  const values = data.values;
  if (!values || values.length < 200) {
    throw new Error(`${pair}: insufficient data (got ${values?.length || 0}, need 200)`);
  }
  
  const price = parseFloat(values[0].close);
  const closes = values.map((v: any) => parseFloat(v.close)).reverse();
  const ema200 = calculateEMA(closes, 200);
  
  return { price, ema200 };
}

// Calculate EMA from an array of prices (oldest first)
function calculateEMA(prices: number[], period: number): number {
  const k = 2 / (period + 1);
  // Start with SMA of first `period` values
  let ema = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period;
  // Then apply EMA formula for remaining values
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

// Pure math: compare price vs EMA(200)
function analyzePair(price: number, ema200: number): { result: number; strength: string } {
  const diffPercent = ((price - ema200) / ema200) * 100;

  if (diffPercent > 0.1) {
    return { result: 1, strength: "STRONG" };
  } else if (diffPercent < -0.1) {
    return { result: -1, strength: "WEAK" };
  } else {
    return { result: 0, strength: "NEUTRAL" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const twelvedataKey = Deno.env.get("TWELVEDATA_API_KEY")!;
  const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const action = body.action || "scan";
    const timeframe = body.timeframe || "1H";
    const interval = TIMEFRAME_MAP[timeframe] || "1h";

    if (action === "status") {
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

    // === SCAN using TwelveData time_series + EMA(200) calculation ===
    const scanBatchId = crypto.randomUUID();
    const pairResults: Record<string, number> = {};
    const errors: string[] = [];
    let processed = 0;

    // 1 API call per pair = 28 total (within 800/day limit)
    // Process 4 pairs at a time with 15s delay (TwelveData: 8 req/min free tier)
    const CHUNK_SIZE = 4;
    for (let i = 0; i < ALL_PAIRS.length; i += CHUNK_SIZE) {
      const chunk = ALL_PAIRS.slice(i, i + CHUNK_SIZE);
      
      const chunkPromises = chunk.map(async (pair) => {
        try {
          processed++;
          console.log(`[${processed}/${ALL_PAIRS.length}] Scanning ${pair}...`);
          
          const { price, ema200 } = await fetchEmaData(pair, interval, twelvedataKey);
          const analysis = analyzePair(price, ema200);
          
          const pairKey = pair.replace("/", "");
          pairResults[pair] = analysis.result;
          
          console.log(`  ${pair}: Price=${price.toFixed(5)}, EMA200=${ema200.toFixed(5)}, Result=${analysis.result} (${analysis.strength})`);
          
          await supabase.from("ai_scan_results").insert({
            scan_batch_id: scanBatchId,
            timeframe,
            pair: pairKey,
            result: analysis.result,
            strength_label: analysis.strength,
          });
        } catch (err) {
          console.error(`Error scanning ${pair}:`, err.message);
          errors.push(`${pair}: ${err.message}`);
          pairResults[pair] = 0;
        }
      });

      await Promise.all(chunkPromises);

      // 15s delay between chunks to respect 8 req/min rate limit
      if (i + CHUNK_SIZE < ALL_PAIRS.length) {
        await new Promise(r => setTimeout(r, 15000));
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

    const strengthRecords = Object.entries(currencyScores).map(([currency, { score, category }]) => ({
      currency,
      strength: score,
      category,
      timeframe,
      recorded_at,
    }));

    await supabase.from("currency_strength").insert(strengthRecords);

    // === TELEGRAM MESSAGE ===
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

    let message = `*💱 FX Co-Relation Strength On ${timeframe}*\n⏰ *${timeStr}*\n📊 _EMA(200) Pure Math_\n\n`;

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
      method: "EMA200_PURE_MATH",
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
