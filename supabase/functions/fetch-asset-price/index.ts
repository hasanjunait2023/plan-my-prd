const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYMBOL_MAP: Record<string, string> = {
  XAUUSD: 'GC=F',
  XAGUSD: 'SI=F',
  USOIL: 'CL=F',
  BTCUSD: 'BTC-USD',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get('symbol')?.toUpperCase();

    if (!symbol || !SYMBOL_MAP[symbol]) {
      return new Response(
        JSON.stringify({ error: 'Invalid symbol. Use: XAUUSD, XAGUSD, USOIL, BTCUSD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const yahooSymbol = SYMBOL_MAP[symbol];
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=2d&interval=1d`;

    const response = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance returned ${response.status}`);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      throw new Error('No data from Yahoo Finance');
    }

    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;

    const quote = result.indicators?.quote?.[0];
    const highs = quote?.high?.filter((v: number | null) => v !== null) || [];
    const lows = quote?.low?.filter((v: number | null) => v !== null) || [];
    const todayHigh = highs.length > 0 ? highs[highs.length - 1] : price;
    const todayLow = lows.length > 0 ? lows[lows.length - 1] : price;

    return new Response(
      JSON.stringify({
        symbol,
        price: Number(price.toFixed(symbol === 'BTCUSD' ? 2 : symbol === 'XAGUSD' ? 3 : 2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        todayHigh: Number(todayHigh.toFixed(2)),
        todayLow: Number(todayLow.toFixed(2)),
        currency: meta.currency || 'USD',
        marketState: meta.marketState || 'UNKNOWN',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('fetch-asset-price error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch price' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
