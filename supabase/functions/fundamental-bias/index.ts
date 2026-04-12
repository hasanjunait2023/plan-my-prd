const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FF_THIS_WEEK_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
const FF_LAST_WEEK_URL = 'https://nfs.faireconomy.media/ff_calendar_lastweek.json';

// Country code → currency mapping
const COUNTRY_CURRENCY: Record<string, string> = {
  USD: 'USD', EUR: 'EUR', GBP: 'GBP', JPY: 'JPY',
  AUD: 'AUD', NZD: 'NZD', CAD: 'CAD', CHF: 'CHF',
};

// Inverted indicators — lower actual = bullish for the currency
const INVERTED_KEYWORDS = [
  'unemployment', 'jobless', 'claimant', 'trade deficit',
];

function isInverted(title: string): boolean {
  const lower = title.toLowerCase();
  return INVERTED_KEYWORDS.some(kw => lower.includes(kw));
}

function parseNumeric(val: string): number | null {
  if (!val || val.trim() === '') return null;
  const cleaned = val.replace(/[%KMBTkmbtr,<>]/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  // Handle multipliers
  const upper = val.toUpperCase();
  if (upper.includes('T')) return num * 1_000_000_000_000;
  if (upper.includes('B')) return num * 1_000_000_000;
  if (upper.includes('M')) return num * 1_000_000;
  if (upper.includes('K')) return num * 1_000;
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

  try {
    const response = await fetch(FF_CALENDAR_URL, {
      headers: { 'User-Agent': 'TradeVault-Pro/1.0' },
    });

    if (!response.ok) {
      throw new Error(`FF API returned ${response.status}`);
    }

    const rawEvents: any[] = await response.json();

    // Filter only High/Medium impact events that have actual values released
    const releasedEvents = rawEvents.filter((e: any) => {
      const impact = (e.impact || '').toLowerCase();
      const hasActual = e.actual && e.actual.trim() !== '';
      return (impact === 'high' || impact === 'medium') && hasActual;
    });

    // Sort by date descending (most recent first)
    releasedEvents.sort((a: any, b: any) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // For each currency, find the latest released event
    const biases: Record<string, BiasResult> = {};

    for (const currency of Object.values(COUNTRY_CURRENCY)) {
      // Find latest event for this currency
      const event = releasedEvents.find((e: any) => e.country === currency);
      if (!event) continue;

      const actualNum = parseNumeric(event.actual);
      const forecastNum = parseNumeric(event.forecast);
      const previousNum = parseNumeric(event.previous);

      // Compare actual vs forecast (primary), fallback to actual vs previous
      const compareWith = forecastNum !== null ? forecastNum : previousNum;

      let bias: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';

      if (actualNum !== null && compareWith !== null) {
        const diff = actualNum - compareWith;
        // Use a small threshold to avoid noise
        const threshold = Math.abs(compareWith) * 0.01 || 0.01;

        const inverted = isInverted(event.title || '');

        if (Math.abs(diff) <= threshold) {
          bias = 'Neutral';
        } else if (inverted) {
          bias = diff < 0 ? 'Bullish' : 'Bearish';
        } else {
          bias = diff > 0 ? 'Bullish' : 'Bearish';
        }
      }

      biases[currency] = {
        bias,
        event: event.title || '',
        actual: event.actual || '',
        forecast: event.forecast || '',
        previous: event.previous || '',
        impact: event.impact || 'Medium',
        date: event.date || '',
      };
    }

    return new Response(JSON.stringify({ biases, fetchedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in fundamental-bias:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
