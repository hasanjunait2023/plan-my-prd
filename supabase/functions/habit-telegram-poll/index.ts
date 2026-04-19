import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors';

const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

// Motivational messages pool
const MOTIVATIONS = [
  '💪 দারুণ! তুমি পারবে!',
  '🌟 অসাধারণ! Keep it up!',
  '🚀 You\'re on fire! চালিয়ে যাও!',
  '🎯 One step closer to your goal!',
  '⚡ ভালো কাজ! Consistency is key!',
  '🏆 Champion mindset! 💯',
  '🔥 তুমি তো একটা মেশিন!',
  '💎 Discipline = Freedom!',
  '🌈 প্রতিদিন একটু একটু করে বড় হও!',
  '🎉 Proud of you! এভাবেই চলুক!',
  '✨ Small steps, big results!',
  '🦁 তোমার মনোবল অসাধারণ!',
  '💥 Another one done! Let\'s gooo!',
  '🏅 Winners never quit!',
  '🌟 তুমিই সেরা! Keep grinding!',
  '🔑 Success is built daily!',
  '💪 Discipline beats motivation!',
  '🎯 Focus + Action = Results!',
  '⭐ তুমি তোমার ভবিষ্যৎ তৈরি করছো!',
  '🚀 Unstoppable! কেউ থামাতে পারবে না!',
  '💫 Every habit counts!',
  '🌱 Growing stronger every day!',
  '🏋️ Mental strength building!',
  '🎖️ তুমি একটা warrior!',
  '💎 Diamonds are made under pressure!',
  '🌅 New day, new victory!',
  '🔥 Streak growing! Don\'t stop now!',
  '🎪 Show them what you\'re made of!',
  '🧠 Brain upgrade in progress!',
  '🏔️ Mountain climbers don\'t look down!',
];

const MILESTONE_MESSAGES: Record<number, string> = {
  7: '🔥 7 দিন! তুমি একটা real habit build করছো!',
  14: '⚡ 2 সপ্তাহ! তুমি তো unstoppable!',
  21: '🏆 21 দিন! They say it takes 21 days to form a habit — YOU DID IT!',
  30: '💎 30 দিন! A whole month! তুমি legendary!',
  50: '👑 50 দিন! Half century streak! Incredible!',
  66: '🌟 66 দিন! Science says habit is now AUTOMATIC!',
  100: '💯 100 দিন! TRIPLE DIGITS! তুমি একটা MACHINE!',
  200: '🏅 200 দিন! You\'re in the hall of fame!',
  365: '🎉 365 দিন! ONE FULL YEAR! LEGENDARY STATUS!',
};

// XP calculation (same as HabitRewards.tsx)
function calculateXP(habits: any[]) {
  let totalXP = 0;
  for (const h of habits) {
    totalXP += h.total_completions * 10;
    totalXP += h.current_streak * 2;
  }
  return totalXP;
}

