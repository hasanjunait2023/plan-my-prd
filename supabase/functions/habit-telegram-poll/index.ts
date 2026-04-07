import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

Deno.serve(async () => {
  const startTime = Date.now();
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing keys' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get or create bot state
  const { data: state } = await supabase
    .from('telegram_bot_state')
    .select('update_offset')
    .eq('id', 1)
    .single();

  // Create state table row if not exists
  let currentOffset = state?.update_offset ?? 0;
  if (!state) {
    await supabase.from('telegram_bot_state').upsert({ id: 1, update_offset: 0 });
  }

  let totalProcessed = 0;

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;
    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    const response = await fetch(`${GATEWAY_URL}/getUpdates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ offset: currentOffset, timeout, allowed_updates: ['message'] }),
    });

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data }), { status: 502 });
    }

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    for (const update of updates) {
      const text = update.message?.text;
      const chatId = update.message?.chat?.id;

      if (text && text.startsWith('/done_') && chatId) {
        const habitId = text.replace('/done_', '').trim();
        const today = new Date().toISOString().split('T')[0];

        // Get habit info
        const { data: habit } = await supabase
          .from('habits')
          .select('*')
          .eq('id', habitId)
          .single();

        if (!habit) {
          await sendTelegramMessage(chatId, '❌ Habit not found.', LOVABLE_API_KEY, TELEGRAM_API_KEY);
          continue;
        }

        // Check if already done
        const { data: existing } = await supabase
          .from('habit_logs')
          .select('id')
          .eq('habit_id', habitId)
          .eq('date', today)
          .limit(1);

        if (existing && existing.length > 0) {
          await sendTelegramMessage(chatId, `✅ "${habit.name}" already completed today!`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          continue;
        }

        // Insert log
        const { error: logErr } = await supabase
          .from('habit_logs')
          .insert({ habit_id: habitId, user_id: habit.user_id, date: today, source: 'telegram' });

        if (logErr) {
          console.error('Log insert error:', logErr);
          continue;
        }

        // Update streak
        const newStreak = habit.current_streak + 1;
        await supabase
          .from('habits')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, habit.longest_streak),
            total_completions: habit.total_completions + 1,
          })
          .eq('id', habitId);

        // Mark reminder as responded
        await supabase
          .from('habit_reminders')
          .update({ responded: true })
          .eq('habit_id', habitId)
          .eq('date', today);

        await sendTelegramMessage(
          chatId,
          `✅ <b>"${habit.name}"</b> marked complete!\n🔥 Streak: ${newStreak} days`,
          LOVABLE_API_KEY,
          TELEGRAM_API_KEY
        );

        totalProcessed++;
      }
    }

    // Advance offset
    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase
      .from('telegram_bot_state')
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq('id', 1);
    currentOffset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed }));
});

async function sendTelegramMessage(chatId: number, text: string, lovableKey: string, telegramKey: string) {
  const resp = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': telegramKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  await resp.text();
}
