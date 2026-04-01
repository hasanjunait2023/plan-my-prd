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

// Single API call per pair+timeframe — get price + EMA values via time_series (1 credit)
async function fetchPriceAndEmas(
  symbol: string,
  interval: string,
  apiKey: string
): Promise<{ price: number; ema9: number; ema15: number; ema200: number } | null> {
  try {
    // outputsize=1 = 1 credit. We get price from this.
    const url = `${TWELVEDATA_BASE}/time_series?symbol=${symbol}&interval=${interval}&outputsize=1&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.status === "error" || !data.values?.length) {
      console.error(`TS error ${symbol} ${interval}:`, data.message || "No data");
      return null;
    }
    const price = parseFloat(data.values[0].close);

    // Now get EMA values — use /ema endpoint (1 credit each)
    const emas: number[] = [];
    for (const period of [9, 15, 200]) {
      await sleep(8000); // respect rate limit
      const emaUrl = `${TWELVEDATA_BASE}/ema?symbol=${symbol}&interval=${interval}&time_period=${period}&outputsize=1&apikey=${apiKey}`;
      const emaRes = await fetch(emaUrl);
      const emaData = await emaRes.json();
      if (emaData.status === "error" || !emaData.values?.length) {
        console.error(`EMA${period} error ${symbol} ${interval}:`, emaData.message);
        return null;
      }
      emas.push(parseFloat(emaData.values[0].ema));
    }

    return { price, ema9: emas[0], ema15: emas[1], ema200: emas[2] };
  } catch (e) {
    console.error(`Fetch failed ${symbol} ${interval}:`, e);
    return null;
  }
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

    // Check request body for specific pair (optional)
    let requestedPair: string | null = null;
    try {
      const body = await req.json();
      requestedPair = body?.pair || null;
    } catch {}

    // 1. Get currency strength
    const { data: strengthData } = await supabase
      .from("currency_strength")
      .select("currency, strength")
      .order("recorded_at", { ascending: false })
      .limit(8);

    const currencyMap = new Map<string, number>();
    for (const row of strengthData || []) {
      if (!currencyMap.has(row.currency)) currencyMap.set(row.currency, row.strength);
    }
    const uniqueStrength = Array.from(currencyMap.entries()).map(([currency, strength]) => ({ currency, strength }));

    // 2. Get pairs — only scan 1 pair per invocation to stay within limits
    let allPairs = getStrongWeakPairs(uniqueStrength);
    if (allPairs.length === 0) allPairs = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"];

    // If specific pair requested, use that. Otherwise pick first unscanned.
    const pair = requestedPair || allPairs[0];
    
    const scanBatchId = crypto.randomUUID();
    const alignmentRows: any[] = [];
    let totalAligned = 0;
    let direction = "NONE";

    // 3. Scan the single pair across 3 timeframes (4 API calls per TF × 3 TF = 12 calls)
    // Actually: 1 price + 3 EMA per TF × 3 TFs = 12 calls. At 8/min = needs ~90s
    // Let's do just 1 timeframe per invocation to be safe
    // OR: skip price call, use EMA endpoint only (3 calls per TF)
    
    // Strategy: 3 calls per TF, 3 TFs = 9 calls. Need ~68s at 8/min.
    // Use only EMA calls, derive price from most recent EMA9 approximation? No, let's just be smart.

    // Actually let's just fetch all 3 TFs with delays
    for (let tfIdx = 0; tfIdx < TIMEFRAMES.length; tfIdx++) {
      const tf = TIMEFRAMES[tfIdx];
      
      if (tfIdx > 0) {
        // Wait to reset rate limit window
        await sleep(8000);
      }

      const result = await fetchPriceAndEmas(pair, tf, apiKey);

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
        if (price > ema9) totalAligned++;
        if (ema9 > ema15) totalAligned++;
        if (ema15 > ema200) totalAligned++;
      }

      alignmentRows.push({
        pair, direction: isBullish ? "BUY" : isBearish ? "SELL" : "NONE",
        timeframe: tf, ema_9: ema9, ema_15: ema15, ema_200: ema200,
        current_price: price, is_aligned: isAligned, alignment_type: alignmentType,
        scan_batch_id: scanBatchId,
      });
    }

    // 4. Insert
    if (alignmentRows.length > 0) {
      const { error } = await supabase.from("ema_alignments").insert(alignmentRows);
      if (error) console.error("Insert error:", error);
    }

    // 5. Notification
    if (totalAligned >= 6) {
      await supabase.from("ema_scan_notifications").insert({
        pair, direction, alignment_score: totalAligned,
        message: `${pair} ${direction} alignment — Score ${totalAligned}/9`,
        is_read: false, scan_batch_id: scanBatchId,
      });
    }

    // 6. Cleanup old data
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("ema_alignments").delete().lt("scanned_at", sevenDaysAgo);
    await supabase.from("ema_scan_notifications").delete().lt("created_at", sevenDaysAgo);

    const result = {
      success: true, scan_batch_id: scanBatchId,
      pair_scanned: pair, total_aligned: totalAligned,
      all_pairs: allPairs,
    };
    console.log("Scan complete:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
