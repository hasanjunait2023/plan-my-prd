import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN not configured' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const tgBase = `https://api.telegram.org/bot${BOT_TOKEN}`;

  const { data: habits, error: habitsErr } = await supabase
    .from('habits')
    .select('*')
    .eq('active', true);

  if (habitsErr || !habits) {
    return new Response(JSON.stringify({ error: habitsErr?.message }), { status: 500 });
  }

  const { data: settings } = await supabase
    .from('alert_settings')
    .select('telegram_chat_id')
    .limit(1)
    .single();

  const chatId = settings?.telegram_chat_id;
  if (!chatId) {
    return new Response(JSON.stringify({ error: 'No telegram_chat_id configured' }), { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];
  let remindersSent = 0;
  const errors: string[] = [];

  for (const habit of habits) {
    const { data: logs } = await supabase
      .from('habit_logs')
      .select('id')
      .eq('habit_id', habit.id)
      .eq('date', today)
      .limit(1);

    if (logs && logs.length > 0) continue;

    const { data: reminders } = await supabase
      .from('habit_reminders')
      .select('id')
      .eq('habit_id', habit.id)
      .eq('date', today)
      .limit(1);

    if (reminders && reminders.length > 0) continue;

    const now = new Date();
    const tzOffset = getTimezoneOffset(habit.timezone || 'Asia/Dhaka');
    const localHour = (now.getUTCHours() + tzOffset + 24) % 24;
    const localMinute = now.getUTCMinutes();
    const [deadlineH, deadlineM] = (habit.submission_time || '07:00').split(':').map(Number);

    if (localHour < deadlineH || (localHour === deadlineH && localMinute < deadlineM)) {
      continue;
    }

    const bdNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const bdTimeStr = `${String(bdNow.getUTCHours()).padStart(2, '0')}:${String(bdNow.getUTCMinutes()).padStart(2, '0')}`;
    const message = `⏰ <b>Habit Reminder:</b> "${habit.name}"\n🇧🇩 ${bdTimeStr} — আজ এখনও complete করা হয়নি!`;

    const reply_markup = {
      inline_keyboard: [[
        { text: '✅ Done', callback_data: `done_${habit.id}` },
        { text: '❌ Skip', callback_data: `skip_${habit.id}` },
      ]],
    };

    try {
      const resp = await fetch(`${tgBase}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', reply_markup }),
      });

      const respData = await resp.json();

      if (!resp.ok) {
        console.error(`Failed to send reminder for ${habit.name}:`, JSON.stringify(respData));
        errors.push(`${habit.name}: ${respData.description || 'unknown error'}`);
        continue; // Don't insert reminder record if send failed
      }

      await supabase.from('habit_reminders').insert({
        habit_id: habit.id,
        date: today,
      });

      remindersSent++;
    } catch (e) {
      console.error(`Failed to send reminder for ${habit.name}:`, e);
      errors.push(`${habit.name}: ${e.message}`);
    }
  }

  return new Response(JSON.stringify({ ok: true, remindersSent, errors }));
});

function getTimezoneOffset(tz: string): number {
  const offsets: Record<string, number> = {
    'Asia/Dhaka': 6,
    'Asia/Kolkata': 5.5,
    'America/New_York': -4,
    'America/Chicago': -5,
    'Europe/London': 1,
    'UTC': 0,
  };
  return offsets[tz] ?? 6;
}
