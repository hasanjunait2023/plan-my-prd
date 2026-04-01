import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors';

const ALL_PAIRS = [
  'EUR/USD','GBP/USD','AUD/USD','NZD/USD','USD/JPY','USD/CHF','USD/CAD',
  'EUR/GBP','EUR/JPY','EUR/AUD','EUR/NZD','EUR/CAD','EUR/CHF',
  'GBP/JPY','GBP/AUD','GBP/NZD','GBP/CAD','GBP/CHF',
  'AUD/JPY','AUD/NZD','AUD/CAD','AUD/CHF',
  'NZD/JPY','NZD/CAD','NZD/CHF',
  'CAD/JPY','CAD/CHF',
  'CHF/JPY'
];

const CURRENCIES = ['EUR','USD','GBP','JPY','AUD','NZD','CAD','CHF'];

// Split 28 pairs into groups of 4 (each group = 4 API credits, 7 groups total)
// With 15s between groups = ~105s total, well within 150s limit
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getCategory(score: number): string {
  if (score >= 7) return 'STRONG';
  if (score >= 4) return 'MID STRONG';
  if (score >= -3) return 'NEUTRAL';
  if (score >= -6) return 'MID WEAK';
  return 'WEAK';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const TWELVEDATA_API_KEY = Deno.env.get('TWELVEDATA_API_KEY');
  const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
  const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

  if (!TWELVEDATA_API_KEY || !OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing API keys' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const session: string = body.session || 'New York';

    console.log(`Starting market analysis for ${session} session...`);

    // Fetch all 28 pairs using batch requests (4 pairs per call, 15s between)
    // TwelveData batch: comma-separated symbols in one URL
    const pairChunks = chunkArray(ALL_PAIRS, 4);
    const allPairData: Array<{ pair: string; current_price: number; previous_close: number; change_percent: number }> = [];

    for (let g = 0; g < pairChunks.length; g++) {
      const chunk = pairChunks[g];
      const symbols = chunk.map(p => encodeURIComponent(p)).join(',');

      console.log(`[Group ${g + 1}/${pairChunks.length}] Fetching: ${chunk.join(', ')}`);

      try {
        const url = `https://api.twelvedata.com/time_series?symbol=${symbols}&interval=1h&outputsize=2&apikey=${TWELVEDATA_API_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();

        // When multiple symbols: data is keyed by symbol name
        // When single symbol: data has .values directly
        if (chunk.length === 1) {
          // Single symbol response
          const pair = chunk[0];
          if (data.values && data.values.length >= 2) {
            const current = parseFloat(data.values[0].close);
            const previous = parseFloat(data.values[1].close);
            const changePct = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
            allPairData.push({ pair, current_price: current, previous_close: previous, change_percent: changePct });
            console.log(`  ✓ ${pair}: ${current} (${changePct.toFixed(4)}%)`);
          } else {
            console.warn(`  ✗ ${pair}: ${data.status || data.message || 'no data'}`);
          }
        } else {
          // Multi-symbol response - keyed by symbol
          for (const pair of chunk) {
            const pairData = data[pair];
            if (pairData?.values && pairData.values.length >= 2) {
              const current = parseFloat(pairData.values[0].close);
              const previous = parseFloat(pairData.values[1].close);
              const changePct = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
              allPairData.push({ pair, current_price: current, previous_close: previous, change_percent: changePct });
              console.log(`  ✓ ${pair}: ${current} (${changePct.toFixed(4)}%)`);
            } else {
              console.warn(`  ✗ ${pair}: ${pairData?.status || pairData?.message || 'no data'}`);
            }
          }
        }
      } catch (err) {
        console.error(`  Group ${g + 1} fetch error: ${err}`);
      }

      // Wait 15s between groups to respect rate limit (except after last)
      if (g < pairChunks.length - 1) {
        console.log(`  Waiting 15s for rate limit...`);
        await sleep(15000);
      }
    }

    console.log(`Total pairs fetched: ${allPairData.length}/${ALL_PAIRS.length}`);

    if (allPairData.length < 5) {
      return new Response(JSON.stringify({
        error: 'Not enough data fetched',
        pairs_fetched: allPairData.length,
        message: 'TwelveData rate limit may be blocking. Try again in a few minutes.'
      }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate per-currency performance
    const currencyPerf: Record<string, { wins: number; losses: number; totalChange: number; pairCount: number }> = {};
    for (const c of CURRENCIES) {
      currencyPerf[c] = { wins: 0, losses: 0, totalChange: 0, pairCount: 0 };
    }

    for (const row of allPairData) {
      const [base, quote] = row.pair.split('/');
      const change = row.change_percent;

      if (currencyPerf[base]) {
        currencyPerf[base].pairCount++;
        currencyPerf[base].totalChange += change;
        if (change > 0) currencyPerf[base].wins++;
        else currencyPerf[base].losses++;
      }
      if (currencyPerf[quote]) {
        currencyPerf[quote].pairCount++;
        currencyPerf[quote].totalChange -= change;
        if (change < 0) currencyPerf[quote].wins++;
        else currencyPerf[quote].losses++;
      }
    }

    // Build prompt for OpenRouter
    const perfSummary = CURRENCIES.map(c => {
      const p = currencyPerf[c];
      return `${c}: wins=${p.wins}, losses=${p.losses}, avgChange=${(p.totalChange / (p.pairCount || 1)).toFixed(4)}%`;
    }).join('\n');

    const pairDetails = allPairData.map(r =>
      `${r.pair}: price=${r.current_price}, change=${r.change_percent.toFixed(4)}%`
    ).join('\n');

    const prompt = `You are a forex analyst. Based on this REAL-TIME cross-pair performance data, assign each currency a strength score from -10 to +10.

Categories:
- STRONG: +7 to +10
- MID STRONG: +4 to +6
- NEUTRAL: -3 to +3
- MID WEAK: -6 to -4
- WEAK: -10 to -7

Currency Performance Summary:
${perfSummary}

Individual Pair Data:
${pairDetails}

Return ONLY a JSON array with exactly 8 objects, one per currency:
[{"currency":"EUR","strength":5,"category":"MID STRONG"},...]

No explanation, just the JSON array.`;

    console.log('Calling OpenRouter AI...');

    const aiResp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-maverick:free',
        messages: [
          { role: 'system', content: 'You are a forex market analyst. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      })
    });

    const aiData = await aiResp.json();
    let aiContent = aiData.choices?.[0]?.message?.content || '';

    console.log('AI raw response:', aiContent.substring(0, 500));

    // Parse AI response
    let strengthResults: Array<{ currency: string; strength: number; category: string }> = [];

    try {
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        strengthResults = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error('AI response parse error:', parseErr);
    }

    // Validate and fix categories
    strengthResults = strengthResults.map(r => ({
      currency: r.currency,
      strength: Math.max(-10, Math.min(10, Math.round(r.strength))),
      category: getCategory(r.strength)
    }));

    // Fallback: if AI didn't return all 8 currencies, calculate manually
    if (strengthResults.length < 8) {
      console.warn('AI returned incomplete data, using manual calculation...');
      strengthResults = CURRENCIES.map(c => {
        const p = currencyPerf[c];
        const avgChange = p.totalChange / (p.pairCount || 1);
        const score = Math.max(-10, Math.min(10, Math.round(avgChange * 20)));
        return { currency: c, strength: score, category: getCategory(score) };
      });
    }

    console.log('Final strength results:', JSON.stringify(strengthResults));

    // Insert into currency_strength table
    const now = new Date().toISOString();
    const insertRows = strengthResults.map(r => ({
      currency: r.currency,
      strength: r.strength,
      category: r.category,
      timeframe: session,
      recorded_at: now,
    }));

    const { error: strengthErr } = await supabase.from('currency_strength').insert(insertRows);
    if (strengthErr) {
      console.error('Strength insert error:', strengthErr);
    }

    // Send Telegram Alert
    if (BOT_TOKEN) {
      try {
        const { data: settings } = await supabase
          .from('alert_settings')
          .select('telegram_chat_id')
          .limit(1)
          .single();

        if (settings?.telegram_chat_id) {
          const sorted = [...strengthResults].sort((a, b) => b.strength - a.strength);
          const strong = sorted.filter(r => r.category === 'STRONG').map(r => `${r.currency} (${r.strength > 0 ? '+' : ''}${r.strength})`).join(', ');
          const midStrong = sorted.filter(r => r.category === 'MID STRONG').map(r => `${r.currency} (${r.strength > 0 ? '+' : ''}${r.strength})`).join(', ');
          const neutral = sorted.filter(r => r.category === 'NEUTRAL').map(r => `${r.currency} (${r.strength > 0 ? '+' : ''}${r.strength})`).join(', ');
          const midWeak = sorted.filter(r => r.category === 'MID WEAK').map(r => `${r.currency} (${r.strength > 0 ? '+' : ''}${r.strength})`).join(', ');
          const weak = sorted.filter(r => r.category === 'WEAK').map(r => `${r.currency} (${r.strength > 0 ? '+' : ''}${r.strength})`).join(', ');

          const strongest = sorted[0];
          const weakest = sorted[sorted.length - 1];
          const bestBuy = `${strongest.currency}/${weakest.currency} BUY`;
          const bestSell = `${weakest.currency}/${strongest.currency} SELL`;

          let msg = `🧠 <b>Market Strength — ${session} Session</b>\n━━━━━━━━━━━━━━━━━━━\n`;
          if (strong) msg += `💪 STRONG: ${strong}\n`;
          if (midStrong) msg += `📈 MID STRONG: ${midStrong}\n`;
          if (neutral) msg += `⚖️ NEUTRAL: ${neutral}\n`;
          if (midWeak) msg += `📉 MID WEAK: ${midWeak}\n`;
          if (weak) msg += `💀 WEAK: ${weak}\n`;
          msg += `━━━━━━━━━━━━━━━━━━━\n🏆 Best: ${bestBuy} | ${bestSell}`;

          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: settings.telegram_chat_id, text: msg, parse_mode: 'HTML' }),
          });
          console.log('Telegram alert sent');
        }
      } catch (tgErr) {
        console.error('Telegram error:', tgErr);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      session,
      results: strengthResults,
      pairs_total: allPairData.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
