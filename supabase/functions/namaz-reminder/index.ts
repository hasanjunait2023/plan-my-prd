import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors';

// ৫ ওয়াক্ত নামাজের জামাতের সময় (BD time — Asia/Dhaka UTC+6)
const PRAYER_TIMES: Record<string, { hour: number; minute: number; label: string; emoji: string }> = {
  fajr:    { hour: 5,  minute: 10, label: 'ফজর',   emoji: '🌅' },
  dhuhr:   { hour: 13, minute: 15, label: 'যোহর',   emoji: '☀️' },
  asr:     { hour: 17, minute: 0,  label: 'আসর',   emoji: '🌤️' },
  maghrib: { hour: 18, minute: 27, label: 'মাগরিব', emoji: '🌇' },
  isha:    { hour: 20, minute: 30, label: 'এশা',    emoji: '🌙' },
};

const REMINDER_MINUTES_BEFORE = 15;

// 40+ Islamic quotes — Quran, Hadith, emotional
const ISLAMIC_QUOTES = [
  '"নিশ্চয়ই নামাজ মুমিনদের উপর নির্দিষ্ট সময়ে ফরজ।"\n— সূরা নিসা ৪:১০৩',
  '"নামাজ হলো মুমিনের মি\'রাজ।"\n— হাদীস',
  '"যে ব্যক্তি ফজরের নামাজ পড়লো, সে আল্লাহর জিম্মায় রইলো।"\n— সহীহ মুসলিম',
  '"তোমরা নামাজ কায়েম করো, নিশ্চয়ই নামাজ অশ্লীল ও মন্দ কাজ থেকে বিরত রাখে।"\n— সূরা আনকাবুত ২৯:৪৫',
  '"পাঁচ ওয়াক্ত নামাজ তোমাদের দরজার সামনে বয়ে যাওয়া নদীর মতো — দিনে পাঁচবার গোসল করলে কি ময়লা থাকে?"\n— সহীহ বুখারী',
  '"কিয়ামতের দিন সর্বপ্রথম নামাজের হিসাব নেওয়া হবে।"\n— তিরমিযী',
  '"নামাজ ত্যাগকারী ব্যক্তি আল্লাহর কাছে সবচেয়ে ঘৃণ্য।"\n— হাদীস',
  '"আমাকে সেজদায় সবচেয়ে কাছে পাওয়া যায় — তাই সেজদায় বেশি বেশি দু\'আ করো।"\n— সহীহ মুসলিম',
  '"যে ব্যক্তি জামাতে নামাজ পড়ে, তার নামাজের সওয়াব ২৭ গুণ বেশি।"\n— সহীহ বুখারী',
  '"দু\'ওয়াক্ত নামাজ মুনাফিকদের জন্য সবচেয়ে কঠিন — ফজর ও এশা।"\n— সহীহ বুখারী',
  '"নামাজ হলো ঈমান ও কুফরের মধ্যে পার্থক্য।"\n— সহীহ মুসলিম',
  '"তুমি যখন নামাজে দাঁড়াও, তখন আল্লাহ তোমার দিকে তাকিয়ে থাকেন।"\n— হাদীস',
  '"নামাজ ছেড়ে দিয়ো না — নামাজই তোমাকে আল্লাহর সাথে যুক্ত রাখে।"\n— উপদেশ',
  '"আল্লাহ বলেন: আমার বান্দা আমাকে স্মরণ করলে আমি তাকে স্মরণ করি।"\n— সূরা বাকারা ২:১৫২',
  '"তোমরা ধৈর্য ও নামাজের মাধ্যমে সাহায্য প্রার্থনা করো।"\n— সূরা বাকারা ২:৪৫',
  '"সেজদায় বান্দা আল্লাহর সবচেয়ে নিকটে থাকে।"\n— সহীহ মুসলিম',
  '"যে ব্যক্তি ৪০ দিন জামাতে প্রথম তাকবীরের সাথে নামাজ পড়ে, তার জন্য দুটো মুক্তি — জাহান্নাম থেকে ও মুনাফিকী থেকে।"\n— তিরমিযী',
  '"আল্লাহ তাআলা বলেন: নামাজ আমার ও আমার বান্দার মধ্যে ভাগ করা হয়েছে।"\n— সহীহ মুসলিম',
  '"নামাজ হলো জান্নাতের চাবি।"\n— হাদীস',
  '"যে ফজর ও আসরের নামাজ সংরক্ষণ করে, সে জান্নাতে প্রবেশ করবে।"\n— সহীহ বুখারী',
  '"আল্লাহ সুবহানাহু ওয়া তাআলা তোমার প্রতিটি সেজদায় তোমার একটি গুনাহ মাফ করেন এবং একটি মর্যাদা বাড়িয়ে দেন।"\n— সহীহ মুসলিম',
  '"তুমি নামাজে দাঁড়ালে আল্লাহর সাথে কথা বলো — তাই সুন্দর করে দাঁড়াও।"\n— ইবনুল কাইয়্যিম',
  '"নামাজ ছাড়া কোনো দিন সফল হয় না।"\n— আত্মউন্নয়ন',
  '"তুমি যদি আল্লাহকে ভালোবাসো, তাহলে তাঁর কাছে পাঁচবার হাজির হও।"\n— উপদেশ',
  '"নামাজ তোমাকে শান্তি দেবে — দুনিয়ার কোলাহলে এটাই তোমার আশ্রয়।"\n— উপদেশ',
  '"জীবনের সেরা বিনিয়োগ হলো নামাজ — রিটার্ন আখিরাতে পাবে।"\n— উপদেশ',
  '"আজকের নামাজ আগামীকালের তাকদীর পরিবর্তন করতে পারে।"\n— উপদেশ',
  '"আল্লাহ তোমার উপর ৫ ওয়াক্ত ফরজ করেছেন — এটা বোঝা নয়, এটা সম্মান।"\n— উপদেশ',
  '"নামাজের মাধ্যমে তুমি তোমার রবের কাছে পৌঁছাতে পারবে — এটাই তোমার সিঁড়ি।"\n— উপদেশ',
  '"মসজিদে যাওয়ার প্রতিটি পদক্ষেপে একটি সওয়াব লেখা হয় এবং একটি গুনাহ মুছে যায়।"\n— সহীহ মুসলিম',
  '"নামাজ পড়ো যেন তুমি আল্লাহকে দেখছো — না পারলে মনে রাখো তিনি তোমাকে দেখছেন।"\n— জিবরীলের হাদীস',
  '"তুমি কি জানো সেজদায় তোমার মাথা কার সামনে রাখো? সারা বিশ্বের মালিকের সামনে!"\n— উপদেশ',
  '"নামাজ ছাড়া জীবন আছে, কিন্তু জীবনে বরকত নেই।"\n— উপদেশ',
  '"আল্লাহ তোমাকে ৫ বার ডাকছেন — সে ডাকে সাড়া দাও।"\n— উপদেশ',
  '"প্রতিটি নামাজ তোমার আখিরাতের জন্য একটি ইনভেস্টমেন্ট।"\n— উপদেশ',
  '"তুমি যতই ব্যস্ত থাকো, আল্লাহর জন্য ৫ মিনিট বের করো — তিনি তোমার ২৪ ঘণ্টায় বরকত দেবেন।"\n— উপদেশ',
  '"মসজিদের দিকে হেঁটে যাওয়া মানে জান্নাতের দিকে এক পা এগিয়ে যাওয়া।"\n— উপদেশ',
  '"নামাজে দাঁড়ানো মানে দুনিয়ার সব চিন্তা আল্লাহর কাছে জমা দেওয়া।"\n— উপদেশ',
  '"তোমার সবচেয়ে শক্তিশালী হাতিয়ার হলো সেজদা — ব্যবহার করো।"\n— উপদেশ',
  '"আজকের নামাজ কাজার করো না — কালকের কোনো গ্যারান্টি নেই।"\n— উপদেশ',
];

