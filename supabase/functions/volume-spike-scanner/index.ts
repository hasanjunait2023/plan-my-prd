import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

// Same groups as price-spike-detector
const GROUP_A = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'USD/CAD', 'AUD/USD', 'NZD/USD', 'XAU/USD'];
const GROUP_B = ['BTC/USD', 'ETH/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'NZD/JPY', 'CAD/JPY'];
const GROUP_C = ['CHF/JPY', 'EUR/AUD', 'GBP/AUD', 'EUR/CAD', 'GBP/CHF', 'EUR/CHF', 'AUD/NZD', 'EUR/NZD'];
const GROUP_D = ['GBP/NZD', 'AUD/CAD', 'GBP/CAD', 'NZD/CAD', 'NZD/CHF', 'AUD/CHF'];

const ALL_GROUPS = [GROUP_A, GROUP_B, GROUP_C, GROUP_D];

function isWeekend(): boolean {
  const now = new Date();
  const bdDay = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })).getDay();
  return bdDay === 6 || bdDay === 0;
}

function getBdDateTime(): { time: string; date: string; full: string } {
  const now = new Date();
  const time = now.toLocaleString('en-US', {
    timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true,
  }).toUpperCase();
  const date = now.toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric',
  });
  return { time, date, full: `${date}, ${time}` };
}

interface VolumeSpike {
  pair: string;
  volume: number;
  avgVolume: number;
  spikeRatio: number;
  intensity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  direction: 'BULLISH' | 'BEARISH';
  close: number;
  open: number;
  time: string;
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

    // Determine group — use odd minutes (even minutes = price-spike-detector)
    const groupParam = url.searchParams.get('group');
    const minuteNow = new Date().getMinutes();
    const groupIndex = groupParam !== null
      ? parseInt(groupParam)
      : Math.floor(minuteNow / 2) % ALL_GROUPS.length;
    const pairsToFetch = ALL_GROUPS[Math.min(groupIndex, ALL_GROUPS.length - 1)];

    console.log(`Volume scan group ${groupIndex}: ${pairsToFetch.join(', ')}`);

    const spikes: VolumeSpike[] = [];

    // Fetch time_series for each pair (batch not supported for time_series)
    // Process sequentially to respect rate limits, but limit to 8 pairs max
    for (const pair of pairsToFetch) {
      try {
        const tsUrl = `https://api.twelvedata.com/time_series?symbol=${pair}&interval=5min&outputsize=25&apikey=${twelveDataKey}`;
        const res = await fetch(tsUrl);
        const data = await res.json();

        if (data.code === 429) {
          console.log(`Rate limited at ${pair}, stopping`);
          break;
        }

        if (!data.values || data.values.length < 21) {
          console.log(`Insufficient data for ${pair}: ${data.values?.length || 0} bars`);
          continue;
        }

        // values[0] = most recent bar
        const bars = data.values;
        const currentBar = bars[0];
        const currentVolume = parseInt(currentBar.volume);

        if (!currentVolume || currentVolume === 0) {
          continue; // No volume data for this pair
        }

        // Calculate average of bars[1..20]
        let totalVol = 0;
        let volCount = 0;
        for (let i = 1; i <= 20 && i < bars.length; i++) {
          const v = parseInt(bars[i].volume);
          if (v > 0) {
            totalVol += v;
            volCount++;
          }
        }

        if (volCount < 10) continue; // Not enough volume data

        const avgVolume = totalVol / volCount;
        const spikeRatio = currentVolume / avgVolume;

        if (spikeRatio >= 2.0) {
          const closePrice = parseFloat(currentBar.close);
          const openPrice = parseFloat(currentBar.open);
          const direction: 'BULLISH' | 'BEARISH' = closePrice >= openPrice ? 'BULLISH' : 'BEARISH';

          let intensity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
          if (spikeRatio >= 5.0) intensity = 'CRITICAL';
          else if (spikeRatio >= 3.0) intensity = 'HIGH';
          else intensity = 'MEDIUM';

          spikes.push({
            pair,
            volume: currentVolume,
            avgVolume: Math.round(avgVolume),
            spikeRatio: Math.round(spikeRatio * 100) / 100,
            intensity,
            direction,
            close: closePrice,
            open: openPrice,
            time: currentBar.datetime,
          });
        }
      } catch (pairErr) {
        console.error(`Error fetching ${pair}:`, pairErr);
      }
    }

    console.log(`Found ${spikes.length} volume spikes`);

    // Insert alerts and notify
    if (spikes.length > 0) {
      // Check cooldown (5 min)
      const cooldownTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentAlerts } = await supabase
        .from('alert_log')
        .select('pair, metadata')
        .eq('alert_type', 'volume_spike')
        .gte('sent_at', cooldownTime);

      const recentPairs = new Set<string>();
      for (const a of recentAlerts || []) {
        if (a.pair) recentPairs.add(a.pair);
      }

      const newSpikes = spikes.filter(s => !recentPairs.has(s.pair));

      if (newSpikes.length > 0) {
        // Insert each spike into alert_log
        for (const s of newSpikes) {
          await supabase.from('alert_log').insert({
            alert_type: 'volume_spike',
            pair: s.pair,
            message: `🔊 Volume Spike: ${s.pair} — ${s.spikeRatio}x average (${s.intensity})`,
            metadata: {
              volume: s.volume,
              avgVolume: s.avgVolume,
              spikeRatio: s.spikeRatio,
              intensity: s.intensity,
              direction: s.direction,
              close: s.close,
              open: s.open,
              candleTime: s.time,
            },
          });
        }

        // Telegram notification
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');

        if (LOVABLE_API_KEY && TELEGRAM_API_KEY) {
          const { data: alertSettings } = await supabase
            .from('alert_settings')
            .select('telegram_chat_id')
            .limit(1)
            .single();

          const chatId = alertSettings?.telegram_chat_id;
          if (chatId) {
            const bd = getBdDateTime();
            let msg = `🔊 *VOLUME SPIKE ALERT* 🔊\n\n`;
            for (const s of newSpikes) {
              const dirEmoji = s.direction === 'BULLISH' ? '📈' : '📉';
              const intensityEmoji = s.intensity === 'CRITICAL' ? '🔴' : s.intensity === 'HIGH' ? '🟡' : '🟠';
              msg += `${intensityEmoji} *${s.pair}* — ${s.spikeRatio}x avg volume\n`;
              msg += `  ${dirEmoji} Vol: ${s.volume.toLocaleString()} (avg: ${s.avgVolume.toLocaleString()})\n`;
              msg += `  Direction: ${s.direction}\n\n`;
            }
            msg += `⏰ 🇧🇩 *${bd.full}* BST`;

            await fetch(`${GATEWAY_URL}/sendMessage`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'X-Connection-Api-Key': TELEGRAM_API_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' }),
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      group: groupIndex,
      checked: pairsToFetch.length,
      spikes: spikes.length,
      spikeDetails: spikes.map(s => ({ pair: s.pair, ratio: s.spikeRatio, intensity: s.intensity, direction: s.direction })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Volume spike scanner error:', error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