function getLevel(xp: number) {
  if (xp >= 5000) return { name: 'Diamond', icon: '💎' };
  if (xp >= 3000) return { name: 'Platinum', icon: '👑' };
  if (xp >= 1500) return { name: 'Gold', icon: '🥇' };
  if (xp >= 500) return { name: 'Silver', icon: '🥈' };
  if (xp >= 100) return { name: 'Bronze', icon: '🥉' };
  return { name: 'Beginner', icon: '🌱' };
}

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

  // Fetch mind_journal_chat_id for mind journal detection
  const { data: alertSettings } = await supabase
    .from('alert_settings')
    .select('mind_journal_chat_id')
    .limit(1)
    .single();
  const mindChatId = (alertSettings as any)?.mind_journal_chat_id;

  // Get user_id for mind journal inserts
  const { data: mindAccountData } = await supabase
    .from('account_settings')
    .select('user_id')
    .limit(1)
    .single();
  const mindUserId = mindAccountData?.user_id;
  console.log('Mind journal chat ID:', mindChatId, 'User ID:', mindUserId);

  const { data: state, error: stateError } = await supabase
    .from('telegram_bot_state')
    .select('update_offset')
    .eq('id', 1)
    .maybeSingle();

  if (stateError) return json({ error: stateError.message }, 500);

  let currentOffset = state?.update_offset ?? 0;
  if (!state) {
    const { error: seedError } = await supabase
      .from('telegram_bot_state')
      .upsert({ id: 1, update_offset: 0 });
    if (seedError) return json({ error: seedError.message }, 500);
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
      // --- CALLBACK QUERY HANDLING ---
      if (update.callback_query) {
        await handleCallback(supabase, tgBase, update.callback_query);
        totalProcessed++;
        continue;
      }

      const msg = update.message;
      if (!msg) continue;
      const chatId = msg.chat?.id;
      if (!chatId) continue;

      // --- MIND JOURNAL DETECTION ---
      console.log(`Message from chat ${chatId} (type: ${msg.chat?.type}), mindChatId: ${mindChatId}, match: ${String(chatId) === String(mindChatId)}`);
      // If message is from the mind journal chat, save to mind_thoughts
      if (mindChatId && String(chatId) === String(mindChatId) && mindUserId) {
        console.log('MIND JOURNAL: Saving thought from telegram msg', msg.message_id);
        await saveMindThought(supabase, tgBase, BOT_TOKEN, msg, mindUserId);
        totalProcessed++;
        continue;
      }

      // --- PHOTO HANDLING ---
      if (msg.photo && msg.photo.length > 0) {
        await handlePhoto(supabase, tgBase, BOT_TOKEN, chatId, msg);
        totalProcessed++;
        continue;
      }

      const text = msg.text?.trim();
      if (!text) continue;

      // --- COMMAND HANDLING ---
      if (text === '/status') {
        await handleStatusCommand(supabase, tgBase, chatId);
        totalProcessed++;
      } else if (text === '/list') {
        await handleListCommand(supabase, tgBase, chatId);
        totalProcessed++;
      } else if (text === '/streak') {
        await handleStreakCommand(supabase, tgBase, chatId);
        totalProcessed++;
      } else if (text === '/help' || text === '/start') {
        await handleHelpCommand(tgBase, chatId);
        totalProcessed++;
      } else if (text.startsWith('/done_')) {
        await handleDoneCommand(supabase, tgBase, chatId, text);
        totalProcessed++;
      } else if (text.startsWith('/proof_')) {
        // Store photo expectation — next photo will be linked to this habit
        const habitId = text.replace('/proof_', '').trim();
        // We'll use a simple approach: store in callback data
        await sendMessage(tgBase, chatId, '📸 এখন habit এর photo/screenshot পাঠাও।\nPhoto পাঠালে এটি proof হিসেবে save হবে।');
      }
    }

    const newOffset = Math.max(...updates.map((u: { update_id: number }) => u.update_id)) + 1;
    const { error: offsetError } = await supabase
      .from('telegram_bot_state')
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq('id', 1);

    if (offsetError) return json({ error: offsetError.message }, 500);
    currentOffset = newOffset;
    if (runOnce) break;
  }

  return json({ ok: true, processed: totalProcessed, finalOffset: currentOffset, mode: runOnce ? 'once' : 'poll' });
});

// ============ COMMAND HANDLERS ============

