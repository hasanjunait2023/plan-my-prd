

## Plan: নামাজ Reminder System — ৫ ওয়াক্ত নামাজের ১৫ মিনিট আগে Notification + Islamic Quote

### তুমি যা চাও
- ৫ ওয়াক্ত নামাজের জামাতের সময় ১৫ মিনিট আগে **Web Push Notification** + **Telegram message** পাঠাবে
- প্রতিটা notification এ একটা **Islamic/emotional quote** থাকবে যা নামাজে যাওয়ার আগ্রহ তৈরি করবে
- প্রতিবার নতুন quote আসবে (repeat হবে না সহজে)
- Telegram এ নামাজ আদায় করেছো কিনা track করার button থাকবে (habit formation)

### Architecture

```text
pg_cron (every minute)
  → namaz-reminder edge function
    → Check: BD time এখন কোন নামাজের ১৫ মিনিট আগে?
    → Already sent today for this waqt? Skip
    → Pick random Islamic quote
    → Send Telegram message (✅ Done / ❌ Missed buttons)
    → Send Web Push notification
    → Log to namaz_reminders table
```

### Changes

**1. New DB table: `namaz_reminders`** (migration)
- Tracks which waqt এর reminder আজকে পাঠানো হয়েছে
- Columns: `id`, `waqt` (text), `date` (date), `quote_sent` (text), `sent_at` (timestamptz)
- RLS: service_role full access, authenticated read

**2. New Edge Function: `supabase/functions/namaz-reminder/index.ts`**
- Hardcoded prayer times: Fajr 05:10, Dhuhr 13:15, Asr 17:00, Maghrib 18:27, Isha 20:30 (BD time)
- Every minute check: current BD time == prayer_time - 15 min?
- 30+ Islamic quotes pool embedded in the function — Quran ayat, Hadith, emotional quotes about নামাজ ও আল্লাহর নৈকট্য
- Quote selection: `(dayOfYear * waqtIndex + dateHash) % quotes.length` — প্রতিবার unique
- Telegram: 🕌 emoji + waqt name + quote + ✅ আদায় করেছি / ❌ পারিনি buttons
- Web Push: title "🕌 নামাজের সময় হয়ে এসেছে", body = quote, url = `/habit-tracking`
- Check `namaz_reminders` table — আজকে এই waqt এর reminder পাঠানো হলে skip

**3. Telegram callback handling** — existing `habit-telegram-poll` function update
- `done_namaz_fajr`, `skip_namaz_fajr` etc. callback_data handle করবে
- Done হলে সেই waqt এর habit log এ entry করবে

**4. pg_cron schedule** (SQL insert, not migration)
- `namaz-reminder` function কে every minute call করবে

**5. Habit page এ নামাজ section** (optional UI enhancement)
- Existing habit cards এই নামাজ habits দেখাবে — no separate UI needed
- User কে ৫টা habit create করতে হবে (Fajr, Dhuhr, Asr, Maghrib, Isha) with matching `submission_time`

### Islamic Quotes Pool (sample)

> "নিশ্চয়ই নামাজ মুমিনদের উপর নির্দিষ্ট সময়ে ফরজ।" — সূরা নিসা ৪:১০৩
> "নামাজ হলো মুমিনের মি'রাজ।" — হাদীস
> "যে ব্যক্তি ফজরের নামাজ পড়লো, সে আল্লাহর জিম্মায় রইলো।" — মুসলিম
> "তোমরা নামাজ কায়েম করো, নিশ্চয়ই নামাজ অশ্লীল ও মন্দ কাজ থেকে বিরত রাখে।" — সূরা আনকাবুত ২৯:৪৫

৩০+ এরকম quotes থাকবে — Quran, Hadith, এবং emotional Islamic quotes mix

### Files

| File | Action |
|------|--------|
| Migration SQL | New `namaz_reminders` table |
| `supabase/functions/namaz-reminder/index.ts` | New — core reminder logic |
| `supabase/functions/habit-telegram-poll/index.ts` | Edit — namaz callback handling |
| pg_cron SQL (insert tool) | Schedule every minute |

### No UI change needed
Existing habit system ই নামাজ track করবে। শুধু backend reminder + Telegram integration।

