import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

Deno.serve(async () => {
  const startTime = Date.now();
  const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN not configured' }), { status: 500 });
  }

  const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: state } = await supabase
    .from('telegram_bot_state')
    .select('update_offset')
    .eq('id', 1)
    .single();

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

    const response = await fetch(`${TG}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offset: currentOffset, timeout, allowed_updates: ['message', 'callback_query'] }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('getUpdates error:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: data }), { status: 502 });
    }

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    for (const update of updates) {
      if (update.callback_query) {
        const cbData = update.callback_query.data;
        const cbId = update.callback_query.id;
        const chatId = update.callback_query.message?.chat?.id;
        const messageId = update.callback_query.message?.message_id;

        console.log('Callback received:', cbData, 'chatId:', chatId);

        if (cbData?.startsWith('done_') && chatId) {
          const habitId = cbData.replace('done_', '');
          const today = new Date().toISOString().split('T')[0];

          const { data: habit } = await supabase
            .from('habits')
            .select('*')
            .eq('id', habitId)
            .single();

          if (!habit) {
            await answerCallback(TG, cbId, '❌ Habit not found');
            continue;
          }

          const { data: existing } = await supabase
            .from('habit_logs')
            .select('id')
            .eq('habit_id', habitId)
            .eq('date', today)
            .limit(1);

          if (existing && existing.length > 0) {
            await answerCallback(TG, cbId, '✅ Already done today!');
            if (messageId) {
              await editMessage(TG, chatId, messageId, `✅ <b>"${habit.name}"</b> — already completed today!`);
            }
            continue;
          }

          const { error: logErr } = await supabase
            .from('habit_logs')
            .insert({ habit_id: habitId, user_id: habit.user_id, date: today, source: 'telegram' });

          if (logErr) {
            console.error('Log insert error:', logErr);
            await answerCallback(TG, cbId, '❌ Error saving');
            continue;
          }

          const newStreak = habit.current_streak + 1;
          await supabase
            .from('habits')
            .update({
              current_streak: newStreak,
              longest_streak: Math.max(newStreak, habit.longest_streak),
              total_completions: habit.total_completions + 1,
            })
            .eq('id', habitId);

          await supabase
            .from('habit_reminders')
            .update({ responded: true })
            .eq('habit_id', habitId)
            .eq('date', today);

          await answerCallback(TG, cbId, `✅ Done! Streak: ${newStreak}`);

          if (messageId) {
            await editMessage(TG, chatId, messageId, `✅ <b>"${habit.name}"</b> marked complete!\n🔥 Streak: ${newStreak} days`);
          }

          totalProcessed++;
        } else if (cbData?.startsWith('skip_') && chatId) {
          const habitId = cbData.replace('skip_', '');
          const { data: habit } = await supabase
            .from('habits')
            .select('name')
            .eq('id', habitId)
            .single();

          await answerCallback(TG, cbId, '⏭ Skipped');

          if (messageId) {
            const name = habit?.name || 'Habit';
            await editMessage(TG, chatId, messageId, `⏭ <b>"${name}"</b> skipped for today.`);
          }
        } else {
          await answerCallback(TG, cbId, '');
        }
        continue;
      }

      // Handle text commands (legacy /done_ support)
      const text = update.message?.text;
      const chatId = update.message?.chat?.id;

      if (text && text.startsWith('/done_') && chatId) {
        const habitId = text.replace('/done_', '').trim();
        const today = new Date().toISOString().split('T')[0];

        const { data: habit } = await supabase
          .from('habits')
          .select('*')
          .eq('id', habitId)
          .single();

        if (!habit) {
          await sendMessage(TG, chatId, '❌ Habit not found.');
          continue;
        }

        const { data: existing } = await supabase
          .from('habit_logs')
          .select('id')
          .eq('habit_id', habitId)
          .eq('date', today)
          .limit(1);

        if (existing && existing.length > 0) {
          await sendMessage(TG, chatId, `✅ "${habit.name}" already completed today!`);
          continue;
        }

        const { error: logErr } = await supabase
          .from('habit_logs')
          .insert({ habit_id: habitId, user_id: habit.user_id, date: today, source: 'telegram' });

        if (logErr) {
          console.error('Log insert error:', logErr);
          continue;
        }

        const newStreak = habit.current_streak + 1;
        await supabase
          .from('habits')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, habit.longest_streak),
            total_completions: habit.total_completions + 1,
          })
          .eq('id', habitId);

        await supabase
          .from('habit_reminders')
          .update({ responded: true })
          .eq('habit_id', habitId)
          .eq('date', today);

        await sendMessage(TG, chatId, `✅ <b>"${habit.name}"</b> marked complete!\n🔥 Streak: ${newStreak} days`);
        totalProcessed++;
      }
    }

    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase
      .from('telegram_bot_state')
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq('id', 1);
    currentOffset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed }));
});

async function answerCallback(tg: string, callbackQueryId: string, text: string) {
  const r = await fetch(`${tg}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
  const d = await r.json();
  console.log('answerCallback:', JSON.stringify(d));
}

async function editMessage(tg: string, chatId: number, messageId: number, text: string) {
  const r = await fetch(`${tg}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' }),
  });
  const d = await r.json();
  console.log('editMessage:', JSON.stringify(d));
}

async function sendMessage(tg: string, chatId: number, text: string) {
  const r = await fetch(`${tg}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  const d = await r.json();
  console.log('sendMessage:', JSON.stringify(d));
}