async function handleStatusCommand(supabase: any, tgBase: string, chatId: number) {
  const today = new Date().toISOString().split('T')[0];
  const { data: habits = [] } = await supabase.from('habits').select('*').eq('active', true);
  if (!habits || habits.length === 0) {
    await sendMessage(tgBase, chatId, '📋 কোন active habit নেই।');
    return;
  }

  const { data: todayLogs = [] } = await supabase.from('habit_logs').select('habit_id').eq('date', today);
  const completedIds = new Set((todayLogs || []).map((l: any) => l.habit_id));

  const done = habits.filter((h: any) => completedIds.has(h.id));
  const pending = habits.filter((h: any) => !completedIds.has(h.id));
  const rate = Math.round((done.length / habits.length) * 100);

  let msg = `📊 <b>আজকের Progress</b> — ${today}\n\n`;
  msg += `✅ ${done.length}/${habits.length} (${rate}%)\n\n`;

  if (done.length > 0) {
    msg += `<b>✅ Done:</b>\n`;
    done.forEach((h: any) => { msg += `  • ${h.name} (🔥${h.current_streak})\n`; });
    msg += '\n';
  }

  if (pending.length > 0) {
    msg += `<b>⏳ Pending:</b>\n`;
    pending.forEach((h: any) => { msg += `  • ${h.name}\n`; });
  }

  // Add inline buttons for pending habits
  const keyboard = pending.map((h: any) => ([
    { text: `✅ ${h.name}`, callback_data: `done_${h.id}` },
  ]));

  if (keyboard.length > 0) {
    await sendMessageWithKeyboard(tgBase, chatId, msg, keyboard);
  } else {
    msg += '\n🌟 All habits done! You\'re unstoppable!';
    await sendMessage(tgBase, chatId, msg);
  }
}

async function handleListCommand(supabase: any, tgBase: string, chatId: number) {
  const { data: habits = [] } = await supabase.from('habits').select('*').eq('active', true).order('sort_order');
  if (!habits || habits.length === 0) {
    await sendMessage(tgBase, chatId, '📋 কোন active habit নেই।');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const { data: todayLogs = [] } = await supabase.from('habit_logs').select('habit_id').eq('date', today);
  const completedIds = new Set((todayLogs || []).map((l: any) => l.habit_id));

  let msg = `📋 <b>All Active Habits</b>\n\n`;
  const keyboard: any[][] = [];

  habits.forEach((h: any, i: number) => {
    const isDone = completedIds.has(h.id);
    const status = isDone ? '✅' : '⬜';
    msg += `${i + 1}. ${status} <b>${h.name}</b> — 🔥${h.current_streak} streak\n`;
    if (h.description) msg += `    <i>${h.description}</i>\n`;

    if (!isDone) {
      keyboard.push([{ text: `✅ Complete: ${h.name}`, callback_data: `done_${h.id}` }]);
    }
  });

  if (keyboard.length > 0) {
    await sendMessageWithKeyboard(tgBase, chatId, msg, keyboard);
  } else {
    msg += '\n🎉 সব habit complete!';
    await sendMessage(tgBase, chatId, msg);
  }
}

async function handleStreakCommand(supabase: any, tgBase: string, chatId: number) {
  const { data: habits = [] } = await supabase.from('habits').select('*').eq('active', true);
  if (!habits || habits.length === 0) {
    await sendMessage(tgBase, chatId, '📋 কোন active habit নেই।');
    return;
  }

  const totalXP = calculateXP(habits);
  const level = getLevel(totalXP);
  const sorted = [...habits].sort((a: any, b: any) => b.current_streak - a.current_streak);

  let msg = `🏆 <b>Streak Leaderboard</b>\n\n`;
  msg += `${level.icon} Level: <b>${level.name}</b> | ⚡ XP: <b>${totalXP}</b>\n\n`;

  sorted.forEach((h: any, i: number) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  •';
    msg += `${medal} <b>${h.name}</b> — 🔥${h.current_streak} days`;
    if (h.longest_streak > h.current_streak) {
      msg += ` (best: ${h.longest_streak})`;
    }
    msg += `\n`;
  });

  const totalCompletions = habits.reduce((s: number, h: any) => s + h.total_completions, 0);
  msg += `\n📊 Total completions: <b>${totalCompletions}</b>`;

  await sendMessage(tgBase, chatId, msg);
}

async function handleHelpCommand(tgBase: string, chatId: number) {
  const msg = `🤖 <b>Habit Bot Commands</b>\n\n` +
    `/status — আজকের habit progress দেখো\n` +
    `/list — সব active habits দেখো + complete করো\n` +
    `/streak — Streak leaderboard + XP + Level\n` +
    `/help — এই help message\n\n` +
    `📸 Photo পাঠালে habit proof হিসেবে save হবে\n` +
    `🔔 Reminders আসলে Done/Skip button চাপো`;

  await sendMessage(tgBase, chatId, msg);
}

