import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── DST Detection ───
type DSTRegion = 'US' | 'EU' | 'AU';

function getNthSunday(year: number, month: number, n: number): Date {
  const first = new Date(Date.UTC(year, month, 1));
  const firstSunday = first.getUTCDay() === 0 ? 1 : 8 - first.getUTCDay();
  return new Date(Date.UTC(year, month, firstSunday + (n - 1) * 7, 2));
}

function getLastSunday(year: number, month: number): Date {
  const last = new Date(Date.UTC(year, month + 1, 0));
  const offset = last.getUTCDay();
  return new Date(Date.UTC(year, month, last.getUTCDate() - offset, 1));
}

function isDST(region: DSTRegion, date: Date): boolean {
  const year = date.getUTCFullYear();
  switch (region) {
    case 'US': {
      const marchStart = getNthSunday(year, 2, 2);
      const novEnd = getNthSunday(year, 10, 1);
      return date >= marchStart && date < novEnd;
    }
    case 'EU': {
      const marchStart = getLastSunday(year, 2);
      const octEnd = getLastSunday(year, 9);
      return date >= marchStart && date < octEnd;
    }
    case 'AU': {
      const octStart = getNthSunday(year, 9, 1);
      const aprEnd = getNthSunday(year, 3, 1);
      return date >= octStart || date < aprEnd;
    }
    default:
      return false;
  }
}

// ─── Session Config ───
interface SessionDef {
  name: string;
  emoji: string;
  color: string;
  dstRegion: DSTRegion | null;
  winterStartUtc: number;
  winterEndUtc: number;
  summerStartUtc: number;
  summerEndUtc: number;
  bestPairs: string[];
}

const SESSIONS: SessionDef[] = [
  { name: 'Sydney', emoji: '🟡', color: '🟡', dstRegion: 'AU', winterStartUtc: 22, winterEndUtc: 7, summerStartUtc: 22, summerEndUtc: 7, bestPairs: ['AUD/USD', 'NZD/USD', 'AUD/JPY'] },
  { name: 'Tokyo', emoji: '🔴', color: '🔴', dstRegion: null, winterStartUtc: 1, winterEndUtc: 9, summerStartUtc: 1, summerEndUtc: 9, bestPairs: ['USD/JPY', 'AUD/JPY', 'NZD/JPY'] },
  { name: 'London', emoji: '🔵', color: '🔵', dstRegion: 'EU', winterStartUtc: 8, winterEndUtc: 16, summerStartUtc: 7, summerEndUtc: 16, bestPairs: ['EUR/USD', 'GBP/USD', 'EUR/GBP'] },
  { name: 'New York', emoji: '🟠', color: '🟠', dstRegion: 'US', winterStartUtc: 13, winterEndUtc: 22, summerStartUtc: 12, summerEndUtc: 21, bestPairs: ['EUR/USD', 'GBP/USD', 'USD/CAD'] },
];

function getSessionHours(s: SessionDef, date: Date): { start: number; end: number } {
  if (!s.dstRegion) return { start: s.winterStartUtc, end: s.winterEndUtc };
  const dst = isDST(s.dstRegion, date);
  return dst ? { start: s.summerStartUtc, end: s.summerEndUtc } : { start: s.winterStartUtc, end: s.winterEndUtc };
}

// BD Time (UTC+6)
function utcToBD(h: number): number { return (h + 6) % 24; }
function formatBDRange(startUtc: number, endUtc: number): string {
  return `${String(utcToBD(startUtc)).padStart(2, '0')}:00 — ${String(utcToBD(endUtc)).padStart(2, '0')}:00`;
}

