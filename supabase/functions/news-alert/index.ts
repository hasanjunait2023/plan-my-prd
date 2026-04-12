import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FF_CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

const CURRENCY_PAIRS: Record<string, string[]> = {
  USD: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'USD/CAD', 'AUD/USD', 'NZD/USD'],
  EUR: ['EUR/USD', 'EUR/GBP', 'EUR/JPY', 'EUR/CHF', 'EUR/AUD'],
  GBP: ['GBP/USD', 'EUR/GBP', 'GBP/JPY', 'GBP/AUD'],
  JPY: ['USD/JPY', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY'],
  AUD: ['AUD/USD', 'AUD/JPY', 'EUR/AUD', 'GBP/AUD', 'AUD/NZD'],
  NZD: ['NZD/USD', 'AUD/NZD', 'NZD/JPY'],
  CAD: ['USD/CAD', 'CAD/JPY', 'EUR/CAD'],
  CHF: ['USD/CHF', 'EUR/CHF', 'GBP/CHF'],
};

const GOLD_MOVING_KEYWORDS = [
  'non-farm', 'nonfarm', 'nfp', 'cpi', 'consumer price',
  'interest rate', 'federal funds', 'fomc', 'monetary policy',
  'inflation', 'ppi', 'producer price', 'gdp', 'retail sales',
  'unemployment', 'average hourly earnings',
];

const COUNTRY_CURRENCY: Record<string, string> = {
  USD: 'USD', EUR: 'EUR', GBP: 'GBP', JPY: 'JPY',
  AUD: 'AUD', NZD: 'NZD', CAD: 'CAD', CHF: 'CHF',
};

const COUNTRY_FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
  AUD: '🇦🇺', NZD: '🇳🇿', CAD: '🇨🇦', CHF: '🇨🇭',
};

function isGoldMover(title: string): boolean {
  const lower = title.toLowerCase();
  return GOLD_MOVING_KEYWORDS.some(kw => lower.includes(kw));
}

function getAffectedPairs(currency: string, title: string): string[] {
  const pairs = CURRENCY_PAIRS[currency] || [];
  const result = [...new Set(pairs)];
  if (isGoldMover(title)) {
    if (!result.includes('XAU/USD')) result.push('XAU/USD');
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get Telegram config
    const { data: alertSettings } = await supabase
      .from('alert_settings')
      .select('telegram_chat_id')
      .limit(1)
      .single();

    const chatId = alertSettings?.telegram_chat_id;
    if (!chatId) {
      return new Response(JSON.stringify({ skipped: true, reason: 'No telegram_chat_id configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch calendar
    const calResp = await fetch(FF_CALENDAR_URL, {
      headers: { 'User-Agent': 'TradeVault-Pro/1.0' },
    });
    if (!calResp.ok) throw new Error(`FF API returned ${calResp.status}`);
    const rawEvents = await calResp.json();

    const now = new Date();
    const nowMs = now.getTime();
    const alertsSent: string[] = [];

    for (const event of rawEvents) {
      // Only High or Medium impact
      const impact = (event.impact || '').toLowerCase();
      if (impact !== 'high' && impact !== 'medium') continue;

      // Parse event date
      const eventDate = new Date(event.date);
      if (isNaN(eventDate.getTime())) continue;

      const diffMs = eventDate.getTime() - nowMs;
      const diffMin = diffMs / 60000;

      // Alert window: 5-10 minutes before event
      if (diffMin < 4 || diffMin > 11) continue;

      const title = event.title || 'Unknown Event';
      const country = event.country || '';
      const currency = COUNTRY_CURRENCY[country] || country;
      const flag = COUNTRY_FLAGS[country] || '🌍';

      // Dedup check
      const dedupKey = `${title}_${event.date}`;
      const { data: existing } = await supabase
        .from('alert_log')
        .select('id')
        .eq('alert_type', 'news_alert')
        .contains('metadata', { dedup_key: dedupKey })
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Build message
      const impactLabel = impact === 'high' ? 'HIGH IMPACT' : 'MEDIUM IMPACT';
      const impactEmoji = impact === 'high' ? '🔴' : '🟡';
      const minutesLeft = Math.round(diffMin);
      const affectedPairs = getAffectedPairs(currency, title);
      const goldMover = isGoldMover(title);
      const bdHour = (eventDate.getUTCHours() + 6) % 24;
      const bdMin = eventDate.getUTCMinutes();
      const bdTimeStr = `${String(bdHour).padStart(2, '0')}:${String(bdMin).padStart(2, '0')}`;

      let msg = `${impactEmoji} ${flag} <b>${impactLabel}</b> — ${minutesLeft} min left!\n\n`;
      msg += `📰 <b>${title}</b>\n`;
      msg += `⏰ Time: 🇧🇩 ${bdTimeStr}\n`;
      if (event.forecast || event.previous) {
        msg += `📊 Forecast: ${event.forecast || 'N/A'} | Previous: ${event.previous || 'N/A'}\n`;
      }
      msg += `\n💥 Affected pairs: ${affectedPairs.join(', ')}\n`;
      if (goldMover) msg += `🥇 Gold mover: Yes\n`;
      msg += `\n⏳ Prepare your positions!`;

      // Send Telegram
      const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');

      let sendOk = false;

      if (LOVABLE_API_KEY && TELEGRAM_API_KEY) {
        const tgResp = await fetch(`${GATEWAY_URL}/sendMessage`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': TELEGRAM_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
        });
        sendOk = tgResp.ok;
        if (!sendOk) {
          console.error('Gateway send failed:', await tgResp.text());
        }
      }

      // Fallback to direct bot token
      if (!sendOk) {
        const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
        if (BOT_TOKEN) {
          const tgResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
          });
          sendOk = tgResp.ok;
        }
      }

      if (sendOk) {
        // Log to prevent duplicates
        await supabase.from('alert_log').insert({
          alert_type: 'news_alert',
          message: msg,
          pair: affectedPairs[0] || null,
          metadata: { dedup_key: dedupKey, title, country, impact, event_time: event.date },
        });
        alertsSent.push(title);

        // Web Push
        try {
          const pushBody = `${flag} ${impactLabel}: ${title}\n⏰ 🇧🇩 ${bdTimeStr} (${minutesLeft} min left)\n💥 ${affectedPairs.join(', ')}`;
          await supabase.functions.invoke('send-push-notification', {
            body: {
              title: `${impactEmoji} ${title}`,
              body: pushBody,
              tag: 'news-alert',
              url: '/market-news',
            },
          });
        } catch (e) { console.error('Push error:', e); }
      }
    }

    return new Response(JSON.stringify({ ok: true, alertsSent, checkedAt: now.toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('News alert error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