async function handleDoneCommand(supabase: any, tgBase: string, chatId: number, text: string) {
  const habitId = text.replace('/done_', '').trim();
  const today = new Date().toISOString().split('T')[0];

  const { data: habit } = await supabase.from('habits').select('*').eq('id', habitId).maybeSingle();
  if (!habit) {
    await sendMessage(tgBase, chatId, '❌ Habit not found.');
    return;
  }

  const { data: existing } = await supabase.from('habit_logs').select('id').eq('habit_id', habitId).eq('date', today).limit(1);
  if (existing && existing.length > 0) {
    await sendMessage(tgBase, chatId, `✅ "${habit.name}" already completed today!`);
    return;
  }

  await supabase.from('habit_logs').insert({ habit_id: habitId, user_id: habit.user_id, date: today, source: 'telegram' });

  const newStreak = habit.current_streak + 1;
  await supabase.from('habits').update({
    current_streak: newStreak,
    longest_streak: Math.max(newStreak, habit.longest_streak),
    total_completions: habit.total_completions + 1,
  }).eq('id', habitId);

  await supabase.from('habit_reminders').update({ responded: true }).eq('habit_id', habitId).eq('date', today);

  // Send completion message with motivation
  let reply = `✅ <b>"${habit.name}"</b> marked complete!\n🔥 Streak: ${newStreak} days\n\n`;

  // Check milestone
  if (MILESTONE_MESSAGES[newStreak]) {
    reply += MILESTONE_MESSAGES[newStreak];
  } else {
    reply += MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
  }

  // Check perfect day
  await checkPerfectDay(supabase, tgBase, chatId, reply);
}

// ============ CALLBACK HANDLER ============

