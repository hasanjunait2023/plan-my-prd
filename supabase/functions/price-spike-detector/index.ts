import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

const MAJOR_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'USD/CAD', 'AUD/USD', 'NZD/USD',
  'XAU/USD', 'BTC/USD', 'ETH/USD'
];

// Split into groups of max 8 pairs each (TwelveData free: 8 credits/min)
const GROUP_A = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'USD/CAD', 'AUD/USD', 'NZD/USD', 'XAU/USD']; // forex majors + gold
const GROUP_B = ['BTC/USD', 'ETH/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'NZD/JPY', 'CAD/JPY']; // crypto + crosses 1
const GROUP_C = ['CHF/JPY', 'EUR/AUD', 'GBP/AUD', 'EUR/CAD', 'GBP/CHF', 'EUR/CHF', 'AUD/NZD', 'EUR/NZD']; // crosses 2
const GROUP_D = ['GBP/NZD', 'AUD/CAD', 'GBP/CAD', 'NZD/CAD', 'NZD/CHF', 'AUD/CHF']; // crosses 3

const ALL_GROUPS = [GROUP_A, GROUP_B, GROUP_C, GROUP_D];
const ALL_PAIRS = [...GROUP_A, ...GROUP_B, ...GROUP_C, ...GROUP_D];

function getPairCategory(pair: string): 'major' | 'cross' | 'gold' {
  if (['XAU/USD', 'BTC/USD', 'ETH/USD'].includes(pair)) return 'gold'; // gold/crypto use same threshold
  if (MAJOR_PAIRS.includes(pair)) return 'major';
  return 'cross';
}

function isMajor(pair: string): boolean {
  return MAJOR_PAIRS.includes(pair);
}

function calcPips(pair: string, prev: number, curr: number): number {
  const diff = curr - prev;
  if (pair.includes('JPY')) return Math.round(diff * 100);
  if (pair === 'XAU/USD') return Math.round(diff * 10);
  return Math.round(diff * 10000);
}

function getBdDateTime(): { time: string; date: string; full: string } {
  const now = new Date();
  const time = now.toLocaleString('en-US', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).toUpperCase();
  const date = now.toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return { time, date, full: `${date}, ${time}` };
}

function isWeekend(): boolean {
  const now = new Date();
  const bdDay = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })).getDay();
  return bdDay === 6 || bdDay === 0;
}

interface SpikedPair {
  pair: string;
  change: number;
  prev: number;
  curr: number;
  direction: 'BULLISH' | 'BEARISH';
  pips: number;
  category: 'major' | 'cross' | 'gold';
}

function buildGroupedMessage(spikes: SpikedPair[], direction: string): string {
  const majors = spikes.filter(s => isMajor(s.pair));
  const others = spikes.filter(s => !isMajor(s.pair));
  const count = spikes.length;
  const bd = getBdDateTime();

  let urgency: string;
  let header: string;
  if (count >= 4) {
    urgency = '🔴🔴🔴';
    header = 'CRITICAL MULTI-PAIR SPIKE';
  } else {
    urgency = '🟡🟡';
    header = 'MULTI-PAIR SPIKE';
  }

  const dirEmoji = direction === 'BULLISH' ? '📈' : '📉';
  const dirLabel = direction === 'BULLISH'
    ? '*🟢 BULLISH ▲ — Price বেড়েছে*'
    : '*🔴 BEARISH ▼ — Price কমেছে*';

  let msg = `${urgency} ${header} ${urgency}\n\n`;
  msg += `⚡ ${count} pairs moving together!\n`;
  msg += `${dirLabel}\n\n`;

  if (majors.length > 0) {
    msg += `📊 Major Pairs:\n`;
    for (const s of majors) {
      const sign = s.change > 0 ? '+' : '';
      const pipSign = s.pips > 0 ? '+' : '';
      msg += `  ${dirEmoji} *${s.pair}* ${sign}${s.change.toFixed(2)}% | ${s.prev} → ${s.curr} (${pipSign}${s.pips} pips)\n`;
    }
    msg += '\n';
  }

  if (others.length > 0) {
    msg += `📋 Also moving:\n  `;
    msg += others.map(s => {
      const sign = s.change > 0 ? '+' : '';
      return `${s.pair} ${sign}${s.change.toFixed(2)}%`;
    }).join(' | ');
    msg += '\n\n';
  }

  msg += `⏰ 🇧🇩 *${bd.full}* BST\n`;
  msg += `⚠️ Possible: News event / Central bank action\n`;
  msg += `🎯 Check economic calendar NOW`;

  return msg;
}