// Get a unique quote based on day + waqt index
function getQuote(waqtIndex: number): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const idx = (dayOfYear * 5 + waqtIndex + now.getFullYear()) % ISLAMIC_QUOTES.length;
  return ISLAMIC_QUOTES[idx];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY');
  const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Current time in BD (UTC+6)
  const nowUTC = new Date();
  const bdTime = new Date(nowUTC.getTime() + 6 * 60 * 60 * 1000);
  const bdHour = bdTime.getUTCHours();
  const bdMinute = bdTime.getUTCMinutes();
  const todayStr = bdTime.toISOString().split('T')[0];

  const waqtKeys = Object.keys(PRAYER_TIMES);
  let triggered: string | null = null;
  let waqtIndex = 0;

  for (let i = 0; i < waqtKeys.length; i++) {
    const key = waqtKeys[i];
    const pt = PRAYER_TIMES[key];
    // Calculate reminder time = prayer_time - 15 minutes
    let reminderHour = pt.hour;
    let reminderMinute = pt.minute - REMINDER_MINUTES_BEFORE;
    if (reminderMinute < 0) {
      reminderMinute += 60;
      reminderHour -= 1;
    }

    if (bdHour === reminderHour && bdMinute === reminderMinute) {
      triggered = key;
      waqtIndex = i;
      break;
    }
  }

  if (!triggered) {
    return new Response(JSON.stringify({ ok: true, message: 'Not prayer reminder time', bdTime: `${bdHour}:${bdMinute}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const pt = PRAYER_TIMES[triggered];

  // Check if already sent today for this waqt
  const { data: existing } = await supabase
    .from('namaz_reminders')
    .select('id')
    .eq('waqt', triggered)
    .eq('date', todayStr)
    .limit(1);

  if (existing && existing.length > 0) {
    return new Response(JSON.stringify({ ok: true, message: `Already sent for ${triggered} today` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const quote = getQuote(waqtIndex);

  // Find whether a matching namaz habit exists for this waqt
  const waqtNames: Record<string, string[]> = {
    fajr: ['ফজর', 'Fajr', 'fajr'],
    dhuhr: ['যোহর', 'Dhuhr', 'dhuhr', 'Zuhr', 'zuhr'],
    asr: ['আসর', 'Asr', 'asr'],
    maghrib: ['মাগরিব', 'Maghrib', 'maghrib'],
    isha: ['এশা', 'Isha', 'isha'],
  };

  const { data: allHabits } = await supabase
    .from('habits')
    .select('name')
    .eq('active', true)
    .order('created_at', { ascending: false });

  const searchNames = waqtNames[triggered] || [];
  const hasMatchingHabit = Boolean(allHabits?.some((h: any) =>
    searchNames.some(n => h.name.toLowerCase().includes(n.toLowerCase()))
  ));
...
        if (hasMatchingHabit) {
          keyboard.push([
            { text: '✅ আদায় করেছি', callback_data: `done_namaz_${triggered}` },
            { text: '❌ পারিনি', callback_data: `skip_namaz_${triggered}` },
          ]);
        }

      const body: Record<string, unknown> = {
        chat_id: chatId,
        text: msg,
        parse_mode: 'HTML',
      };
      if (keyboard.length > 0) {
        body.reply_markup = { inline_keyboard: keyboard };
      }

      try {
        await fetch(`${tgBase}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (e) {
        console.error('Telegram send failed:', e);
      }
    }
  }

  // --- WEB PUSH ---
  try {
    const { data: subs } = await supabase.from('push_subscriptions').select('*');
    if (subs && subs.length > 0 && VAPID_PRIVATE && VAPID_PUBLIC) {
      // Call the existing send-push-notification function for each subscription
      const pushPayload = {
        title: `🕌 ${pt.emoji} ${pt.label} নামাজের সময় হয়ে আসছে!`,
        body: quote.replace(/\n/g, ' '),
        url: '/habit-tracking',
        tag: `namaz-${triggered}`,
      };

      await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(pushPayload),
      });
    }
  } catch (e) {
    console.error('Push notification failed:', e);
  }

  // --- LOG ---
  await supabase.from('namaz_reminders').insert({
    waqt: triggered,
    date: todayStr,
    quote_sent: quote,
  });

  return new Response(JSON.stringify({ 
    ok: true, 
    waqt: triggered, 
    quote,
    bdTime: `${bdHour}:${String(bdMinute).padStart(2, '0')}`,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
