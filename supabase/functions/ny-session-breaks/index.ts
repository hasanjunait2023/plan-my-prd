import { fetchWithRotation } from '../_shared/apiKeyRotator.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
  return pair.includes('/') ? pair : `${pair.slice(0,3)}/${pair.slice(3)}`
}

function getLastNySessionWindow(): { start: string; end: string } {
  const now = new Date()
  const target = new Date(now)
  target.setUTCDate(target.getUTCDate() - 1)
  while (target.getUTCDay() === 0 || target.getUTCDay() === 6) {
    target.setUTCDate(target.getUTCDate() - 1)
  }
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

function determineBreakStatus(direction: 'BUY' | 'SELL', nyHigh: number, nyLow: number, currentPrice: number): PairResult['breakStatus'] {
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { pairs } = await req.json() as { pairs: PairInput[] }
    if (!pairs || pairs.length === 0) {
      return new Response(JSON.stringify({ pairs: [] }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const topPairs = pairs.slice(0, 8)
    const symbols = topPairs.map(p => toTwelveDataSymbol(p.pair)).join(',')
    const nyWindow = getLastNySessionWindow()

    const timeSeriesUrl = `${TWELVEDATA_BASE}/time_series?symbol=${encodeURIComponent(symbols)}&interval=1h&outputsize=120&apikey=__API_KEY__`
    const tsResponse = await fetchWithRotation(timeSeriesUrl, "twelvedata", sb, { maxWaitMs: 3000, waitChunkMs: 1500 })
    const tsData = await tsResponse.json()

    // Handle API key exhaustion gracefully
    if (tsData?.fallback === true) {
      console.log("All API keys temporarily unavailable for NY session breaks");
      const fallbackResults = topPairs.map(p => ({ pair: p.pair, direction: p.direction, nyHigh: null, nyLow: null, currentPrice: null, breakStatus: 'No Data' as const }));
      return new Response(JSON.stringify({ pairs: fallbackResults, warning: tsData.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const priceUrl = `${TWELVEDATA_BASE}/price?symbol=${encodeURIComponent(symbols)}&apikey=__API_KEY__`
    const priceResponse = await fetchWithRotation(priceUrl, "twelvedata", sb)
    const priceData = await priceResponse.json()

    if (priceData?.fallback === true) {
      console.log("All API keys temporarily unavailable for price fetch");
      const fallbackResults = topPairs.map(p => ({ pair: p.pair, direction: p.direction, nyHigh: null, nyLow: null, currentPrice: null, breakStatus: 'No Data' as const }));
      return new Response(JSON.stringify({ pairs: fallbackResults, warning: priceData.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const results: PairResult[] = topPairs.map((pairInput) => {
      const sym = toTwelveDataSymbol(pairInput.pair)
      let candles: any[] = []
      if (topPairs.length === 1) candles = tsData?.values || []
      else candles = tsData?.[sym]?.values || []

      const nyCandles = candles.filter((c: any) => c.datetime >= nyWindow.start && c.datetime <= nyWindow.end)

      if (nyCandles.length === 0) {
        return { pair: pairInput.pair, direction: pairInput.direction, nyHigh: null, nyLow: null, currentPrice: null, breakStatus: 'No Data' as const }
      }

      const nyHigh = Math.max(...nyCandles.map((c: any) => parseFloat(c.high)))
      const nyLow = Math.min(...nyCandles.map((c: any) => parseFloat(c.low)))

      let currentPrice: number | null = null
      if (topPairs.length === 1) currentPrice = priceData?.price ? parseFloat(priceData.price) : null
      else currentPrice = priceData?.[sym]?.price ? parseFloat(priceData[sym].price) : null

      const breakStatus = currentPrice !== null ? determineBreakStatus(pairInput.direction, nyHigh, nyLow, currentPrice) : 'No Data' as const

      return { pair: pairInput.pair, direction: pairInput.direction, nyHigh, nyLow, currentPrice, breakStatus }
    })

    return new Response(JSON.stringify({ pairs: results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('NY Session Breaks error:', error)
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
