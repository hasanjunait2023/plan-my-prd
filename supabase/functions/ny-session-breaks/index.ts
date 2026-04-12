const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TWELVEDATA_BASE = 'https://api.twelvedata.com'

interface PairInput {
  pair: string
  direction: 'BUY' | 'SELL'
}

interface PairResult {
  pair: string
  direction: 'BUY' | 'SELL'
  nyHigh: number | null
  nyLow: number | null
  currentPrice: number | null
  breakStatus: 'HH Break' | 'LL Break' | 'In Range' | 'Counter Move' | 'No Data'
}

function toTwelveDataSymbol(pair: string): string {
  // TwelveData forex uses EUR/USD format
  return pair.includes('/') ? pair : `${pair.slice(0,3)}/${pair.slice(3)}`
}

function getLastNySessionWindow(): { start: string; end: string } {
  const now = new Date()
  // Find last weekday (Mon-Fri) — skip weekends
  const target = new Date(now)
  target.setUTCDate(target.getUTCDate() - 1) // start from yesterday
  
  // Walk back to find a weekday (0=Sun, 6=Sat)
  while (target.getUTCDay() === 0 || target.getUTCDay() === 6) {
    target.setUTCDate(target.getUTCDate() - 1)
  }
  
  // NY session: 13:00-22:00 UTC on that weekday
  const start = new Date(target)
  start.setUTCHours(13, 0, 0, 0)
  
  const end = new Date(target)
  end.setUTCHours(22, 0, 0, 0)
  
  console.log(`NY session window: ${start.toISOString()} to ${end.toISOString()}`)
  
  return {
    start: start.toISOString().replace('T', ' ').substring(0, 19),
    end: end.toISOString().replace('T', ' ').substring(0, 19),
  }
}

function determineBreakStatus(
  direction: 'BUY' | 'SELL',
  nyHigh: number,
  nyLow: number,
  currentPrice: number
): PairResult['breakStatus'] {
  if (direction === 'BUY') {
    if (currentPrice > nyHigh) return 'HH Break'
    if (currentPrice < nyLow) return 'Counter Move'
    return 'In Range'
  } else {
    if (currentPrice < nyLow) return 'LL Break'
    if (currentPrice > nyHigh) return 'Counter Move'
    return 'In Range'
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const TWELVEDATA_API_KEY = Deno.env.get('TWELVEDATA_API_KEY')
    if (!TWELVEDATA_API_KEY) {
      return new Response(JSON.stringify({ error: 'TWELVEDATA_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { pairs } = await req.json() as { pairs: PairInput[] }
    if (!pairs || pairs.length === 0) {
      return new Response(JSON.stringify({ pairs: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Limit to top 8 pairs
    const topPairs = pairs.slice(0, 8)
    const symbols = topPairs.map(p => toTwelveDataSymbol(p.pair)).join(',')
    const nyWindow = getLastNySessionWindow()

    // Fetch 1h candles — increase outputsize to cover weekends (up to 120h = 5 days back)
    const timeSeriesUrl = `${TWELVEDATA_BASE}/time_series?symbol=${symbols}&interval=1h&outputsize=120&apikey=${TWELVEDATA_API_KEY}`
    const tsResponse = await fetch(timeSeriesUrl)
    const tsData = await tsResponse.json()
    console.log(`time_series status for ${symbols}:`, tsData?.status || 'ok', 'values count:', topPairs.length === 1 ? tsData?.values?.length : 'multi')

    // Fetch current prices (on weekends this returns last known price)
    const priceUrl = `${TWELVEDATA_BASE}/price?symbol=${symbols}&apikey=${TWELVEDATA_API_KEY}`
    const priceResponse = await fetch(priceUrl)
    const priceData = await priceResponse.json()
    console.log(`price data for ${symbols}:`, JSON.stringify(priceData).substring(0, 200))

    const results: PairResult[] = topPairs.map((pairInput) => {
      const sym = toTwelveDataSymbol(pairInput.pair)
      
      // Get candle data - handle single vs multi symbol response
      let candles: any[] = []
      if (topPairs.length === 1) {
        candles = tsData?.values || []
      } else {
        candles = tsData?.[sym]?.values || []
      }

      // Filter NY session candles (13:00-22:00 UTC yesterday)
      const nyCandles = candles.filter((c: any) => {
        const dt = c.datetime
        return dt >= nyWindow.start && dt <= nyWindow.end
      })

      if (nyCandles.length === 0) {
        return {
          pair: pairInput.pair,
          direction: pairInput.direction,
          nyHigh: null,
          nyLow: null,
          currentPrice: null,
          breakStatus: 'No Data' as const,
        }
      }

      const nyHigh = Math.max(...nyCandles.map((c: any) => parseFloat(c.high)))
      const nyLow = Math.min(...nyCandles.map((c: any) => parseFloat(c.low)))

      // Get current price
      let currentPrice: number | null = null
      if (topPairs.length === 1) {
        currentPrice = priceData?.price ? parseFloat(priceData.price) : null
      } else {
        currentPrice = priceData?.[sym]?.price ? parseFloat(priceData[sym].price) : null
      }

      const breakStatus = currentPrice !== null
        ? determineBreakStatus(pairInput.direction, nyHigh, nyLow, currentPrice)
        : 'No Data' as const

      return {
        pair: pairInput.pair,
        direction: pairInput.direction,
        nyHigh,
        nyLow,
        currentPrice,
        breakStatus,
      }
    })

    return new Response(JSON.stringify({ pairs: results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('NY Session Breaks error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
