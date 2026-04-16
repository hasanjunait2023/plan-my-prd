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

const SESSION_CURRENCIES: Record<string, string[]> = {
  "Asian": ["JPY", "AUD", "NZD"],
  "London": ["EUR", "GBP"],
  "New York": ["USD", "CAD"],
};

const FLAGS: Record<string, string> = {
  USD:"🇺🇸",EUR:"🇪🇺",GBP:"🇬🇧",JPY:"🇯🇵",AUD:"🇦🇺",NZD:"🇳🇿",CAD:"🇨🇦",CHF:"🇨🇭"
};

// ====== EMA Calculation ======
function calculateEMA(prices: number[], period: number): number {
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((s, p) => s + p, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

// ====== RSI Calculation ======
function calculateRSI(closes: number[], period = 14): number[] {
  const rsiValues: number[] = [];
  if (closes.length < period + 1) return rsiValues;

  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  rsiValues.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsiValues.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return rsiValues;
}

// ====== Divergence Detection ======
interface DivergenceResult {
  type: "BULLISH" | "BEARISH" | "NONE";
  strength: "STRONG" | "MODERATE" | "NONE";
  rsiValue: number;
}

function detectDivergence(closes: number[], rsiValues: number[]): DivergenceResult {
  // We need at least 30 data points with RSI
  // closes are chronological (oldest first), rsiValues align with closes starting from index `period`
  const lookback = 30;
  const rsiOffset = closes.length - rsiValues.length; // RSI starts at this index in closes

  if (rsiValues.length < lookback) {
    return { type: "NONE", strength: "NONE", rsiValue: rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : 50 };
  }

  const currentRSI = rsiValues[rsiValues.length - 1];

  // Find swing lows and highs in the last 30 candles (5-bar window: 2 bars each side)
  const startIdx = rsiValues.length - lookback;
  const swingLows: { idx: number; price: number; rsi: number }[] = [];
  const swingHighs: { idx: number; price: number; rsi: number }[] = [];

  for (let i = startIdx + 2; i < rsiValues.length - 2; i++) {
    const priceIdx = i + rsiOffset;
    const price = closes[priceIdx];
    const rsi = rsiValues[i];

    // Swing low: price lower than 2 bars on each side
    if (
      price <= closes[priceIdx - 1] && price <= closes[priceIdx - 2] &&
      price <= closes[priceIdx + 1] && price <= closes[priceIdx + 2]
    ) {
      swingLows.push({ idx: i, price, rsi });
    }

    // Swing high: price higher than 2 bars on each side
    if (
      price >= closes[priceIdx - 1] && price >= closes[priceIdx - 2] &&
      price >= closes[priceIdx + 1] && price >= closes[priceIdx + 2]
    ) {
      swingHighs.push({ idx: i, price, rsi });
    }
  }

  // Check bullish divergence: last two swing lows
  if (swingLows.length >= 2) {
    const prev = swingLows[swingLows.length - 2];
    const curr = swingLows[swingLows.length - 1];
    if (curr.price < prev.price && curr.rsi > prev.rsi) {
      const priceDiff = Math.abs((curr.price - prev.price) / prev.price) * 100;
      const rsiDiff = curr.rsi - prev.rsi;
      const strength = (priceDiff > 0.3 && rsiDiff > 5) ? "STRONG" : "MODERATE";
      return { type: "BULLISH", strength, rsiValue: currentRSI };
    }
  }

  // Check bearish divergence: last two swing highs
  if (swingHighs.length >= 2) {
    const prev = swingHighs[swingHighs.length - 2];
    const curr = swingHighs[swingHighs.length - 1];
    if (curr.price > prev.price && curr.rsi < prev.rsi) {
      const priceDiff = Math.abs((curr.price - prev.price) / prev.price) * 100;
      const rsiDiff = prev.rsi - curr.rsi;
      const strength = (priceDiff > 0.3 && rsiDiff > 5) ? "STRONG" : "MODERATE";
      return { type: "BEARISH", strength, rsiValue: currentRSI };
    }
  }

  return { type: "NONE", strength: "NONE", rsiValue: currentRSI };
}

// ====== ATR Calculation ======
function calculateATR(candles: { high: number; low: number; close: number }[], period: number): number {
  if (candles.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    trs.push(tr);
  }
  const recentTrs = trs.slice(-period);
  return recentTrs.reduce((s, v) => s + v, 0) / recentTrs.length;
}

// Fetch time_series with rotation
async function fetchCandles(
  pair: string, interval: string, outputsize: number, supabase: any
): Promise<any[]> {
  const urlTemplate = `https://api.twelvedata.com/time_series?symbol=${pair}&interval=${interval}&outputsize=${outputsize}&apikey=__API_KEY__`;
  const res = await fetchWithRotation(urlTemplate, "twelvedata", supabase);
  const data = await res.json();

  if (data.error === "SERVICE_UNAVAILABLE" || data.fallback) {
    throw new Error(`API keys exhausted: ${data.message}`);
  }
  if (data.status === "error") throw new Error(`${pair}: ${data.message}`);
  if (!data.values || data.values.length < 10) {
    throw new Error(`${pair}: insufficient data (got ${data.values?.length || 0})`);
  }
  return data.values;
}

function getModifiedNumber(currency: string, pair: string, result: number): number {
  const base = pair.substring(0, 3);
  return currency === base ? result : -result;
}

// ====== Temporary storage table for batch data ======
// We use a JSON approach: store partial results in the DB between batch calls
async function storePartialData(supabase: any, scanBatchId: string, pairData: Record<string, any>) {
  // Store as alert_log with special type for temp data
  await supabase.from("alert_log").insert({
    alert_type: "pair_selector_partial",
    pair: scanBatchId,
    message: "partial_batch_data",
    metadata: pairData,
  });
}

async function loadPartialData(supabase: any, scanBatchId: string): Promise<Record<string, any>> {
  const { data } = await supabase
    .from("alert_log")
    .select("metadata")
    .eq("alert_type", "pair_selector_partial")
    .eq("pair", scanBatchId)
    .single();
  
  return data?.metadata || {};
}

async function cleanupPartialData(supabase: any, scanBatchId: string) {
  await supabase
    .from("alert_log")
    .delete()
    .eq("alert_type", "pair_selector_partial")
    .eq("pair", scanBatchId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const session: string = body.session || "London";
    const sendTelegram: boolean = body.sendTelegram !== false;
    const batch: string = body.batch || "all"; // "first", "second", or "all"
    const scanBatchIdInput: string = body.scan_batch_id || null;

    const scanBatchId = scanBatchIdInput || crypto.randomUUID();

    console.log(`🎯 Pair Selector [${batch}] for ${session} session (batch: ${scanBatchId})...`);

    // Determine which pairs to scan
    let pairsToScan = ALL_PAIRS;
    if (batch === "first") pairsToScan = ALL_PAIRS.slice(0, 14);
    else if (batch === "second") pairsToScan = ALL_PAIRS.slice(14);

    const errors: string[] = [];
    
    // ====== DATA COLLECTION ======
    interface PairData {
      price1h: number;
      ema200_1h: number;
      price4h: number;
      ema200_4h: number;
      candles1h: { high: number; low: number; close: number }[];
      overextPct: number;
    }
    
    const pairData: Record<string, PairData> = {};
    let processed = 0;

    // Reduced delays to fit within edge function timeout
    const CHUNK_DELAY_MS = 1500;

    for (let i = 0; i < pairsToScan.length; i++) {
      const pair = pairsToScan[i];
      processed++;
      console.log(`[${processed}/${pairsToScan.length}] Fetching ${pair}...`);
      
      try {
        // Fetch 1H data (201 candles for EMA200 + ATR)
        const candles1h = await fetchCandles(pair, "1h", 201, supabase);
        const closes1h = candles1h.map((v: any) => parseFloat(v.close)).reverse();
        const price1h = parseFloat(candles1h[0].close);
        const ema200_1h = calculateEMA(closes1h, 200);

        // Small delay between 1H and 4H fetch
        await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));

        // Fetch 4H data (201 candles for EMA200)
        const candles4h = await fetchCandles(pair, "4h", 201, supabase);
        const closes4h = candles4h.map((v: any) => parseFloat(v.close)).reverse();
        const price4h = parseFloat(candles4h[0].close);
        const ema200_4h = calculateEMA(closes4h, 200);

        // Overextension check
        const overextPct = Math.abs((price1h - ema200_1h) / ema200_1h) * 100;

        pairData[pair] = {
          price1h, ema200_1h,
          price4h, ema200_4h,
          candles1h: candles1h.map((v: any) => ({
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close),
          })),
          overextPct,
        };
      } catch (err) {
        console.error(`Error fetching ${pair}:`, err.message);
        errors.push(`${pair}: ${err.message}`);
      }

      // Delay between pairs
      if (i < pairsToScan.length - 1) {
        await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));
      }
    }

    // ====== BATCH HANDLING ======
    if (batch === "first") {
      // Store partial data and self-invoke for second batch
      console.log(`✅ First batch done: ${processed} pairs. Storing and invoking second batch...`);
      
      // Store pair data (without candles to keep size small)
      const partialStore: Record<string, any> = {};
      for (const [pair, d] of Object.entries(pairData)) {
        // Calculate RSI divergence before storing
        const closes = d.candles1h.map(c => c.close).reverse(); // chronological
        const rsiValues = calculateRSI(closes, 14);
        const divergence = detectDivergence(closes, rsiValues);

        partialStore[pair] = {
          price1h: d.price1h,
          ema200_1h: d.ema200_1h,
          price4h: d.price4h,
          ema200_4h: d.ema200_4h,
          overextPct: d.overextPct,
          atr_current: calculateATR(d.candles1h.slice(0, 15), 14),
          atr_avg: d.candles1h.length >= 30 ? calculateATR(d.candles1h.slice(14, 182).slice(0, 169), 14) : calculateATR(d.candles1h.slice(0, 15), 14),
          rsi_value: divergence.rsiValue,
          divergence_type: divergence.type,
          divergence_strength: divergence.strength,
        };
      }
      
      await storePartialData(supabase, scanBatchId, partialStore);

      // Self-invoke second batch
      const selfUrl = `${supabaseUrl}/functions/v1/session-pair-selector`;
      fetch(selfUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          batch: "second",
          scan_batch_id: scanBatchId,
          session,
          sendTelegram,
        }),
      }).catch(e => console.error("Self-invoke error:", e));

      return new Response(JSON.stringify({
        success: true,
        scan_batch_id: scanBatchId,
        batch: "first",
        pairs_fetched: processed,
        errors: errors.length > 0 ? errors : undefined,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ====== For "second" or "all" batch: merge data and analyze ======
    
    // Merge with first batch data if this is the second batch
    let mergedPairData: Record<string, any> = {};
    let firstBatchATR: Record<string, { atr_current: number; atr_avg: number }> = {};
    
    if (batch === "second") {
      const firstBatchData = await loadPartialData(supabase, scanBatchId);
      
      // Load first batch into mergedPairData
      for (const [pair, d] of Object.entries(firstBatchData)) {
        mergedPairData[pair] = d;
        firstBatchATR[pair] = { atr_current: (d as any).atr_current, atr_avg: (d as any).atr_avg };
      }
      
      // Add second batch data
      for (const [pair, d] of Object.entries(pairData)) {
        const closes = d.candles1h.map(c => c.close).reverse();
        const rsiValues = calculateRSI(closes, 14);
        const divergence = detectDivergence(closes, rsiValues);

        mergedPairData[pair] = {
          price1h: d.price1h,
          ema200_1h: d.ema200_1h,
          price4h: d.price4h,
          ema200_4h: d.ema200_4h,
          overextPct: d.overextPct,
          atr_current: calculateATR(d.candles1h.slice(0, 15), 14),
          atr_avg: d.candles1h.length >= 30 ? calculateATR(d.candles1h.slice(14, 182).slice(0, 169), 14) : calculateATR(d.candles1h.slice(0, 15), 14),
          rsi_value: divergence.rsiValue,
          divergence_type: divergence.type,
          divergence_strength: divergence.strength,
        };
      }

      // Cleanup temp data
      await cleanupPartialData(supabase, scanBatchId);
      
      console.log(`✅ Second batch done. Merged total: ${Object.keys(mergedPairData).length} pairs.`);
    } else {
      // "all" batch — just use current pairData directly
      for (const [pair, d] of Object.entries(pairData)) {
        const closes = d.candles1h.map(c => c.close).reverse();
        const rsiValues = calculateRSI(closes, 14);
        const divergence = detectDivergence(closes, rsiValues);

        mergedPairData[pair] = {
          price1h: d.price1h,
          ema200_1h: d.ema200_1h,
          price4h: d.price4h,
          ema200_4h: d.ema200_4h,
          overextPct: d.overextPct,
          atr_current: calculateATR(d.candles1h.slice(0, 15), 14),
          atr_avg: d.candles1h.length >= 30 ? calculateATR(d.candles1h.slice(14, 182).slice(0, 169), 14) : calculateATR(d.candles1h.slice(0, 15), 14),
          rsi_value: divergence.rsiValue,
          divergence_type: divergence.type,
          divergence_strength: divergence.strength,
        };
      }
    }

    // ====== LAYER 1-2: Currency Strength + Differential ======
    const currencyScores: Record<string, number> = {};
    
    for (const [currency, pairs] of Object.entries(CURRENCY_PAIRS)) {
      let totalScore = 0;
      for (const pair of pairs) {
        const d = mergedPairData[pair];
        if (!d) continue;
        const raw = d.price1h > d.ema200_1h ? 1 : (d.price1h < d.ema200_1h ? -1 : 0);
        totalScore += getModifiedNumber(currency, pair, raw);
      }
      currencyScores[currency] = totalScore;
    }

    // ====== GET ADR DATA ======
    const { data: adrRows } = await supabase
      .from("adr_data")
      .select("pair, adr_pips, today_range_pips, adr_percent_used")
      .order("fetched_at", { ascending: false });

    const adrMap: Record<string, { adrRemaining: number; adrPips: number }> = {};
    if (adrRows) {
      for (const row of adrRows) {
        if (!adrMap[row.pair]) {
          adrMap[row.pair] = {
            adrRemaining: Math.max(0, 100 - (row.adr_percent_used || 0)),
            adrPips: row.adr_pips || 0,
          };
        }
      }
    }

    // ====== ANALYZE EACH PAIR — 6 LAYERS ======
    interface PairResult {
      pair: string;
      direction: string;
      totalScore: number;
      differential: number;
      bias4h: string;
      overextensionPct: number;
      dailyStructure: string;
      adrRemaining: number;
      atrStatus: string;
      reasoning: string;
      isQualified: boolean;
    }

    const results: PairResult[] = [];
    const sessionPreferredCurrencies = SESSION_CURRENCIES[session] || [];

    for (const pair of ALL_PAIRS) {
      const d = mergedPairData[pair];
      if (!d) continue;

      const base = pair.substring(0, 3);
      const quote = pair.substring(4, 7);
      const baseScore = currencyScores[base] || 0;
      const quoteScore = currencyScores[quote] || 0;
      const differential = baseScore - quoteScore;
      const absDiff = Math.abs(differential);
      const direction = differential > 0 ? "BUY" : differential < 0 ? "SELL" : "NONE";

      let score = 0;
      const reasons: string[] = [];

      // LAYER 1-2: Differential ≥ 5 → 30 pts
      if (absDiff >= 5) {
        score += 30;
        reasons.push(`Diff ${differential} ✅`);
      } else {
        reasons.push(`Diff ${differential} ❌ (need ≥5)`);
      }

      // LAYER 3: 4H Bias Alignment → 25 pts
      const dir1h = d.price1h > d.ema200_1h ? "BULL" : "BEAR";
      const dir4h = d.price4h > d.ema200_4h ? "BULL" : "BEAR";
      const bias4h = dir1h === dir4h ? "CONFIRMED" : "CONFLICTING";
      
      if (bias4h === "CONFIRMED") {
        score += 25;
        reasons.push(`4H+1H aligned ${dir4h} ✅`);
      } else {
        reasons.push(`4H ${dir4h} vs 1H ${dir1h} ❌`);
      }

      // LAYER 4: Overextension → 20 pts (graduated)
      const overextPct = d.overextPct;
      if (overextPct < 0.8) {
        score += 20;
        reasons.push(`Overext ${overextPct.toFixed(2)}% ✅`);
      } else if (overextPct <= 1.5) {
        score += 10;
        reasons.push(`Overext ${overextPct.toFixed(2)}% ⚠️`);
      } else {
        reasons.push(`Overext ${overextPct.toFixed(2)}% ❌`);
      }

      // LAYER 5: Daily Structure → 15 pts
      const pairKey = pair.replace("/", "");
      const adr = adrMap[pairKey];
      let dailyStructure = "CLEAR";
      if (adr && adr.adrPips > 0) {
        if (adr.adrRemaining < 20) {
          dailyStructure = "AT_EXTREME";
          reasons.push(`Daily structure at extreme ❌`);
        } else {
          score += 15;
          reasons.push(`Daily structure clear ✅`);
        }
      } else {
        score += 15;
        reasons.push(`Daily structure clear (no ADR data) ✅`);
      }

      // LAYER 6: ADR + ATR → 15 pts total
      const adrRemaining = adr ? adr.adrRemaining : 100;
      if (adrRemaining >= 50) {
        score += 10;
        reasons.push(`ADR ${adrRemaining.toFixed(0)}% remaining ✅`);
      } else if (adrRemaining >= 30) {
        score += 5;
        reasons.push(`ADR ${adrRemaining.toFixed(0)}% remaining ⚠️`);
      } else {
        reasons.push(`ADR ${adrRemaining.toFixed(0)}% remaining ❌`);
      }

      // ATR → 5 pts
      const currentATR = d.atr_current || 0;
      const avgATR = d.atr_avg || currentATR;
      
      let atrStatus = "NORMAL";
      if (avgATR > 0) {
        const atrRatio = currentATR / avgATR;
        if (atrRatio >= 1.0) {
          score += 5;
          atrStatus = "ACTIVE";
          reasons.push(`ATR active (${(atrRatio * 100).toFixed(0)}%) ✅`);
        } else if (atrRatio >= 0.7) {
          score += 3;
          atrStatus = "NORMAL";
          reasons.push(`ATR normal (${(atrRatio * 100).toFixed(0)}%) ⚠️`);
        } else {
          atrStatus = "SLEEPING";
          reasons.push(`ATR sleeping (${(atrRatio * 100).toFixed(0)}%) ❌`);
        }
      } else {
        score += 3;
        reasons.push(`ATR data insufficient ⚠️`);
      }

      const isQualified = score >= 70 && absDiff >= 5 && bias4h === "CONFIRMED";

      results.push({
        pair,
        direction: direction === "NONE" ? "NONE" : direction,
        totalScore: score,
        differential,
        bias4h,
        overextensionPct: overextPct,
        dailyStructure,
        adrRemaining,
        atrStatus,
        reasoning: reasons.join(" | "),
        isQualified,
      });
    }

    // Sort: qualified first, then by score desc
    results.sort((a, b) => {
      if (a.isQualified !== b.isQualified) return a.isQualified ? -1 : 1;
      return b.totalScore - a.totalScore;
    });

    const qualified = results.filter(r => r.isQualified);
    const skipped = results.filter(r => !r.isQualified);
    
    qualified.forEach((r, i) => (r as any).rank = i + 1);

    // ====== STORE RESULTS ======
    const dbRecords = results.map((r) => ({
      scan_batch_id: scanBatchId,
      pair: r.pair.replace("/", ""),
      session,
      direction: r.direction,
      total_score: r.totalScore,
      differential: r.differential,
      bias_4h: r.bias4h,
      overextension_pct: r.overextensionPct,
      daily_structure: r.dailyStructure,
      adr_remaining: r.adrRemaining,
      atr_status: r.atrStatus,
      reasoning: r.reasoning,
      is_qualified: r.isQualified,
      rank: r.isQualified ? (r as any).rank : 0,
    }));

    await supabase.from("session_pair_recommendations").insert(dbRecords);

    console.log(`✅ Stored ${dbRecords.length} results. Qualified: ${qualified.length}`);

    // ====== TELEGRAM ======
    if (sendTelegram && telegramToken && qualified.length > 0) {
      try {
        const { data: alertSettings } = await supabase
          .from("alert_settings")
          .select("telegram_chat_id")
          .limit(1)
          .single();

        const chatId = alertSettings?.telegram_chat_id;
        if (chatId) {
          const bdNow = new Date(Date.now() + 6 * 60 * 60 * 1000);
          const timeStr = bdNow.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

          let msg = `🎯 *${session.toUpperCase()} SESSION — PAIR FOCUS LIST*\n`;
          msg += `⏰ ${timeStr} BDT\n\n`;
          msg += `━━━━━━━━━━━━━━━━━━━\n`;

          for (const r of qualified.slice(0, 4)) {
            const base = r.pair.substring(0, 3);
            const quote = r.pair.substring(4, 7);
            const emoji = r.direction === "BUY" ? "📈" : "📉";
            const baseFlag = FLAGS[base] || "";
            const quoteFlag = FLAGS[quote] || "";
            
            msg += `🟢 ${baseFlag}${quoteFlag} *${r.pair}* → ${emoji} *${r.direction} BIAS*\n`;
            msg += `   Strength: ${base} ${currencyScores[base] || 0} | ${quote} ${currencyScores[quote] || 0} | Gap: ${r.differential > 0 ? "+" : ""}${r.differential}\n`;
            msg += `   4H+1H: ${r.bias4h} ✅ | Score: ${r.totalScore}/105\n`;
            msg += `   ADR: ${r.adrRemaining.toFixed(0)}% | ATR: ${r.atrStatus}\n\n`;
          }

          msg += `━━━━━━━━━━━━━━━━━━━\n`;
          msg += `❌ *SKIPPED:* ${skipped.length} pairs\n`;
          
          for (const s of skipped.slice(0, 3)) {
            const shortReason = s.bias4h === "CONFLICTING" ? "4H conflict" :
                               s.totalScore < 70 ? `Score ${s.totalScore}` :
                               Math.abs(s.differential) < 5 ? `Diff ${s.differential}` : "Filtered";
            msg += `• ${s.pair} — ${shortReason}\n`;
          }
          
          msg += `\n⚠️ _শুধু এই pairs এ setup খোঁজো_\n_15M structure → 3M entry_`;

          await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: msg,
              parse_mode: "Markdown",
            }),
          });
        }
      } catch (tgErr) {
        console.error("Telegram error:", tgErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      scan_batch_id: scanBatchId,
      session,
      batch,
      pairs_analyzed: Object.keys(mergedPairData).length,
      qualified: qualified.map(r => ({
        pair: r.pair,
        direction: r.direction,
        score: r.totalScore,
        differential: r.differential,
        bias4h: r.bias4h,
        overextPct: r.overextensionPct.toFixed(2),
        adrRemaining: r.adrRemaining.toFixed(0),
        atrStatus: r.atrStatus,
        reasoning: r.reasoning,
        rank: (r as any).rank,
      })),
      skipped_count: skipped.length,
      currency_scores: currencyScores,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Pair selector error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
