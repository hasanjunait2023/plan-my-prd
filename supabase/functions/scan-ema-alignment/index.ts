import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { fetchWithRotation } from "../_shared/apiKeyRotator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWELVEDATA_BASE = "https://api.twelvedata.com";
const TIMEFRAMES = ["5min", "15min", "1h"];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPriceAndEmas(
  symbol: string,
  interval: string,
  sb: any
): Promise<{ price: number; ema9: number; ema15: number; ema200: number } | null> {
  try {
    const url = `${TWELVEDATA_BASE}/time_series?symbol=${symbol}&interval=${interval}&outputsize=1&apikey=__API_KEY__`;
    const res = await fetchWithRotation(url, "twelvedata", sb);
    const data = await res.json();
    
    if (data.status === "error" || !data.values?.length) {
      console.error(`TS error ${symbol} ${interval}:`, data.message || "No data");
      return null;
    }
    const price = parseFloat(data.values[0].close);

    const emas: number[] = [];
    for (const period of [9, 15, 200]) {
      await sleep(8000);
      const emaUrl = `${TWELVEDATA_BASE}/ema?symbol=${symbol}&interval=${interval}&time_period=${period}&outputsize=1&apikey=__API_KEY__`;
      const emaRes = await fetchWithRotation(emaUrl, "twelvedata", sb);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let requestedPair: string | null = null;
    try { const body = await req.json(); requestedPair = body?.pair || null; } catch {}

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

    let allPairs = getStrongWeakPairs(uniqueStrength);
    if (allPairs.length === 0) allPairs = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"];

    const pair = requestedPair || allPairs[0];
    const scanBatchId = crypto.randomUUID();
    const alignmentRows: any[] = [];
    let totalAligned = 0;
    let direction = "NONE";

    for (let tfIdx = 0; tfIdx < TIMEFRAMES.length; tfIdx++) {
      const tf = TIMEFRAMES[tfIdx];
      if (tfIdx > 0) await sleep(8000);

      const result = await fetchPriceAndEmas(pair, tf, supabase);

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

      if (isAligned) { totalAligned += 3; direction = isBullish ? "BUY" : "SELL"; }
      else { if (price > ema9) totalAligned++; if (ema9 > ema15) totalAligned++; if (ema15 > ema200) totalAligned++; }

      alignmentRows.push({
        pair, direction: isBullish ? "BUY" : isBearish ? "SELL" : "NONE",
        timeframe: tf, ema_9: ema9, ema_15: ema15, ema_200: ema200,
        current_price: price, is_aligned: isAligned, alignment_type: alignmentType,
        scan_batch_id: scanBatchId,
      });
    }

    if (alignmentRows.length > 0) {
      const { error } = await supabase.from("ema_alignments").insert(alignmentRows);
      if (error) console.error("Insert error:", error);
    }

    if (totalAligned >= 6) {
      await supabase.from("ema_scan_notifications").insert({
        pair, direction, alignment_score: totalAligned,
        message: `${pair} ${direction} alignment — Score ${totalAligned}/9`,
        is_read: false, scan_batch_id: scanBatchId,
      });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("ema_alignments").delete().lt("scanned_at", sevenDaysAgo);
    await supabase.from("ema_scan_notifications").delete().lt("created_at", sevenDaysAgo);

    const result = { success: true, scan_batch_id: scanBatchId, pair_scanned: pair, total_aligned: totalAligned, all_pairs: allPairs };
    console.log("Scan complete:", JSON.stringify(result));

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Scan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
