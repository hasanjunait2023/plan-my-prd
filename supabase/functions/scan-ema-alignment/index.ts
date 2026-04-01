import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWELVEDATA_BASE = "https://api.twelvedata.com";
const TIMEFRAMES = ["5min", "15min", "1h"];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Use time_series to get price + compute EMA alignment from raw data
// This uses 1 API call per pair/timeframe instead of 4
async function fetchTimeSeriesAndEmas(
  symbol: string,
  interval: string,
  apiKey: string
): Promise<{ price: number; ema9: number; ema15: number; ema200: number } | null> {
  try {
    const url = `${TWELVEDATA_BASE}/time_series?symbol=${symbol}&interval=${interval}&outputsize=210&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.status === "error" || !data.values || data.values.length < 200) {
      console.error(`Time series error for ${symbol} ${interval}:`, data.message || "Insufficient data");
      return null;
    }

    const closes = data.values.map((v: any) => parseFloat(v.close));
    const price = closes[0];

    // Calculate EMAs
    const ema9 = calculateEma(closes, 9);
    const ema15 = calculateEma(closes, 15);
    const ema200 = calculateEma(closes, 200);

    return { price, ema9, ema15, ema200 };
  } catch (e) {
    console.error(`Fetch failed for ${symbol} ${interval}:`, e);
    return null;
  }
}

function calculateEma(prices: number[], period: number): number {
  // prices[0] is most recent
  const reversed = prices.slice(0, Math.max(period * 2, 210)).reverse();
  const k = 2 / (period + 1);
  let ema = reversed[0];
  for (let i = 1; i < reversed.length; i++) {
    ema = reversed[i] * k + ema * (1 - k);
  }
  return ema;
}

function getStrongWeakPairs(strengthData: { currency: string; strength: number }[]): string[] {
  if (strengthData.length === 0) return [];
  const sorted = [...strengthData].sort((a, b) => b.strength - a.strength);
  const strong = sorted.slice(0, 2).map((s) => s.currency);
  const weak = sorted.slice(-2).map((s) => s.currency);
  const pairs: string[] = [];
  for (const s of strong) {
    for (const w of weak) {
      if (s !== w) pairs.push(`${s}/${w}`);
    }
  }
  return pairs;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("TWELVEDATA_API_KEY");
    if (!apiKey) throw new Error("TWELVEDATA_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get latest currency strength
    const { data: strengthData, error: strengthError } = await supabase
      .from("currency_strength")
      .select("currency, strength")
      .order("recorded_at", { ascending: false })
      .limit(8);

    if (strengthError) throw strengthError;

    const currencyMap = new Map<string, number>();
    for (const row of strengthData || []) {
      if (!currencyMap.has(row.currency)) {
        currencyMap.set(row.currency, row.strength);
      }
    }
    const uniqueStrength = Array.from(currencyMap.entries()).map(([currency, strength]) => ({
      currency, strength,
    }));

    // 2. Generate pairs (max 4 to stay within API limits)
    let pairs = getStrongWeakPairs(uniqueStrength);
    if (pairs.length === 0) {
      pairs = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"];
    }
    pairs = pairs.slice(0, 3);

    const scanBatchId = crypto.randomUUID();
    const alignmentRows: any[] = [];
    const pairScores = new Map<string, { direction: string; score: number }>();
    
    // 3. Fetch data: 1 call per pair per timeframe = 4 pairs × 3 TFs = 12 calls
    // With 8 calls/min limit, add 8s delay between calls
    let callCount = 0;

    for (const pair of pairs) {
      let totalAligned = 0;
      let direction = "NONE";

      for (const tf of TIMEFRAMES) {
        if (callCount > 0 && callCount % 7 === 0) {
          console.log(`Rate limit pause after ${callCount} calls...`);
          await sleep(62000);
        } else if (callCount > 0) {
          await sleep(1500); // Small delay between calls, burst-friendly
        }

        const result = await fetchTimeSeriesAndEmas(pair, tf, apiKey);
        callCount++;
        await sleep(8500); // ~7 calls/min

        if (!result) {
          alignmentRows.push({
            pair, direction: "NONE", timeframe: tf,
            ema_9: 0, ema_15: 0, ema_200: 0, current_price: 0,
            is_aligned: false, alignment_type: "NONE", scan_batch_id: scanBatchId,
          });
          continue;
        }

        const { price, ema9, ema15, ema200 } = result;
        const isBullish = price > ema9 && ema9 > ema15 && ema15 > ema200;
        const isBearish = price < ema9 && ema9 < ema15 && ema15 < ema200;
        const isAligned = isBullish || isBearish;
        const alignmentType = isBullish ? "BULLISH" : isBearish ? "BEARISH" : "NONE";

        if (isAligned) {
          totalAligned += 3;
          direction = isBullish ? "BUY" : "SELL";
        } else {
          // Partial scoring
          if (price > ema9) totalAligned++;
          if (ema9 > ema15) totalAligned++;
          if (ema15 > ema200) totalAligned++;
        }

        alignmentRows.push({
          pair,
          direction: isBullish ? "BUY" : isBearish ? "SELL" : "NONE",
          timeframe: tf,
          ema_9: ema9, ema_15: ema15, ema_200: ema200,
          current_price: price,
          is_aligned: isAligned, alignment_type: alignmentType,
          scan_batch_id: scanBatchId,
        });
      }

      if (direction !== "NONE" || totalAligned > 0) {
        const bestDir = totalAligned > 4 ? (direction !== "NONE" ? direction : "BUY") : (direction !== "NONE" ? direction : "SELL");
        pairScores.set(pair, { direction: bestDir, score: totalAligned });
      }
    }

    // 4. Insert results
    if (alignmentRows.length > 0) {
      const { error: insertError } = await supabase.from("ema_alignments").insert(alignmentRows);
      if (insertError) console.error("Insert alignments error:", insertError);
    }

    // 5. Notifications for aligned pairs (score >= 6)
    const notifications: any[] = [];
    for (const [pair, { direction, score }] of pairScores) {
      if (score >= 6) {
        notifications.push({
          pair, direction, alignment_score: score,
          message: `${pair} ${direction} alignment — Score ${score}/9`,
          is_read: false, scan_batch_id: scanBatchId,
        });
      }
    }

    if (notifications.length > 0) {
      const { error: notifError } = await supabase.from("ema_scan_notifications").insert(notifications);
      if (notifError) console.error("Insert notifications error:", notifError);
    }

    // 6. Cleanup old data (7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("ema_alignments").delete().lt("scanned_at", sevenDaysAgo);
    await supabase.from("ema_scan_notifications").delete().lt("created_at", sevenDaysAgo);

    const result = {
      success: true, scan_batch_id: scanBatchId,
      pairs_scanned: pairs.length, alignments_found: pairScores.size,
      notifications_created: notifications.length,
    };
    console.log("Scan complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
