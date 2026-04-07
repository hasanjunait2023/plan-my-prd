import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ error: 'No bot token' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const userId = 'd44ffc42-a554-44de-ac70-913a0c7bdab3';
  const chatId = 5884335011;
  const today = new Date().toISOString().split('T')[0];

  // Step 1: Create a test habit
  const { data: habit, error: habitErr } = await supabase
    .from('habits')
    .insert({
      name: 'Morning Journal ☀️',
      description: 'Write 3 things you are grateful for',
      user_id: userId,
      submission_time: '07:00',
      timezone: 'Asia/Dhaka',
    })
    .select()
    .single();

  if (habitErr) {
    return new Response(JSON.stringify({ error: habitErr.message, step: 'insert_habit' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('Created habit:', habit.id, habit.name);

  // Step 2: Send Telegram message with Yes/No buttons
  const tgBase = `https://api.telegram.org/bot${BOT_TOKEN}`;
  const msgText = `⏰ <b>Habit Reminder</b>\n\n📋 <b>${habit.name}</b>\n${habit.description}\n\nDid you complete this today?`;

  const sendResp = await fetch(`${tgBase}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: msgText,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Yes', callback_data: `done_${habit.id}` },
          { text: '❌ No', callback_data: `skip_${habit.id}` },
        ]],
      },
    }),
  });

  const sendData = await sendResp.json();
  console.log('Telegram send result:', JSON.stringify(sendData));

  if (!sendResp.ok) {
    return new Response(JSON.stringify({ error: sendData, step: 'send_telegram' }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Step 3: Insert reminder record
  await supabase.from('habit_reminders').insert({
    habit_id: habit.id,
    date: today,
  });

  return new Response(JSON.stringify({
    ok: true,
    habit_id: habit.id,
    habit_name: habit.name,
    message_id: sendData.result?.message_id,
    instruction: 'Now click Yes/No button in Telegram, then call habit-telegram-poll with {"run_once": true}',
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
