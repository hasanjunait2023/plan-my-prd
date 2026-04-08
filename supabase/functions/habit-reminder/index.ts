import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

Deno.serve(async () => {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing keys' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      const resp = await fetch(`${GATEWAY_URL}/sendMessage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': TELEGRAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', reply_markup }),
      });
      await resp.text();

      await supabase.from('habit_reminders').insert({
        habit_id: habit.id,
        date: today,
      });

      remindersSent++;
    } catch (e) {
      console.error(`Failed to send reminder for ${habit.name}:`, e);
    }
  }

  return new Response(JSON.stringify({ ok: true, remindersSent }));
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
