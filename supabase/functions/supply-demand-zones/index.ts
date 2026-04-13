import { fetchWithRotation } from "../_shared/apiKeyRotator.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PairInput {
  pair: string;
  direction: 'BUY' | 'SELL';
}

interface Candle {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Zone {
  high: number;
  low: number;
  freshness: 'Fresh' | 'Tested' | 'Broken';
}

interface ZoneResult {
  pair: string;
  direction: 'BUY' | 'SELL';
  demandZone: Zone | null;
  supplyZone: Zone | null;
  currentPrice: number | null;
  proximity: 'Near DZ' | 'Near SZ' | 'Mid Range' | 'Wrong Zone' | 'No Data';
  priceRange: { chartHigh: number; chartLow: number } | null;
}

function detectZones(candles: Candle[]): { demandZones: Zone[]; supplyZones: Zone[] } {
  if (candles.length < 5) return { demandZones: [], supplyZones: [] };

  let atrSum = 0;
  for (let i = 1; i < Math.min(15, candles.length); i++) {
    atrSum += candles[i].high - candles[i].low;
  }
  const atr = atrSum / Math.min(14, candles.length - 1);
  const impulsiveThreshold = atr * 1.2;

  const demandZones: Zone[] = [];
  const supplyZones: Zone[] = [];

  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];

    if (curr.low < prev.low && curr.low < next.low) {
      const moveUp = next.close - curr.low;
      if (moveUp > impulsiveThreshold) {
        const zoneHigh = Math.max(curr.open, curr.close);
        const zoneLow = curr.low;
        let revisits = 0;
        for (let j = i + 2; j < candles.length; j++) {
          if (candles[j].low <= zoneHigh && candles[j].low >= zoneLow) revisits++;
        }
        demandZones.push({ high: zoneHigh, low: zoneLow, freshness: revisits === 0 ? 'Fresh' : revisits === 1 ? 'Tested' : 'Broken' });
      }
    }

    if (curr.high > prev.high && curr.high > next.high) {
      const moveDown = curr.high - next.close;
      if (moveDown > impulsiveThreshold) {
        const zoneHigh = curr.high;
        const zoneLow = Math.min(curr.open, curr.close);
        let revisits = 0;
        for (let j = i + 2; j < candles.length; j++) {
          if (candles[j].high >= zoneLow && candles[j].high <= zoneHigh) revisits++;
        }
        supplyZones.push({ high: zoneHigh, low: zoneLow, freshness: revisits === 0 ? 'Fresh' : revisits === 1 ? 'Tested' : 'Broken' });
      }
    }
  }

  return { demandZones, supplyZones };
}

function pickBestZone(zones: Zone[], currentPrice: number, type: 'demand' | 'supply'): Zone | null {
  const valid = zones.filter(z => z.freshness !== 'Broken');
  if (valid.length === 0) return null;
  valid.sort((a, b) => {
    const freshOrder = { Fresh: 0, Tested: 1, Broken: 2 };
    if (freshOrder[a.freshness] !== freshOrder[b.freshness]) return freshOrder[a.freshness] - freshOrder[b.freshness];
    const distA = type === 'demand' ? Math.abs(currentPrice - a.high) : Math.abs(currentPrice - a.low);
    const distB = type === 'demand' ? Math.abs(currentPrice - b.high) : Math.abs(currentPrice - b.low);
    return distA - distB;
  });
  return valid[0];
}

function calculateProximity(currentPrice: number, direction: 'BUY' | 'SELL', demandZone: Zone | null, supplyZone: Zone | null, atrApprox: number): ZoneResult['proximity'] {
  const nearThreshold = atrApprox * 1.5;
  if (direction === 'BUY' && demandZone) {
    const distToDZ = currentPrice - demandZone.high;
    if (distToDZ <= nearThreshold && distToDZ >= -atrApprox) return 'Near DZ';
    if (supplyZone && currentPrice >= supplyZone.low) return 'Wrong Zone';
    return 'Mid Range';
  }
  if (direction === 'SELL' && supplyZone) {
    const distToSZ = supplyZone.low - currentPrice;
    if (distToSZ <= nearThreshold && distToSZ >= -atrApprox) return 'Near SZ';
    if (demandZone && currentPrice <= demandZone.high) return 'Wrong Zone';
    return 'Mid Range';
  }
  return 'Mid Range';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { pairs } = await req.json() as { pairs: PairInput[] };
    if (!pairs || pairs.length === 0) {
      return new Response(JSON.stringify({ zones: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const pairsToProcess = pairs.slice(0, 8);
    const symbols = pairsToProcess.map(p => p.pair).join(',');
    const urlTemplate = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbols)}&interval=1h&outputsize=100&apikey=__API_KEY__`;
    
    console.log(`Batch fetching S/D for: ${symbols}`);
    const resp = await fetchWithRotation(urlTemplate, "twelvedata", sb);
    const batchData = await resp.json();

    // Handle API key exhaustion gracefully
    if (batchData?.fallback === true) {
      console.log("All API keys temporarily unavailable");
      const fallbackResults = pairsToProcess.map(p => ({
        pair: p.pair, direction: p.direction, demandZone: null, supplyZone: null,
        currentPrice: null, proximity: 'No Data' as const, priceRange: null
      }));
      return new Response(JSON.stringify({ zones: fallbackResults, warning: batchData.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results: ZoneResult[] = pairsToProcess.map((p) => {
      try {
        let values: any[] = [];
        if (pairsToProcess.length === 1) values = batchData?.values || [];
        else values = batchData?.[p.pair]?.values || [];

        if (!values || values.length === 0) {
          const errMsg = pairsToProcess.length === 1 ? batchData?.message : batchData?.[p.pair]?.message;
          console.log(`${p.pair}: no data - ${errMsg || 'empty'}`);
          return { pair: p.pair, direction: p.direction, demandZone: null, supplyZone: null, currentPrice: null, proximity: 'No Data' as const, priceRange: null };
        }

        const candles: Candle[] = values.map((v: any) => ({
          datetime: v.datetime, open: parseFloat(v.open), high: parseFloat(v.high), low: parseFloat(v.low), close: parseFloat(v.close),
        })).reverse();

        const currentPrice = candles[candles.length - 1].close;
        const chartHigh = Math.max(...candles.map(c => c.high));
        const chartLow = Math.min(...candles.map(c => c.low));
        const { demandZones, supplyZones } = detectZones(candles);
        const bestDemand = pickBestZone(demandZones, currentPrice, 'demand');
        const bestSupply = pickBestZone(supplyZones, currentPrice, 'supply');

        let atrSum = 0;
        for (let i = 1; i < Math.min(15, candles.length); i++) atrSum += candles[i].high - candles[i].low;
        const atrApprox = atrSum / Math.min(14, candles.length - 1);
        const proximity = calculateProximity(currentPrice, p.direction, bestDemand, bestSupply, atrApprox);

        return { pair: p.pair, direction: p.direction, demandZone: bestDemand, supplyZone: bestSupply, currentPrice, proximity, priceRange: { chartHigh, chartLow } };
      } catch (err) {
        console.error(`Error processing ${p.pair}:`, err);
        return { pair: p.pair, direction: p.direction, demandZone: null, supplyZone: null, currentPrice: null, proximity: 'No Data' as const, priceRange: null };
      }
    });

    return new Response(JSON.stringify({ zones: results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Supply-demand-zones error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
