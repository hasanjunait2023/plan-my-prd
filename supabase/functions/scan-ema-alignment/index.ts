import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWELVEDATA_BASE = "https://api.twelvedata.com";
const CURRENCIES = ["EUR", "GBP", "USD", "JPY", "AUD", "NZD", "CAD", "CHF"];
const TIMEFRAMES = ["5min", "15min", "1h"];
const EMA_PERIODS = [9, 15, 200];

// Rate limiter: max 7 calls per minute to stay under 8/min limit
const DELAY_MS = 9000; // ~6.6 calls/min

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchEma(
  symbol: string,
  interval: string,
  timePeriod: number,
  apiKey: string
): Promise<number | null> {
  try {
    const url = `${TWELVEDATA_BASE}/ema?symbol=${symbol}&interval=${interval}&time_period=${timePeriod}&outputsize=1&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "error") {
      console.error(`EMA error for ${symbol} ${interval} EMA${timePeriod}:`, data.message);
      return null;
    }
    return parseFloat(data.values?.[0]?.ema);
  } catch (e) {
    console.error(`Fetch failed for ${symbol} ${interval} EMA${timePeriod}:`, e);
    return null;
  }
}

async function fetchPrice(symbol: string, apiKey: string): Promise<number | null> {
  try {
    const url = `${TWELVEDATA_BASE}/price?symbol=${symbol}&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "error") return null;
    return parseFloat(data.price);
  } catch {
    return null;
  }
}

function getStrongWeakPairs(strengthData: { currency: string; strength: number }[]): string[] {
  if (strengthData.length === 0) return [];
  
  const sorted = [...strengthData].sort((a, b) => b.strength - a.strength);
  const strong = sorted.slice(0, 3).map((s) => s.currency);
  const weak = sorted.slice(-3).map((s) => s.currency);
  
  const pairs: string[] = [];
  for (const s of strong) {
    for (const w of weak) {
      if (s !== w) {
        pairs.push(`${s}/${w}`);
      }
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
    if (!apiKey) {
      throw new Error("TWELVEDATA_API_KEY not configured");
    }

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

    // Deduplicate by currency (take latest)
    const currencyMap = new Map<string, number>();
    for (const row of strengthData || []) {
      if (!currencyMap.has(row.currency)) {
        currencyMap.set(row.currency, row.strength);
      }
    }
    const uniqueStrength = Array.from(currencyMap.entries()).map(([currency, strength]) => ({
      currency,
      strength,
    }));

    // 2. Generate strong/weak pairs
    let pairs = getStrongWeakPairs(uniqueStrength);
    if (pairs.length === 0) {
      // Fallback: use major pairs
      pairs = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "EUR/GBP", "GBP/JPY"];
    }

    // Limit to 6 pairs max to respect API limits
    pairs = pairs.slice(0, 6);

    const scanBatchId = crypto.randomUUID();
    const alignmentRows: any[] = [];
    const pairScores: Map<string, { direction: string; score: number }> = new Map();

    // 3. For each pair, fetch EMA data across timeframes
    for (const pair of pairs) {
      // Fetch current price first
      const price = await fetchPrice(pair, apiKey);
      await sleep(DELAY_MS);
      
      if (price === null) {
        console.log(`Skipping ${pair} — price fetch failed`);
        continue;
      }

      let totalAligned = 0;
      let direction = "NONE";

      for (const tf of TIMEFRAMES) {
        const ema9 = await fetchEma(pair, tf, 9, apiKey);
        await sleep(DELAY_MS);
        const ema15 = await fetchEma(pair, tf, 15, apiKey);
        await sleep(DELAY_MS);
        const ema200 = await fetchEma(pair, tf, 200, apiKey);
        await sleep(DELAY_MS);

        if (ema9 === null || ema15 === null || ema200 === null) {
          alignmentRows.push({
            pair,
            direction: "NONE",
            timeframe: tf,
            ema_9: ema9 ?? 0,
            ema_15: ema15 ?? 0,
            ema_200: ema200 ?? 0,
            current_price: price,
            is_aligned: false,
            alignment_type: "NONE",
            scan_batch_id: scanBatchId,
          });
          continue;
        }

        const isBullish = price > ema9 && ema9 > ema15 && ema15 > ema200;
        const isBearish = price < ema9 && ema9 < ema15 && ema15 < ema200;
        const isAligned = isBullish || isBearish;
        const alignmentType = isBullish ? "BULLISH" : isBearish ? "BEARISH" : "NONE";

        if (isAligned) {
          totalAligned += 3; // 3 EMAs aligned in this TF
          direction = isBullish ? "BUY" : "SELL";
        } else {
          // Count partial alignments
          if (isBullish || (price > ema9 && ema9 > ema15)) totalAligned += 2;
          else if (price > ema9) totalAligned += 1;
          if (isBearish || (price < ema9 && ema9 < ema15)) totalAligned += 2;
          else if (price < ema9) totalAligned += 1;
        }

        alignmentRows.push({
          pair,
          direction: alignmentType === "BULLISH" ? "BUY" : alignmentType === "BEARISH" ? "SELL" : "NONE",
          timeframe: tf,
          ema_9: ema9,
          ema_15: ema15,
          ema_200: ema200,
          current_price: price,
          is_aligned: isAligned,
          alignment_type: alignmentType,
          scan_batch_id: scanBatchId,
        });
      }

      if (direction !== "NONE") {
        pairScores.set(pair, { direction, score: totalAligned });
      }
    }

    // 4. Insert alignment results
    if (alignmentRows.length > 0) {
      const { error: insertError } = await supabase
        .from("ema_alignments")
        .insert(alignmentRows);
      if (insertError) console.error("Insert alignments error:", insertError);
    }

    // 5. Create notifications for aligned pairs (score >= 6)
    const notifications: any[] = [];
    for (const [pair, { direction, score }] of pairScores) {
      if (score >= 6) {
        notifications.push({
          pair,
          direction,
          alignment_score: score,
          message: `${pair} ${direction} alignment detected — Score ${score}/9 across multiple timeframes`,
          is_read: false,
          scan_batch_id: scanBatchId,
        });
      }
    }

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from("ema_scan_notifications")
        .insert(notifications);
      if (notifError) console.error("Insert notifications error:", notifError);
    }

    // 6. Cleanup old data (keep last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("ema_alignments").delete().lt("scanned_at", sevenDaysAgo);
    await supabase.from("ema_scan_notifications").delete().lt("created_at", sevenDaysAgo);

    return new Response(
      JSON.stringify({
        success: true,
        scan_batch_id: scanBatchId,
        pairs_scanned: pairs.length,
        alignments_found: pairScores.size,
        notifications_created: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
