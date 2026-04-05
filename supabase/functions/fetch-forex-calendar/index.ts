const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FF_CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

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

    const rawEvents = await response.json();

    // Parse and normalize events
    const events = rawEvents.map((e: any) => ({
      title: e.title || '',
      country: e.country || '',
      date: e.date || '',
      impact: e.impact || 'Low',
      forecast: e.forecast || '',
      previous: e.previous || '',
      actual: e.actual || '',
    }));

    return new Response(JSON.stringify({ events, fetchedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching FF calendar:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
