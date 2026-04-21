import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FF_THIS_WEEK = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
const FF_LAST_WEEK = 'https://nfs.faireconomy.media/ff_calendar_lastweek.json';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];

const INVERTED_KEYWORDS = ['unemployment', 'jobless', 'claimant', 'trade deficit'];

function isInverted(title: string): boolean {
  const lower = title.toLowerCase();
  return INVERTED_KEYWORDS.some(kw => lower.includes(kw));
}

function parseNumeric(val: string): number | null {
  if (!val || val.trim() === '') return null;
  const cleaned = val.replace(/[%KMBTkmbtr,<>]/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  const upper = val.toUpperCase();
  if (upper.includes('T')) return num * 1e12;
  if (upper.includes('B')) return num * 1e9;
  if (upper.includes('M')) return num * 1e6;
  if (upper.includes('K')) return num * 1e3;
  return num;
}

interface BiasResult {
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  event: string;
  actual: string;
  forecast: string;
  previous: string;
  impact: string;
  date: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Set up Supabase client up-front so we can fall back to DB on API failure
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, supabaseKey);

  const readDbAndRespond = async (extra: Record<string, unknown> = {}) => {
    const { data: dbRows } = await sb
      .from('fundamental_biases')
      .select('*')
      .in('currency', CURRENCIES);
    const biases: Record<string, BiasResult> = {};
    for (const row of dbRows || []) {
      biases[row.currency] = {
        bias: row.bias as any,
        event: row.event_title,
        actual: row.actual,
        forecast: row.forecast,
        previous: row.previous,
        impact: row.impact,
        date: row.event_date,
      };
    }
    return new Response(
      JSON.stringify({ biases, fetchedAt: new Date().toISOString(), ...extra }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  };

  try {
    const fetchOpts = { headers: { 'User-Agent': 'TradeVault-Pro/1.0' } };
    const [thisWeekRes, lastWeekRes] = await Promise.all([
      fetch(FF_THIS_WEEK, fetchOpts).catch(() => null),
      fetch(FF_LAST_WEEK, fetchOpts).catch(() => null),
    ]);

    // Rate-limited or upstream failure → serve cached DB data instead of 500
    if (!thisWeekRes || !thisWeekRes.ok) {
      const status = thisWeekRes?.status ?? 'network_error';
      console.warn(`FF this-week unavailable (${status}); serving cached biases from DB`);
      return await readDbAndRespond({
        stale: true,
        reason: status === 429 ? 'rate_limited' : 'upstream_unavailable',
        upstreamStatus: status,
      });
    }

    const thisWeekEvents: any[] = await thisWeekRes.json();
    let lastWeekEvents: any[] = [];
    if (lastWeekRes && lastWeekRes.ok) {
      lastWeekEvents = await lastWeekRes.json();
    }

    // Merge: this week first (higher priority), then last week
    const allEvents = [...thisWeekEvents, ...lastWeekEvents];

    const releasedEvents = allEvents
      .filter((e: any) => {
        const impact = (e.impact || '').toLowerCase();
        return (impact === 'high' || impact === 'medium') && e.actual?.trim();
      })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const newBiases: Record<string, BiasResult> = {};

    for (const currency of CURRENCIES) {
      const event = releasedEvents.find((e: any) => e.country === currency);
      if (!event) continue;

      const actualNum = parseNumeric(event.actual);
      const forecastNum = parseNumeric(event.forecast);
      const previousNum = parseNumeric(event.previous);
      const compareWith = forecastNum !== null ? forecastNum : previousNum;

      let bias: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
      if (actualNum !== null && compareWith !== null) {
        const diff = actualNum - compareWith;
        const threshold = Math.abs(compareWith) * 0.01 || 0.01;
        const inverted = isInverted(event.title || '');
        if (Math.abs(diff) <= threshold) bias = 'Neutral';
        else if (inverted) bias = diff < 0 ? 'Bullish' : 'Bearish';
        else bias = diff > 0 ? 'Bullish' : 'Bearish';
      }

      newBiases[currency] = {
        bias,
        event: event.title || '',
        actual: event.actual || '',
        forecast: event.forecast || '',
        previous: event.previous || '',
        impact: event.impact || 'Medium',
        date: event.date || '',
      };
    }

    // Upsert new biases to DB for persistence
    if (Object.keys(newBiases).length > 0) {
      const rows = Object.entries(newBiases).map(([currency, b]) => ({
        currency,
        bias: b.bias,
        event_title: b.event,
        actual: b.actual,
        forecast: b.forecast,
        previous: b.previous,
        impact: b.impact,
        event_date: b.date,
        updated_at: new Date().toISOString(),
      }));

      await sb.from('fundamental_biases').upsert(rows, { onConflict: 'currency' });
    }

    // Always read from DB (includes persisted data from previous weeks)
    return await readDbAndRespond();
  } catch (error) {
    console.error('Error in fundamental-bias:', error);
    // Last-resort fallback: try to serve whatever is cached so the UI doesn't blank out
    try {
      return await readDbAndRespond({ stale: true, reason: 'exception', message: (error as Error).message });
    } catch {
      return new Response(JSON.stringify({ error: (error as Error).message, fallback: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
  }
});
