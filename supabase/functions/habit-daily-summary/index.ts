import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!BOT_TOKEN) return json({ ok: false, error: 'TELEGRAM_BOT_TOKEN missing' }, 500);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const tgBase = `https://api.telegram.org/bot${BOT_TOKEN}`;

  // Check mode: morning (streak break alert) or evening (daily summary)
  let mode = 'summary';
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const rawBody = await req.text();
      if (rawBody) {
        const body = JSON.parse(rawBody);
        if (body?.mode === 'streak_alert') mode = 'streak_alert';
      }
    }
  } catch { /* default to summary */ }

  // Get telegram chat_id
  const { data: settings } = await supabase
    .from('alert_settings')
    .select('telegram_chat_id')
    .limit(1)
    .single();

  if (!settings?.telegram_chat_id) {
    return json({ ok: false, error: 'No telegram_chat_id configured' });
  }

  const chatId = settings.telegram_chat_id;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Get all active habits
  const { data: habits = [] } = await supabase
    .from('habits')
    .select('*')
    .eq('active', true);

  if (!habits || habits.length === 0) {
    return json({ ok: true, message: 'No active habits' });
  }

  // === STREAK BREAK ALERT MODE ===
  if (mode === 'streak_alert') {
    // Check yesterday's logs to find missed habits with broken streaks
    const { data: yesterdayLogs = [] } = await supabase
      .from('habit_logs')
      .select('habit_id')
      .eq('date', yesterday);

    const completedYesterday = new Set((yesterdayLogs || []).map((l: any) => l.habit_id));
    const brokenStreaks = habits.filter((h: any) =>
      !completedYesterday.has(h.id) && h.current_streak === 0 && h.longest_streak > 0
    );

    if (brokenStreaks.length === 0) {
      return json({ ok: true, message: 'No broken streaks' });
    }

    let msg = `⚠️ <b>Streak Break Alert!</b>\n\n`;
    brokenStreaks.forEach((h: any) => {
      msg += `❌ <b>"${h.name}"</b> — ${h.longest_streak} day streak lost!\n`;
    });
    msg += `\n💪 আজ থেকে আবার শুরু করো! Rebuild your streaks!`;

    // Add quick-complete buttons
    const keyboard = brokenStreaks.map((h: any) => ([
      { text: `✅ Start: ${h.name}`, callback_data: `done_${h.id}` },
    ]));

    await fetch(`${tgBase}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard },
      }),
    });

    return json({ ok: true, mode: 'streak_alert', broken: brokenStreaks.length });
  }

  // === DAILY SUMMARY MODE ===
  const { data: todayLogs = [] } = await supabase
    .from('habit_logs')
    .select('habit_id')
    .eq('date', today);

  const completedIds = new Set((todayLogs || []).map((l: any) => l.habit_id));
  const completed = habits.filter((h: any) => completedIds.has(h.id));
  const missed = habits.filter((h: any) => !completedIds.has(h.id));
  const rate = Math.round((completed.length / habits.length) * 100);

  const bdNow = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const bdTimeStr = `${String(bdNow.getUTCHours()).padStart(2, '0')}:${String(bdNow.getUTCMinutes()).padStart(2, '0')}`;
  let msg = `📊 <b>Daily Habit Summary</b>\n📅 ${today} | 🇧🇩 ${bdTimeStr}\n\n`;
  msg += `✅ Done: ${completed.length}/${habits.length} (${rate}%)\n\n`;

  if (completed.length > 0) {
    msg += `<b>✅ Completed:</b>\n`;
    completed.forEach((h: any) => {
      msg += `  • ${h.name} (🔥 ${h.current_streak} streak)\n`;
    });
    msg += '\n';
  }

  if (missed.length > 0) {
    msg += `<b>❌ Missed:</b>\n`;
    missed.forEach((h: any) => {
      msg += `  • ${h.name}\n`;
    });
    msg += '\n';
  }

  // Perfect day check
  if (missed.length === 0 && completed.length > 0) {
    msg += `🌟 <b>PERFECT DAY!</b> 🎉\n\n`;
  }

  // Top streaks
  const topStreaks = [...habits].sort((a: any, b: any) => b.current_streak - a.current_streak).slice(0, 3);
  if (topStreaks.some((h: any) => h.current_streak > 0)) {
    msg += `<b>🏆 Top Streaks:</b>\n`;
    topStreaks.filter((h: any) => h.current_streak > 0).forEach((h: any) => {
      msg += `  • ${h.name}: ${h.current_streak} days\n`;
    });
  }

  // XP & Level
  let totalXP = 0;
  for (const h of habits) {
    totalXP += (h as any).total_completions * 10;
    totalXP += (h as any).current_streak * 2;
  }
  const levelName = totalXP >= 5000 ? '💎 Diamond' : totalXP >= 3000 ? '👑 Platinum' :
    totalXP >= 1500 ? '🥇 Gold' : totalXP >= 500 ? '🥈 Silver' :
    totalXP >= 100 ? '🥉 Bronze' : '🌱 Beginner';
  msg += `\n⚡ XP: ${totalXP} | Level: ${levelName}`;

  const response = await fetch(`${tgBase}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
  });

  const data = await response.json();
  return json({ ok: response.ok, data });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