// ─── Forex Closed Check ───
function isForexClosed(date: Date): boolean {
  const day = date.getUTCDay();
  const hour = date.getUTCHours();
  if (day === 6) return true;
  if (day === 5 && hour >= 21) return true;
  if (day === 0 && hour < 22) return true;
  const md = `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  if (['12-25', '01-01'].includes(md)) return true;
  return false;
}

// ─── Motivational Quotes ───
const QUOTES = [
  "Discipline is the bridge between goals and accomplishment.",
  "Consistency beats intensity — every session, every day.",
  "The market rewards patience and punishes impulse.",
  "তোমার plan-কে trust করো, emotions-কে না।",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Don't trade to win — trade to follow your process.",
  "Risk management is not optional — it's survival.",
  "প্রতিটি ভুল থেকে শেখো, কিন্তু একই ভুল দুইবার করো না।",
  "Patience is not the ability to wait, but to keep a good attitude while waiting.",
  "The goal isn't to be right — it's to be consistent.",
  "Winners focus on process, losers focus on profits.",
  "তুমি একজন sniper, spray and pray নও।",
  "One good trade > ten mediocre trades.",
  "Protect your capital like your life depends on it.",
  "Analysis without execution is wasted effort.",
  "ধৈর্য ধরো — market সবসময় opportunity দেবে।",
  "A losing trade following your rules is a good trade.",
  "Overtrading is the silent killer of trading accounts.",
  "The best traders are the most disciplined, not the smartest.",
  "তোমার journal-ই তোমার সবচেয়ে বড় teacher।",
  "Cut losses quickly, let winners run — simple but powerful.",
  "Every session is a new opportunity to execute perfectly.",
  "Focus on the process — profits will follow.",
  "প্রস্তুতি ছাড়া trading মানে gambling।",
  "Small consistent gains compound into life-changing results.",
  "Never revenge trade — the market doesn't owe you anything.",
  "Quality setups only — no FOMO, no forcing trades.",
  "নিজের rules মানো — এটাই সফল trader-দের secret।",
  "The market is always right — adapt or lose.",
  "Trading is a marathon, not a sprint. Stay disciplined.",
];

function getRandomQuote(): string {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

// ─── Notification Senders ───
async function sendTelegram(chatId: string, text: string): Promise<void> {
  const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');

  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
    // Fallback: direct bot token
    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!BOT_TOKEN) { console.error('No Telegram credentials'); return; }
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    return;
  }

  await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': TELEGRAM_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

async function sendPush(supabase: any, title: string, body: string): Promise<void> {
  const { data: subs } = await supabase.from('push_subscriptions').select('*');
  if (!subs || subs.length === 0) return;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  for (const sub of subs) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          title,
          body,
        }),
      });
    } catch (e) {
      console.error('Push send error:', e);
    }
  }
}

// ─── Main Handler ───
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const now = new Date();

    // Skip weekends/holidays
    if (isForexClosed(now)) {
      return new Response(JSON.stringify({ ok: true, skipped: 'market_closed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const h = now.getUTCHours();
    const m = now.getUTCMinutes();
    const todayStr = now.toISOString().split('T')[0];

    // Get telegram chat_id
    const { data: alertSettings } = await supabase.from('alert_settings').select('telegram_chat_id, session_reminder_alert').limit(1).single();
    const chatId = alertSettings?.telegram_chat_id;
    const enabled = alertSettings?.session_reminder_alert !== false;

    if (!enabled) {
      return new Response(JSON.stringify({ ok: true, skipped: 'disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const alerts: string[] = [];

    for (const session of SESSIONS) {
      const { start, end } = getSessionHours(session, now);
      const bdRange = formatBDRange(start, end);
      const pairsStr = session.bestPairs.join(', ');

      // Check 15 min before
      let preH = start;
      let preM = 0;
      // 15 min before: subtract 15 from start:00
      preM = 60 - 15; // 45
      preH = (start - 1 + 24) % 24;

      if (h === preH && m === preM) {
        // Check duplicate
        const { data: existing } = await supabase
          .from('session_reminders')
          .select('id')
          .eq('session_name', session.name)
          .eq('alert_type', 'pre_15min')
          .eq('date', todayStr)
          .maybeSingle();

        if (!existing) {
          const quote = getRandomQuote();
          const msg = `⏰ <b>${session.name} Session</b> 15 মিনিটে শুরু হচ্ছে!\n🕐 BD Time: ${bdRange}\n💡 Best Pairs: ${pairsStr}\n\n📖 <i>"${quote}"</i>\n\n🔔 চার্ট সেটআপ করো, analysis শেষ করো!`;

          // Log
          await supabase.from('session_reminders').insert({ session_name: session.name, alert_type: 'pre_15min', date: todayStr });

          // Send
          if (chatId) await sendTelegram(chatId, msg);
          await sendPush(supabase, `⏰ ${session.name} Session — 15 min!`, `${session.name} Session 15 মিনিটে শুরু হচ্ছে! ${pairsStr}`);
          alerts.push(`pre_15min:${session.name}`);
        }
      }

      // Check session open (start:00)
      if (h === start && m === 0) {
        const { data: existing } = await supabase
          .from('session_reminders')
          .select('id')
          .eq('session_name', session.name)
          .eq('alert_type', 'session_open')
          .eq('date', todayStr)
          .maybeSingle();

        if (!existing) {
          const msg = `🟢 <b>${session.name} Session NOW OPEN!</b> ${session.emoji}\n🕐 BD Time: ${bdRange}\n💡 Best Pairs: ${pairsStr}\n\n⚡ Market is live — execute with discipline!`;

          await supabase.from('session_reminders').insert({ session_name: session.name, alert_type: 'session_open', date: todayStr });

          if (chatId) await sendTelegram(chatId, msg);
          await sendPush(supabase, `🟢 ${session.name} Session OPEN!`, `${session.name} is now live! Best Pairs: ${pairsStr}`);
          alerts.push(`session_open:${session.name}`);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, alerts, time: `${h}:${String(m).padStart(2, '0')} UTC` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Session reminder error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
