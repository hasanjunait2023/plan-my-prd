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

    const response = await fetch(`${GATEWAY_URL}/getUpdates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ offset: currentOffset, timeout, allowed_updates: ['message', 'callback_query'] }),
    });

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data }), { status: 502 });
    }

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    for (const update of updates) {
      // Handle callback_query (inline button press)
      if (update.callback_query) {
        const cbData = update.callback_query.data;
        const cbId = update.callback_query.id;
        const chatId = update.callback_query.message?.chat?.id;
        const messageId = update.callback_query.message?.message_id;

        if (cbData?.startsWith('done_') && chatId) {
          const habitId = cbData.replace('done_', '');
          const today = new Date().toISOString().split('T')[0];

          const { data: habit } = await supabase
            .from('habits')
            .select('*')
            .eq('id', habitId)
            .single();

          if (!habit) {
            await answerCallback(cbId, '❌ Habit not found', LOVABLE_API_KEY, TELEGRAM_API_KEY);
            continue;
          }

          const { data: existing } = await supabase
            .from('habit_logs')
            .select('id')
            .eq('habit_id', habitId)
            .eq('date', today)
            .limit(1);

          if (existing && existing.length > 0) {
            await answerCallback(cbId, '✅ Already done today!', LOVABLE_API_KEY, TELEGRAM_API_KEY);
            if (messageId) {
              await editMessage(chatId, messageId, `✅ <b>"${habit.name}"</b> — already completed today!`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
            }
            continue;
          }

          const { error: logErr } = await supabase
            .from('habit_logs')
            .insert({ habit_id: habitId, user_id: habit.user_id, date: today, source: 'telegram' });

          if (logErr) {
            console.error('Log insert error:', logErr);
            await answerCallback(cbId, '❌ Error saving', LOVABLE_API_KEY, TELEGRAM_API_KEY);
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

          await answerCallback(cbId, `✅ Done! Streak: ${newStreak}`, LOVABLE_API_KEY, TELEGRAM_API_KEY);

          if (messageId) {
            await editMessage(chatId, messageId, `✅ <b>"${habit.name}"</b> marked complete!\n🔥 Streak: ${newStreak} days`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          }

          totalProcessed++;
        } else if (cbData?.startsWith('skip_') && chatId) {
          const habitId = cbData.replace('skip_', '');
          const { data: habit } = await supabase
            .from('habits')
            .select('name')
            .eq('id', habitId)
            .single();

          await answerCallback(cbId, '⏭ Skipped', LOVABLE_API_KEY, TELEGRAM_API_KEY);

          if (messageId) {
            const name = habit?.name || 'Habit';
            await editMessage(chatId, messageId, `⏭ <b>"${name}"</b> skipped for today.`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          }
        } else {
          await answerCallback(cbId, '', LOVABLE_API_KEY, TELEGRAM_API_KEY);
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
          await sendTelegramMessage(chatId, '❌ Habit not found.', LOVABLE_API_KEY, TELEGRAM_API_KEY);
          continue;
        }

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

        await sendTelegramMessage(
          chatId,
          `✅ <b>"${habit.name}"</b> marked complete!\n🔥 Streak: ${newStreak} days`,
          LOVABLE_API_KEY,
          TELEGRAM_API_KEY
        );

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

async function answerCallback(callbackQueryId: string, text: string, lovableKey: string, telegramKey: string) {
  await fetch(`${GATEWAY_URL}/answerCallbackQuery`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': telegramKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function editMessage(chatId: number, messageId: number, text: string, lovableKey: string, telegramKey: string) {
  await fetch(`${GATEWAY_URL}/editMessageText`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': telegramKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' }),
  });
}

async function sendTelegramMessage(chatId: number, text: string, lovableKey: string, telegramKey: string) {
  await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': telegramKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}