async function handleCallback(supabase: any, tgBase: string, cb: any) {
  const cbData = cb.data;
  const cbId = cb.id;
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  const today = new Date().toISOString().split('T')[0];

  // ============ ROUTE: Rules check-in callbacks ============
  if (cbData?.startsWith('rules_chk:')) {
    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      await fetch(`${SUPABASE_URL}/functions/v1/rules-telegram-checkin-poll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ callback_query: cb }),
      });
    } catch (e) {
      console.error('rules_chk forward error', e);
    }
    return;
  }

  const waqtLabels: Record<string, string> = { fajr: 'ফজর', dhuhr: 'যোহর', asr: 'আসর', maghrib: 'মাগরিব', isha: 'এশা' };
  const waqtNames: Record<string, string[]> = {
    fajr: ['ফজর', 'Fajr', 'fajr'],
    dhuhr: ['যোহর', 'Dhuhr', 'dhuhr', 'Zuhr', 'zuhr'],
    asr: ['আসর', 'Asr', 'asr'],
    maghrib: ['মাগরিব', 'Maghrib', 'maghrib'],
    isha: ['এশা', 'Isha', 'isha'],
  };

  const parseNamazCallback = (prefix: string) => {
    const raw = cbData?.replace(prefix, '') ?? '';
    const [waqt, ...rest] = raw.split('_');
    return { waqt, embeddedHabitId: rest.join('_') || null };
  };

  const resolveNamazHabit = async (waqt: string, embeddedHabitId?: string | null) => {
    if (embeddedHabitId) {
      const { data: directHabit } = await supabase.from('habits').select('*').eq('id', embeddedHabitId).maybeSingle();
      if (directHabit) return directHabit;
    }

    const aliases = waqtNames[waqt] || [];
    if (aliases.length === 0) return null;

    const { data: activeHabits = [] } = await supabase
      .from('habits')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    return activeHabits.find((habit: any) =>
      aliases.some(alias => habit.name?.toLowerCase().includes(alias.toLowerCase()))
    ) ?? null;
  };

  if (cbData?.startsWith('done_namaz_') && chatId) {
    const { waqt, embeddedHabitId } = parseNamazCallback('done_namaz_');
    const habit = await resolveNamazHabit(waqt, embeddedHabitId);

    if (!habit) {
      console.error('Namaz habit not found for callback', JSON.stringify({ cbData, waqt, embeddedHabitId, chatId }));
      await answerCallback(tgBase, cbId, '❌ Habit not found');
      return;
    }

    const { data: existing } = await supabase.from('habit_logs').select('id').eq('habit_id', habit.id).eq('date', today).limit(1);
    if (existing && existing.length > 0) {
      await answerCallback(tgBase, cbId, '✅ ইতিমধ্যে আদায় করা হয়েছে!');
      if (messageId) await editMessage(tgBase, chatId, messageId, `✅ <b>${waqtLabels[waqt] || waqt} নামাজ</b> — ইতিমধ্যে আদায় করা হয়েছে!`);
      return;
    }

    await supabase.from('habit_logs').insert({ habit_id: habit.id, user_id: habit.user_id, date: today, source: 'telegram', notes: `${waqtLabels[waqt] || waqt} নামাজ আদায়` });

    const newStreak = habit.current_streak + 1;
    await supabase.from('habits').update({
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, habit.longest_streak),
      total_completions: habit.total_completions + 1,
    }).eq('id', habit.id);

    await supabase.from('habit_reminders').update({ responded: true }).eq('habit_id', habit.id).eq('date', today);
    await answerCallback(tgBase, cbId, `✅ ${waqtLabels[waqt] || waqt} আদায় করা হয়েছে!`);

    let reply = `✅ <b>${waqtLabels[waqt] || waqt} নামাজ</b> আদায় করা হয়েছে!\n🔥 Streak: ${newStreak} days\n\n`;
    if (MILESTONE_MESSAGES[newStreak]) {
      reply += MILESTONE_MESSAGES[newStreak];
    } else {
      reply += MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
    }
    if (messageId) await editMessage(tgBase, chatId, messageId, reply);

  } else if (cbData?.startsWith('skip_namaz_') && chatId) {
    const { waqt, embeddedHabitId } = parseNamazCallback('skip_namaz_');
    const habit = await resolveNamazHabit(waqt, embeddedHabitId);

    if (habit) {
      await supabase.from('habit_reminders').update({ responded: true }).eq('habit_id', habit.id).eq('date', today);
    } else if (embeddedHabitId) {
      await supabase.from('habit_reminders').update({ responded: true }).eq('habit_id', embeddedHabitId).eq('date', today);
    }

    await answerCallback(tgBase, cbId, `⏭️ ${waqtLabels[waqt] || waqt} skipped`);
    if (messageId) await editMessage(tgBase, chatId, messageId, `⏭️ <b>${waqtLabels[waqt] || waqt} নামাজ</b> — আজ আদায় করা হয়নি।\n\n🤲 পরের ওয়াক্তে ইনশাআল্লাহ।`);

  } else if (cbData?.startsWith('focus_done_') && chatId) {
    // ============ LIFE OS FOCUS COMPLETE ============
    const focusId = cbData.replace('focus_done_', '');
    const { data: focus } = await supabase
      .from('daily_focus')
      .select('id,user_id,node_id,date,rank')
      .eq('id', focusId)
      .maybeSingle();
    if (!focus) {
      await answerCallback(tgBase, cbId, '❌ Focus not found');
      return;
    }
    const { data: node } = await supabase
      .from('life_nodes')
      .select('title')
      .eq('id', focus.node_id)
      .maybeSingle();
    // Upsert log for that node + date
    const { data: existingLog } = await supabase
      .from('life_node_logs')
      .select('id,done')
      .eq('user_id', focus.user_id)
      .eq('node_id', focus.node_id)
      .eq('date', focus.date)
      .maybeSingle();
    if (existingLog) {
      if (!existingLog.done) {
        await supabase.from('life_node_logs').update({ done: true }).eq('id', existingLog.id);
      }
    } else {
      await supabase.from('life_node_logs').insert({
        user_id: focus.user_id,
        node_id: focus.node_id,
        date: focus.date,
        done: true,
      });
    }
    await answerCallback(tgBase, cbId, `✅ #${focus.rank} done!`);
    if (messageId) {
      await editMessage(
        tgBase,
        chatId,
        messageId,
        `✅ <b>Priority #${focus.rank}: ${node?.title || 'Task'}</b>\n\nMarked complete. Keep the momentum 🔥`,
      );
    }
    return;

  } else if (cbData?.startsWith('focus_skip_') && chatId) {
    const focusId = cbData.replace('focus_skip_', '');
    const { data: focus } = await supabase
      .from('daily_focus')
      .select('id,node_id,rank')
      .eq('id', focusId)
      .maybeSingle();
    const { data: node } = focus
      ? await supabase.from('life_nodes').select('title').eq('id', focus.node_id).maybeSingle()
      : { data: null };
    await answerCallback(tgBase, cbId, '⏭ Skipped');
    if (messageId) {
      await editMessage(
        tgBase,
        chatId,
        messageId,
        `⏭ <b>Priority #${focus?.rank ?? ''}: ${node?.title || 'Task'}</b>\n\nSkipped for today.`,
      );
    }
    return;

  } else if (cbData?.startsWith('done_') && chatId) {
    const habitId = cbData.replace('done_', '');
    const { data: habit } = await supabase.from('habits').select('*').eq('id', habitId).maybeSingle();

    if (!habit) {
      await answerCallback(tgBase, cbId, '❌ Habit not found');
      return;
    }

    const { data: existing } = await supabase.from('habit_logs').select('id').eq('habit_id', habitId).eq('date', today).limit(1);
    if (existing && existing.length > 0) {
      await supabase.from('habit_reminders').update({ responded: true }).eq('habit_id', habitId).eq('date', today);
      await answerCallback(tgBase, cbId, '✅ Already done today!');
      if (messageId) await editMessage(tgBase, chatId, messageId, `✅ <b>"${habit.name}"</b> — already completed today!`);
      return;
    }

    await supabase.from('habit_logs').insert({ habit_id: habitId, user_id: habit.user_id, date: today, source: 'telegram' });

    const newStreak = habit.current_streak + 1;
    await supabase.from('habits').update({
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, habit.longest_streak),
      total_completions: habit.total_completions + 1,
    }).eq('id', habitId);

    await supabase.from('habit_reminders').update({ responded: true }).eq('habit_id', habitId).eq('date', today);
    await answerCallback(tgBase, cbId, `✅ Done! Streak: ${newStreak}`);

    let reply = `✅ <b>"${habit.name}"</b> marked complete!\n🔥 Streak: ${newStreak} days\n\n`;
    if (MILESTONE_MESSAGES[newStreak]) {
      reply += MILESTONE_MESSAGES[newStreak];
    } else {
      reply += MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
    }

    if (messageId) await editMessage(tgBase, chatId, messageId, reply);

    const { data: habits = [] } = await supabase.from('habits').select('id').eq('active', true);
    const { data: todayLogs = [] } = await supabase.from('habit_logs').select('habit_id').eq('date', today);
    const completedIds = new Set((todayLogs || []).map((l: any) => l.habit_id));
    const allDone = habits.every((h: any) => completedIds.has(h.id));
    if (allDone && habits.length > 0) {
      await sendMessage(tgBase, chatId, '🌟🎉 <b>PERFECT DAY!</b> সব habit complete! তুমি একটা legend! 🏆');
    }

  } else if (cbData?.startsWith('skip_') && chatId) {
    const habitId = cbData.replace('skip_', '');
    const { data: habit } = await supabase.from('habits').select('name').eq('id', habitId).maybeSingle();
    await supabase.from('habit_reminders').update({ responded: true }).eq('habit_id', habitId).eq('date', today);
    await answerCallback(tgBase, cbId, '⏭ Skipped');
    if (messageId) {
      await editMessage(tgBase, chatId, messageId, `⏭ <b>"${habit?.name || 'Habit'}"</b> skipped for today.`);
    }

  } else if (cbData?.startsWith('proof_') && chatId) {
    const habitId = cbData.replace('proof_', '');
    const { data: habit } = await supabase.from('habits').select('name').eq('id', habitId).maybeSingle();
    await answerCallback(tgBase, cbId, `📸 Photo saved for ${habit?.name || 'habit'}`);

  } else {
    await answerCallback(tgBase, cbId, '');
  }
}

