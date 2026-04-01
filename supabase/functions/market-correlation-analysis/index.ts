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

const BATCH_1_PAIRS = ALL_PAIRS.slice(0, 14);
const BATCH_2_PAIRS = ALL_PAIRS.slice(14);

const CURRENCIES = ['EUR','USD','GBP','JPY','AUD','NZD','CAD','CHF'];

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
    const batch = body.batch || 1;
    const session = body.session || 'New York';
    const scanId = body.scan_id || crypto.randomUUID();

    const pairs = batch === 1 ? BATCH_1_PAIRS : BATCH_2_PAIRS;

    console.log(`Starting batch ${batch}, scan_id: ${scanId}, pairs: ${pairs.length}`);

    // Phase A: Fetch real-time data from TwelveData sequentially
    const pairData: Array<{ pair: string; current_price: number; previous_close: number; change_percent: number }> = [];

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const symbol = pair.replace('/', '');

      try {
        const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1h&outputsize=2&apikey=${TWELVEDATA_API_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.values && data.values.length >= 2) {
          const current = parseFloat(data.values[0].close);
          const previous = parseFloat(data.values[1].close);
          const changePct = previous !== 0 ? ((current - previous) / previous) * 100 : 0;

          pairData.push({
            pair,
            current_price: current,
            previous_close: previous,
            change_percent: changePct
          });
          console.log(`[${i + 1}/${pairs.length}] ${pair}: ${current} (${changePct.toFixed(4)}%)`);
        } else {
          console.warn(`[${i + 1}/${pairs.length}] ${pair}: No data - ${JSON.stringify(data.status || data.message || 'unknown')}`);
        }
      } catch (err) {
        console.error(`[${i + 1}/${pairs.length}] ${pair}: Fetch error - ${err}`);
      }

      // Rate limit: wait 8s between calls (except after last)
      if (i < pairs.length - 1) {
        await sleep(8000);
      }
    }

    // Store batch data in temp table
    if (pairData.length > 0) {
      const rows = pairData.map(p => ({
        scan_id: scanId,
        pair: p.pair,
        current_price: p.current_price,
        previous_close: p.previous_close,
        change_percent: p.change_percent,
      }));

      const { error: insertErr } = await supabase.from('market_scan_temp').insert(rows);
      if (insertErr) {
        console.error('Temp insert error:', insertErr);
      }
    }

    // If batch 1, return scan_id for batch 2
    if (batch === 1) {
      return new Response(JSON.stringify({
        ok: true,
        batch: 1,
        scan_id: scanId,
        pairs_fetched: pairData.length,
        message: 'Batch 1 complete. Call batch 2 now.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Phase B (Batch 2 only): Merge all data and run AI analysis
    console.log('Batch 2: Fetching all temp data...');

    const { data: allTempData, error: tempErr } = await supabase
      .from('market_scan_temp')
      .select('*')
      .eq('scan_id', scanId);

    if (tempErr || !allTempData?.length) {
      return new Response(JSON.stringify({ error: 'No temp data found', details: tempErr }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Total pairs collected: ${allTempData.length}`);

    // Calculate per-currency performance from cross-pair data
    const currencyPerf: Record<string, { wins: number; losses: number; totalChange: number; pairCount: number }> = {};
    for (const c of CURRENCIES) {
      currencyPerf[c] = { wins: 0, losses: 0, totalChange: 0, pairCount: 0 };
    }

    for (const row of allTempData) {
      const [base, quote] = row.pair.split('/');
      const change = Number(row.change_percent);

      if (currencyPerf[base]) {
        currencyPerf[base].pairCount++;
        currencyPerf[base].totalChange += change;
        if (change > 0) currencyPerf[base].wins++;
        else currencyPerf[base].losses++;
      }
      if (currencyPerf[quote]) {
        currencyPerf[quote].pairCount++;
        currencyPerf[quote].totalChange -= change; // inverse for quote
        if (change < 0) currencyPerf[quote].wins++;
        else currencyPerf[quote].losses++;
      }
    }

    // Build prompt for OpenRouter
    const perfSummary = CURRENCIES.map(c => {
      const p = currencyPerf[c];
      return `${c}: wins=${p.wins}, losses=${p.losses}, avgChange=${(p.totalChange / (p.pairCount || 1)).toFixed(4)}%`;
    }).join('\n');

    const pairDetails = allTempData.map(r =>
      `${r.pair}: price=${r.current_price}, change=${Number(r.change_percent).toFixed(4)}%`
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

    // Parse AI response - extract JSON array
    let strengthResults: Array<{ currency: string; strength: number; category: string }> = [];

    try {
      // Try to find JSON array in response
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
        // Normalize to -10 to +10 scale (assuming max change ~0.5%)
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

    // Clean up temp data
    await supabase.from('market_scan_temp').delete().eq('scan_id', scanId);

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

          // Find best pair suggestions
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
      batch: 2,
      session,
      results: strengthResults,
      pairs_total: allTempData.length,
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
