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

  // Check if habit reminder is enabled
  const { data: alertCheck } = await supabase
    .from('alert_settings')
    .select('habit_reminder_alert')
    .limit(1)
    .single();
  if (alertCheck && !alertCheck.habit_reminder_alert) {
    return json({ skipped: true, reason: 'habit_reminder_alert disabled' });
  }

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

  // Get all active habits
  const { data: habits = [] } = await supabase
    .from('habits')
    .select('*')
    .eq('active', true);

  if (!habits || habits.length === 0) {
    return json({ ok: true, message: 'No active habits' });
  }

  // Calculate date ranges
  const now = new Date();
  const thisWeekEnd = new Date(now);
  thisWeekEnd.setDate(thisWeekEnd.getDate() - 1); // yesterday
  const thisWeekStart = new Date(thisWeekEnd);
  thisWeekStart.setDate(thisWeekStart.getDate() - 6); // 7 days

  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekStart.getDate() - 6);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  // Get this week's logs
  const { data: thisWeekLogs = [] } = await supabase
    .from('habit_logs')
    .select('habit_id, date')
    .gte('date', fmt(thisWeekStart))
    .lte('date', fmt(thisWeekEnd));

  // Get last week's logs
  const { data: lastWeekLogs = [] } = await supabase
    .from('habit_logs')
    .select('habit_id, date')
    .gte('date', fmt(lastWeekStart))
    .lte('date', fmt(lastWeekEnd));

  // Calculate stats
  const totalPossiblePerDay = habits.length;
  const thisWeekDays = 7;

  // Group by date
  const thisWeekByDate: Record<string, Set<string>> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(thisWeekStart);
    d.setDate(d.getDate() + i);
    thisWeekByDate[fmt(d)] = new Set();
  }
  (thisWeekLogs || []).forEach((l: any) => {
    if (thisWeekByDate[l.date]) thisWeekByDate[l.date].add(l.habit_id);
  });

  const lastWeekByDate: Record<string, Set<string>> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(lastWeekStart);
    d.setDate(d.getDate() + i);
    lastWeekByDate[fmt(d)] = new Set();
  }
  (lastWeekLogs || []).forEach((l: any) => {
    if (lastWeekByDate[l.date]) lastWeekByDate[l.date].add(l.habit_id);
  });

  // This week metrics
  const thisWeekTotal = Object.values(thisWeekByDate).reduce((s, set) => s + set.size, 0);
  const thisWeekMaxPossible = thisWeekDays * totalPossiblePerDay;
  const thisWeekRate = thisWeekMaxPossible > 0 ? Math.round((thisWeekTotal / thisWeekMaxPossible) * 100) : 0;

  // Last week metrics
  const lastWeekTotal = Object.values(lastWeekByDate).reduce((s, set) => s + set.size, 0);
  const lastWeekMaxPossible = thisWeekDays * totalPossiblePerDay;
  const lastWeekRate = lastWeekMaxPossible > 0 ? Math.round((lastWeekTotal / lastWeekMaxPossible) * 100) : 0;

  // Best/worst day this week
  let bestDay = '', bestCount = -1, worstDay = '', worstCount = Infinity;
  const dayNames = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];

  Object.entries(thisWeekByDate).forEach(([date, set]) => {
    const dayName = dayNames[new Date(date).getDay()];
    if (set.size > bestCount) { bestCount = set.size; bestDay = `${dayName} (${date})`; }
    if (set.size < worstCount) { worstCount = set.size; worstDay = `${dayName} (${date})`; }
  });

  // Perfect days
  const perfectDays = Object.values(thisWeekByDate).filter(set => set.size >= totalPossiblePerDay).length;

  // XP earned this week
  const thisWeekXP = thisWeekTotal * 10 + perfectDays * 50;
  const lastWeekXP = Object.values(lastWeekByDate).reduce((s, set) => s + set.size, 0) * 10 +
    Object.values(lastWeekByDate).filter(set => set.size >= totalPossiblePerDay).length * 50;

  // Trend
  const rateDiff = thisWeekRate - lastWeekRate;
  const trend = rateDiff > 0 ? `📈 +${rateDiff}%` : rateDiff < 0 ? `📉 ${rateDiff}%` : '➡️ Same';

  // Build message
  const bdNow = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const bdTimeStr = `${String(bdNow.getUTCHours()).padStart(2, '0')}:${String(bdNow.getUTCMinutes()).padStart(2, '0')}`;
  let msg = `📊 <b>Weekly Habit Recap</b>\n`;
  msg += `📅 ${fmt(thisWeekStart)} → ${fmt(thisWeekEnd)} | 🇧🇩 ${bdTimeStr}\n\n`;

  msg += `<b>📈 Completion Rate:</b> ${thisWeekRate}% ${trend}\n`;
  msg += `<b>✅ Total Completions:</b> ${thisWeekTotal}/${thisWeekMaxPossible}\n`;
  msg += `<b>🌟 Perfect Days:</b> ${perfectDays}/7\n`;
  msg += `<b>⚡ XP Earned:</b> ${thisWeekXP}\n\n`;

  msg += `<b>📊 Daily Breakdown:</b>\n`;
  Object.entries(thisWeekByDate).forEach(([date, set]) => {
    const dayName = dayNames[new Date(date).getDay()];
    const bar = '█'.repeat(set.size) + '░'.repeat(Math.max(0, totalPossiblePerDay - set.size));
    const pct = totalPossiblePerDay > 0 ? Math.round((set.size / totalPossiblePerDay) * 100) : 0;
    msg += `  ${dayName}: ${bar} ${set.size}/${totalPossiblePerDay} (${pct}%)\n`;
  });

  msg += `\n🏆 Best: <b>${bestDay}</b> (${bestCount} done)\n`;
  msg += `⚠️ Worst: <b>${worstDay}</b> (${worstCount} done)\n\n`;

  // Comparison
  msg += `<b>📊 vs Last Week:</b>\n`;
  msg += `  Completions: ${lastWeekTotal} → ${thisWeekTotal} ${thisWeekTotal > lastWeekTotal ? '📈' : thisWeekTotal < lastWeekTotal ? '📉' : '➡️'}\n`;
  msg += `  XP: ${lastWeekXP} → ${thisWeekXP} ${thisWeekXP > lastWeekXP ? '📈' : thisWeekXP < lastWeekXP ? '📉' : '➡️'}\n`;
  msg += `  Rate: ${lastWeekRate}% → ${thisWeekRate}% ${trend}\n`;

  // Per-habit breakdown
  msg += `\n<b>🔥 Per Habit:</b>\n`;
  habits.forEach((h: any) => {
    const count = (thisWeekLogs || []).filter((l: any) => l.habit_id === h.id).length;
    msg += `  • ${h.name}: ${count}/7 days (🔥${h.current_streak})\n`;
  });

  // Send
  const response = await fetch(`${tgBase}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
  });

  // Web Push for weekly recap
  try {
    await supabase.functions.invoke('send-push-notification', {
      body: {
        title: '📊 Weekly Recap',
        body: `${thisWeekRate}% completion (${trend}) | 🌟 ${perfectDays} perfect days | ⚡ ${thisWeekXP} XP`,
        tag: 'habit-weekly-recap',
        url: '/habit-tracking',
      },
    });
  } catch (e) { console.error('Push error:', e); }

  const data = await response.json();
  return json({ ok: response.ok, data });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