// ============ PHOTO HANDLER ============

async function handlePhoto(supabase: any, tgBase: string, botToken: string, chatId: number, msg: any) {
  // Get the largest photo
  const photo = msg.photo[msg.photo.length - 1];
  const fileId = photo.file_id;

  // Get file info
  const fileResp = await fetch(`${tgBase}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  });
  const fileData = await fileResp.json();
  if (!fileData.ok) {
    await sendMessage(tgBase, chatId, '❌ Photo download failed.');
    return;
  }

  const filePath = fileData.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  const fileResp2 = await fetch(downloadUrl);
  if (!fileResp2.ok) {
    await sendMessage(tgBase, chatId, '❌ Photo download failed.');
    return;
  }

  const fileBytes = await fileResp2.arrayBuffer();
  const ext = filePath.split('.').pop() || 'jpg';
  const fileName = `${chatId}/${Date.now()}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('habit-proofs')
    .upload(fileName, fileBytes, { contentType: `image/${ext}`, upsert: false });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    await sendMessage(tgBase, chatId, '❌ Photo save failed.');
    return;
  }

  const { data: urlData } = supabase.storage.from('habit-proofs').getPublicUrl(fileName);
  const publicUrl = urlData?.publicUrl;

  // Ask which habit this proof is for
  const today = new Date().toISOString().split('T')[0];
  const { data: habits = [] } = await supabase.from('habits').select('*').eq('active', true);
  const { data: todayLogs = [] } = await supabase.from('habit_logs').select('habit_id').eq('date', today);
  const completedIds = new Set((todayLogs || []).map((l: any) => l.habit_id));

  // Find pending habits first, then completed ones
  const pending = habits.filter((h: any) => !completedIds.has(h.id));
  const allHabits = [...pending, ...habits.filter((h: any) => completedIds.has(h.id))];

  if (allHabits.length === 0) {
    await sendMessage(tgBase, chatId, '📸 Photo saved! কিন্তু কোন active habit নেই।');
    return;
  }

  // If only one pending habit, auto-assign
  if (pending.length === 1) {
    const habit = pending[0];
    // Complete the habit and attach proof
    if (!completedIds.has(habit.id)) {
      await supabase.from('habit_logs').insert({
        habit_id: habit.id, user_id: habit.user_id, date: today, source: 'telegram', proof_url: publicUrl
      });
      const newStreak = habit.current_streak + 1;
      await supabase.from('habits').update({
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, habit.longest_streak),
        total_completions: habit.total_completions + 1,
      }).eq('id', habit.id);

      let reply = `📸✅ <b>"${habit.name}"</b> completed with photo proof!\n🔥 Streak: ${newStreak} days\n\n`;
      if (MILESTONE_MESSAGES[newStreak]) reply += MILESTONE_MESSAGES[newStreak];
      else reply += MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
      await sendMessage(tgBase, chatId, reply);
    }
    return;
  }

  // Multiple habits — ask user to pick
  const keyboard = allHabits.slice(0, 8).map((h: any) => {
    const isDone = completedIds.has(h.id);
    return [{ text: `${isDone ? '✅' : '📸'} ${h.name}`, callback_data: `proof_${h.id}` }];
  });

  // Store the photo URL temporarily — we'll use caption or just save the URL
  // For simplicity, save the latest log's proof_url when they pick
  // Store photo URL in a simple way: update the most recent log or create one
  await sendMessageWithKeyboard(tgBase, chatId, '📸 Photo received! কোন habit এর জন্য?', keyboard);

  // For now, save proof_url to the most recent log of today for the first pending habit
  if (pending.length > 0 && publicUrl) {
    const { data: log } = await supabase.from('habit_logs')
      .select('id').eq('date', today).limit(1).maybeSingle();
    if (log) {
      await supabase.from('habit_logs').update({ proof_url: publicUrl }).eq('id', log.id);
    }
  }
}

