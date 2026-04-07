import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors';

const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!BOT_TOKEN) {
    return json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, 500);
  }

  const tgBase = `https://api.telegram.org/bot${BOT_TOKEN}`;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let runOnce = false;
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const rawBody = await req.text();
      if (rawBody) {
        const body = JSON.parse(rawBody);
        runOnce = Boolean(body?.run_once || body?.once);
      }
    } else {
      runOnce = new URL(req.url).searchParams.get('once') === '1';
    }
  } catch {
    runOnce = false;
  }

  const { data: state, error: stateError } = await supabase
    .from('telegram_bot_state')
    .select('update_offset')
    .eq('id', 1)
    .maybeSingle();

  if (stateError) {
    return json({ error: stateError.message }, 500);
  }

  let currentOffset = state?.update_offset ?? 0;
  if (!state) {
    const { error: seedError } = await supabase
      .from('telegram_bot_state')
      .upsert({ id: 1, update_offset: 0 });

    if (seedError) {
      return json({ error: seedError.message }, 500);
    }
  }

  let totalProcessed = 0;

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;

    if (!runOnce && remainingMs < MIN_REMAINING_MS) break;

    const timeout = runOnce ? 0 : Math.min(50, Math.floor(remainingMs / 1000) - 5);
    if (!runOnce && timeout < 1) break;

    const response = await fetch(`${tgBase}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offset: currentOffset,
        timeout,
        allowed_updates: ['message', 'callback_query'],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      // 409 = another instance is already polling — exit gracefully, not an error
      if (data.error_code === 409) {
        console.log('Another poll instance running, exiting gracefully');
        return json({ ok: true, processed: totalProcessed, skipped: 'conflict', finalOffset: currentOffset });
      }
      console.error('getUpdates error:', JSON.stringify(data));
      return json({ error: data }, 502);
    }

    const updates = data.result ?? [];
    if (updates.length === 0) {
      if (runOnce) break;
      continue;
    }

    for (const update of updates) {
      if (update.callback_query) {
        const cbData = update.callback_query.data;
        const cbId = update.callback_query.id;
        const chatId = update.callback_query.message?.chat?.id;
        const messageId = update.callback_query.message?.message_id;
        const today = new Date().toISOString().split('T')[0];

        console.log('Callback received:', cbData, 'chatId:', chatId);

        if (cbData?.startsWith('done_') && chatId) {
          const habitId = cbData.replace('done_', '');

          const { data: habit, error: habitError } = await supabase
            .from('habits')
            .select('*')
            .eq('id', habitId)
            .maybeSingle();

          if (habitError) {
            console.error('Habit lookup error:', habitError);
            await answerCallback(tgBase, cbId, '❌ Habit lookup failed');
            continue;
          }

          if (!habit) {
            await answerCallback(tgBase, cbId, '❌ Habit not found');
            continue;
          }

          const { data: existing, error: existingError } = await supabase
            .from('habit_logs')
            .select('id')
            .eq('habit_id', habitId)
            .eq('date', today)
            .limit(1);

          if (existingError) {
            console.error('Existing log lookup error:', existingError);
            await answerCallback(tgBase, cbId, '❌ Could not check today status');
            continue;
          }

          if (existing && existing.length > 0) {
            await supabase
              .from('habit_reminders')
              .update({ responded: true })
              .eq('habit_id', habitId)
              .eq('date', today);

            await answerCallback(tgBase, cbId, '✅ Already done today!');
            if (messageId) {
              await editMessage(tgBase, chatId, messageId, `✅ <b>"${habit.name}"</b> — already completed today!`);
            }
            continue;
          }

          const { error: logError } = await supabase
            .from('habit_logs')
            .insert({ habit_id: habitId, user_id: habit.user_id, date: today, source: 'telegram' });

          if (logError) {
            console.error('Log insert error:', logError);
            await answerCallback(tgBase, cbId, '❌ Error saving');
            continue;
          }

          const newStreak = habit.current_streak + 1;
          const { error: updateError } = await supabase
            .from('habits')
            .update({
              current_streak: newStreak,
              longest_streak: Math.max(newStreak, habit.longest_streak),
              total_completions: habit.total_completions + 1,
            })
            .eq('id', habitId);

          if (updateError) {
            console.error('Habit update error:', updateError);
            await answerCallback(tgBase, cbId, '⚠️ Saved, but habit stats update failed');
            continue;
          }

          await supabase
            .from('habit_reminders')
            .update({ responded: true })
            .eq('habit_id', habitId)
            .eq('date', today);

          await answerCallback(tgBase, cbId, `✅ Done! Streak: ${newStreak}`);

          if (messageId) {
            await editMessage(tgBase, chatId, messageId, `✅ <b>"${habit.name}"</b> marked complete!\n🔥 Streak: ${newStreak} days`);
          }

          totalProcessed++;
        } else if (cbData?.startsWith('skip_') && chatId) {
          const habitId = cbData.replace('skip_', '');
          const today = new Date().toISOString().split('T')[0];

          const { data: habit } = await supabase
            .from('habits')
            .select('name')
            .eq('id', habitId)
            .maybeSingle();

          await supabase
            .from('habit_reminders')
            .update({ responded: true })
            .eq('habit_id', habitId)
            .eq('date', today);

          await answerCallback(tgBase, cbId, '⏭ Skipped');

          if (messageId) {
            const name = habit?.name || 'Habit';
            await editMessage(tgBase, chatId, messageId, `⏭ <b>"${name}"</b> skipped for today.`);
          }
        } else {
          await answerCallback(tgBase, cbId, '');
        }

        continue;
      }

      const text = update.message?.text;
      const chatId = update.message?.chat?.id;

      if (text && text.startsWith('/done_') && chatId) {
        const habitId = text.replace('/done_', '').trim();
        const today = new Date().toISOString().split('T')[0];

        const { data: habit, error: habitError } = await supabase
          .from('habits')
          .select('*')
          .eq('id', habitId)
          .maybeSingle();

        if (habitError) {
          console.error('Habit lookup error:', habitError);
          await sendMessage(tgBase, chatId, '❌ Habit lookup failed.');
          continue;
        }

        if (!habit) {
          await sendMessage(tgBase, chatId, '❌ Habit not found.');
          continue;
        }

        const { data: existing, error: existingError } = await supabase
          .from('habit_logs')
          .select('id')
          .eq('habit_id', habitId)
          .eq('date', today)
          .limit(1);

        if (existingError) {
          console.error('Existing log lookup error:', existingError);
          await sendMessage(tgBase, chatId, '❌ Could not check today status.');
          continue;
        }

        if (existing && existing.length > 0) {
          await supabase
            .from('habit_reminders')
            .update({ responded: true })
            .eq('habit_id', habitId)
            .eq('date', today);

          await sendMessage(tgBase, chatId, `✅ "${habit.name}" already completed today!`);
          continue;
        }

        const { error: logError } = await supabase
          .from('habit_logs')
          .insert({ habit_id: habitId, user_id: habit.user_id, date: today, source: 'telegram' });

        if (logError) {
          console.error('Log insert error:', logError);
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

        await sendMessage(tgBase, chatId, `✅ <b>"${habit.name}"</b> marked complete!\n🔥 Streak: ${newStreak} days`);
        totalProcessed++;
      }
    }

    const newOffset = Math.max(...updates.map((update: { update_id: number }) => update.update_id)) + 1;
    const { error: offsetError } = await supabase
      .from('telegram_bot_state')
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq('id', 1);

    if (offsetError) {
      return json({ error: offsetError.message }, 500);
    }

    currentOffset = newOffset;

    if (runOnce) break;
  }

  return json({ ok: true, processed: totalProcessed, finalOffset: currentOffset, mode: runOnce ? 'once' : 'poll' });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function answerCallback(tgBase: string, callbackQueryId: string, text: string) {
  const response = await fetch(`${tgBase}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
  await response.text();
}

async function editMessage(tgBase: string, chatId: number, messageId: number, text: string) {
  const response = await fetch(`${tgBase}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' }),
  });
  await response.text();
}

async function sendMessage(tgBase: string, chatId: number, text: string) {
  const response = await fetch(`${tgBase}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  await response.text();
}
