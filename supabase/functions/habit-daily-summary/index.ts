import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

Deno.serve(async () => {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return new Response('LOVABLE_API_KEY missing', { status: 500 });

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  if (!TELEGRAM_API_KEY) return new Response('TELEGRAM_API_KEY missing', { status: 500 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get telegram chat_id from alert_settings
  const { data: settings } = await supabase
    .from('alert_settings')
    .select('telegram_chat_id')
    .limit(1)
    .single();

  if (!settings?.telegram_chat_id) {
    return new Response(JSON.stringify({ ok: false, error: 'No telegram_chat_id configured' }), { status: 200 });
  }

  const chatId = settings.telegram_chat_id;
  const today = new Date().toISOString().split('T')[0];

  // Get all active habits
  const { data: habits = [] } = await supabase
    .from('habits')
    .select('*')
    .eq('active', true);

  if (!habits || habits.length === 0) {
    return new Response(JSON.stringify({ ok: true, message: 'No active habits' }), { status: 200 });
  }

  // Get today's logs
  const { data: todayLogs = [] } = await supabase
    .from('habit_logs')
    .select('habit_id')
    .eq('date', today);

  const completedIds = new Set((todayLogs || []).map((l: any) => l.habit_id));

  const completed = habits!.filter(h => completedIds.has(h.id));
  const missed = habits!.filter(h => !completedIds.has(h.id));

  // Build message
  let msg = `📊 <b>Daily Habit Summary</b>\n📅 ${today}\n\n`;
  msg += `✅ Done: ${completed.length}/${habits!.length}\n\n`;

  if (completed.length > 0) {
    msg += `<b>✅ Completed:</b>\n`;
    completed.forEach(h => {
      msg += `  • ${h.name} (🔥 ${h.current_streak} streak)\n`;
    });
    msg += '\n';
  }

  if (missed.length > 0) {
    msg += `<b>❌ Missed:</b>\n`;
    missed.forEach(h => {
      msg += `  • ${h.name}\n`;
    });
    msg += '\n';
  }

  // Top streaks
  const topStreaks = [...habits!].sort((a, b) => b.current_streak - a.current_streak).slice(0, 3);
  if (topStreaks.some(h => h.current_streak > 0)) {
    msg += `<b>🏆 Top Streaks:</b>\n`;
    topStreaks.filter(h => h.current_streak > 0).forEach(h => {
      msg += `  • ${h.name}: ${h.current_streak} days\n`;
    });
  }

  // Send via gateway
  const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': TELEGRAM_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: msg,
      parse_mode: 'HTML',
    }),
  });

  const data = await response.json();
  return new Response(JSON.stringify({ ok: response.ok, data }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
