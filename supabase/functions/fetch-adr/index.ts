import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

const PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD',
  'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/AUD', 'EUR/CAD', 'EUR/NZD', 'EUR/CHF',
  'GBP/AUD', 'GBP/CAD', 'GBP/NZD', 'GBP/CHF', 'AUD/JPY', 'AUD/NZD', 'AUD/CAD',
  'AUD/CHF', 'NZD/JPY', 'NZD/CAD', 'NZD/CHF', 'CAD/JPY', 'CAD/CHF', 'CHF/JPY'
];

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// Pip size for JPY pairs = 0.01, others = 0.0001
function pipSize(pair: string): number {
  return pair.includes('JPY') ? 0.01 : 0.0001;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('TWELVEDATA_API_KEY')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Parse body for optional single pair
    let pairsToFetch = PAIRS;
    try {
      const body = await req.json();
      if (body?.pair) pairsToFetch = [body.pair];
      if (body?.pairs) pairsToFetch = body.pairs;
    } catch { /* no body */ }

    const results = [];

    for (const pair of pairsToFetch) {
      try {
        // Fetch last 14 daily candles for ADR calculation
        const url = `https://api.twelvedata.com/time_series?symbol=${pair}&interval=1day&outputsize=15&apikey=${apiKey}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.status === 'error' || !data.values || data.values.length < 2) {
          console.log(`Skip ${pair}: ${data.message || 'no data'}`);
          await sleep(8000); // rate limit
          continue;
        }

        const candles = data.values;
        // Today's candle is first
        const today = candles[0];
        const todayHigh = parseFloat(today.high);
        const todayLow = parseFloat(today.low);
        const todayRange = todayHigh - todayLow;

        // ADR from last 14 days (excluding today)
        const historicalCandles = candles.slice(1, 15);
        let totalRange = 0;
        for (const c of historicalCandles) {
          totalRange += parseFloat(c.high) - parseFloat(c.low);
        }
        const adr = historicalCandles.length > 0 ? totalRange / historicalCandles.length : 0;

        const pip = pipSize(pair);
        const adrPips = adr / pip;
        const todayPips = todayRange / pip;
        const percentUsed = adr > 0 ? (todayRange / adr) * 100 : 0;

        let status = 'normal';
        if (percentUsed >= 80) status = 'exhausted';
        else if (percentUsed >= 50) status = 'caution';
        else if (percentUsed >= 20) status = 'good';
        else status = 'fresh';

        results.push({
          pair,
          adr_pips: Math.round(adrPips * 10) / 10,
          today_range_pips: Math.round(todayPips * 10) / 10,
          adr_percent_used: Math.round(percentUsed * 10) / 10,
          today_high: todayHigh,
          today_low: todayLow,
          status,
        });

        await sleep(8000); // respect 8 calls/min limit
      } catch (e) {
        console.error(`Error fetching ${pair}:`, e);
      }
    }

    // Clear old data and insert new
    if (results.length > 0) {
      await sb.from('adr_data').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await sb.from('adr_data').insert(results);
    }

    return new Response(JSON.stringify({ success: true, fetched: results.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