function buildSingleMessage(s: SpikedPair): string {
  const bd = getBdDateTime();
  const sign = s.change > 0 ? '+' : '';
  const pipSign = s.pips > 0 ? '+' : '';
  const dirEmoji = s.direction === 'BULLISH' ? '📈' : '📉';
  const dirLabel = s.direction === 'BULLISH'
    ? '*🟢 BULLISH ▲ — Price বেড়েছে*'
    : '*🔴 BEARISH ▼ — Price কমেছে*';

  let urgency: string;
  let label: string;
  if (Math.abs(s.change) >= 0.30) {
    urgency = '🔴🔴🔴 CRITICAL SPIKE 🔴🔴🔴';
    label = '⚠️ EXTREME volatility detected!';
  } else if (Math.abs(s.change) >= 0.20) {
    urgency = '🟡 HIGH SPIKE ALERT';
    label = '💡 Monitor for continuation or reversal';
  } else {
    urgency = '🟠 Spike Detected';
    label = '💡 Watch for follow-through';
  }

  return `${urgency}\n\n📊 *${s.pair}* — ${sign}${s.change.toFixed(2)}% move!\n${dirEmoji} ${s.prev} → ${s.curr} (${pipSign}${s.pips} pips)\n${dirLabel}\n\n⏰ 🇧🇩 *${bd.full}* BST\n\n${label}`;
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';

    if (!force && isWeekend()) {
      return new Response(JSON.stringify({ ok: true, skipped: 'weekend' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const twelveDataKey = Deno.env.get('TWELVEDATA_API_KEY');
    if (!twelveDataKey) throw new Error('TWELVEDATA_API_KEY not set');

    // Determine which group to fetch (override with ?group=0..3, else rotate by minute)
    const groupParam = url.searchParams.get('group');
    const minuteNow = new Date().getMinutes();
    const groupIndex = groupParam !== null ? parseInt(groupParam) : Math.floor(minuteNow / 2) % ALL_GROUPS.length;
    const pairsToFetch = ALL_GROUPS[Math.min(groupIndex, ALL_GROUPS.length - 1)];

    console.log(`Fetching group ${groupIndex} (${pairsToFetch.length} pairs): ${pairsToFetch.join(', ')}`);

    // Fetch thresholds
    const { data: thresholds } = await supabase.from('spike_thresholds').select('*');
    const thresholdMap: Record<string, { percent: number; cooldown: number }> = {};
    for (const t of thresholds || []) {
      thresholdMap[t.category] = { percent: t.threshold_percent, cooldown: t.cooldown_minutes };
    }
    if (!thresholdMap.major) thresholdMap.major = { percent: 0.15, cooldown: 5 };
    if (!thresholdMap.cross) thresholdMap.cross = { percent: 0.20, cooldown: 5 };
    if (!thresholdMap.gold) thresholdMap.gold = { percent: 0.30, cooldown: 5 };

    // Fetch current prices from TwelveData (single batch, max 8 pairs)
    const symbols = pairsToFetch.join(',');
    const priceRes = await fetch(`https://api.twelvedata.com/price?symbol=${symbols}&apikey=${twelveDataKey}`);
    const priceData = await priceRes.json();

    if (priceData.code === 429) {
      console.log('Rate limited by TwelveData');
      return new Response(JSON.stringify({ ok: false, error: 'Rate limited', retryAfter: 60 }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentPrices: Record<string, number> = {};
    if (pairsToFetch.length === 1) {
      if (priceData.price) currentPrices[pairsToFetch[0]] = parseFloat(priceData.price);
    } else {
      for (const pair of pairsToFetch) {
        const val = priceData[pair]?.price;
        if (val) currentPrices[pair] = parseFloat(val);
      }
    }

    console.log(`Fetched ${Object.keys(currentPrices).length} prices`);

    if (Object.keys(currentPrices).length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'No prices fetched', apiResponse: priceData }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get previous snapshots for these pairs
    const { data: snapshots } = await supabase
      .from('price_snapshots')
      .select('*')
      .in('pair', pairsToFetch);
    const snapshotMap: Record<string, number> = {};
    for (const s of snapshots || []) {
      snapshotMap[s.pair] = Number(s.price);
    }

    // Detect spikes
    const spikedPairs: SpikedPair[] = [];
    for (const pair of pairsToFetch) {
      const curr = currentPrices[pair];
      const prev = snapshotMap[pair];
      if (!curr || !prev) continue;

      const change = ((curr - prev) / prev) * 100;
      const category = getPairCategory(pair);
      const threshold = thresholdMap[category];

      if (Math.abs(change) >= threshold.percent) {
        spikedPairs.push({
          pair,
          change,
          prev,
          curr,
          direction: change > 0 ? 'BULLISH' : 'BEARISH',
          pips: calcPips(pair, prev, curr),
          category,
        });
      }
    }

    // Send alerts if spikes detected
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');

    if (spikedPairs.length > 0 && LOVABLE_API_KEY && TELEGRAM_API_KEY) {
      const { data: alertSettings } = await supabase.from('alert_settings').select('telegram_chat_id').limit(1).single();
      const chatId = alertSettings?.telegram_chat_id;

      if (chatId) {
        // Check cooldown
        const cooldownMinutes = Math.min(...Object.values(thresholdMap).map(t => t.cooldown));
        const cooldownTime = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();

        const { data: recentAlerts } = await supabase
          .from('alert_log')
          .select('pair, metadata')
          .eq('alert_type', 'spike_alert')
          .gte('sent_at', cooldownTime);

        const recentPairs = new Set<string>();
        for (const a of recentAlerts || []) {
          if (a.pair) recentPairs.add(a.pair);
          const meta = a.metadata as any;
          if (meta?.pairs) for (const p of meta.pairs) recentPairs.add(p);
        }

        const filteredSpikes = spikedPairs.filter(s => !recentPairs.has(s.pair));

        if (filteredSpikes.length >= 2) {
          const bullish = filteredSpikes.filter(s => s.direction === 'BULLISH');
          const bearish = filteredSpikes.filter(s => s.direction === 'BEARISH');

          for (const group of [bullish, bearish]) {
            if (group.length === 0) continue;
            const direction = group[0].direction;
            const message = group.length >= 2 ? buildGroupedMessage(group, direction) : buildSingleMessage(group[0]);

            await fetch(`${GATEWAY_URL}/sendMessage`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'X-Connection-Api-Key': TELEGRAM_API_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
            });

            await supabase.from('alert_log').insert({
              alert_type: 'spike_alert',
              pair: group.length === 1 ? group[0].pair : null,
              message,
              metadata: {
                type: group.length >= 2 ? 'multi' : 'single',
                pairs: group.map(s => s.pair),
                direction,
                urgency: group.length >= 4 ? 'CRITICAL' : group.length >= 2 ? 'HIGH' : 'MEDIUM',
                details: group.map(s => ({ pair: s.pair, change: s.change, prev: s.prev, curr: s.curr, pips: s.pips })),
              },
            });
          }
        } else if (filteredSpikes.length === 1) {
          const s = filteredSpikes[0];
          const message = buildSingleMessage(s);

          await fetch(`${GATEWAY_URL}/sendMessage`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'X-Connection-Api-Key': TELEGRAM_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
          });

          await supabase.from('alert_log').insert({
            alert_type: 'spike_alert',
            pair: s.pair,
            message,
            metadata: {
              type: 'single',
              pairs: [s.pair],
              direction: s.direction,
              urgency: Math.abs(s.change) >= 0.30 ? 'CRITICAL' : Math.abs(s.change) >= 0.20 ? 'HIGH' : 'MEDIUM',
              details: [{ pair: s.pair, change: s.change, prev: s.prev, curr: s.curr, pips: s.pips }],
            },
          });
        }
      }
    }

    // Upsert snapshots
    const upsertRows = pairsToFetch
      .filter(pair => currentPrices[pair])
      .map(pair => ({
        pair,
        price: currentPrices[pair],
        previous_price: snapshotMap[pair] || null,
        updated_at: new Date().toISOString(),
      }));

    if (upsertRows.length > 0) {
      await supabase.from('price_snapshots').upsert(upsertRows, { onConflict: 'pair' });
    }

    return new Response(JSON.stringify({
      ok: true,
      group: groupIndex,
      checked: Object.keys(currentPrices).length,
      spikes: spikedPairs.length,
      pairs: spikedPairs.map(s => s.pair),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Price spike detector error:', error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