// ============ PERFECT DAY CHECK ============

async function checkPerfectDay(supabase: any, tgBase: string, chatId: number, baseReply: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data: habits = [] } = await supabase.from('habits').select('id').eq('active', true);
  const { data: todayLogs = [] } = await supabase.from('habit_logs').select('habit_id').eq('date', today);
  const completedIds = new Set((todayLogs || []).map((l: any) => l.habit_id));
  const allDone = habits.every((h: any) => completedIds.has(h.id));

  if (allDone && habits.length > 0) {
    baseReply += '\n\n🌟🎉 <b>PERFECT DAY!</b> সব habit complete! তুমি একটা legend! 🏆';
  }

  await sendMessage(tgBase, chatId, baseReply);
}

// ============ MIND JOURNAL HELPER ============

async function saveMindThought(supabase: any, tgBase: string, botToken: string, msg: any, userId: string) {
  const messageId = msg.message_id;
  console.log(`saveMindThought called: msg_id=${messageId}, userId=${userId}`);

  // Check for duplicate
  const { data: existing, error: dupError } = await supabase
    .from('mind_thoughts')
    .select('id')
    .eq('telegram_message_id', messageId)
    .limit(1);

  console.log(`Duplicate check: existing=${JSON.stringify(existing)}, error=${dupError?.message}`);
  if (existing && existing.length > 0) return;

  let imageUrl: string | null = null;
  const caption = msg.caption || msg.text || '';

  // Handle photo
  if (msg.photo && msg.photo.length > 0) {
    const largestPhoto = msg.photo[msg.photo.length - 1];
    try {
      const fileResp = await fetch(`${tgBase}/getFile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: largestPhoto.file_id }),
      });
      const fileData = await fileResp.json();
      if (fileResp.ok && fileData.result?.file_path) {
        const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
        const downloadResp = await fetch(downloadUrl);
        if (downloadResp.ok) {
          const fileBytes = await downloadResp.arrayBuffer();
          const fileName = `tg_${messageId}_${Date.now()}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('mind-images')
            .upload(fileName, fileBytes, { contentType: 'image/jpeg' });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('mind-images').getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
          }
        }
      }
    } catch (err) {
      console.error('Failed to download telegram photo for mind journal:', err);
    }
  }

  if (!caption && !imageUrl) return;

  const msgDate = new Date(msg.date * 1000);
  const dateStr = msgDate.toISOString().split('T')[0];

  const { error } = await supabase.from('mind_thoughts').insert({
    user_id: userId,
    content: caption,
    image_url: imageUrl,
    source: 'telegram',
    telegram_message_id: messageId,
    tags: [],
    date: dateStr,
  });

  if (!error) {
    console.log(`Mind thought saved from telegram: msg_id=${messageId}`);
  } else {
    console.error('Failed to save mind thought:', error.message);
  }
}

// ============ TELEGRAM HELPERS ============

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function answerCallback(tgBase: string, callbackQueryId: string, text: string) {
  await fetch(`${tgBase}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function editMessage(tgBase: string, chatId: number, messageId: number, text: string) {
  await fetch(`${tgBase}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' }),
  });
}

async function sendMessage(tgBase: string, chatId: number, text: string) {
  await fetch(`${tgBase}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

async function sendMessageWithKeyboard(tgBase: string, chatId: number, text: string, keyboard: any[][]) {
  await fetch(`${tgBase}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard },
    }),
  });
}
