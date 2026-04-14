

## Plan: Market Session Notification System (Push + Telegram)

### তুমি যা চাও
1. প্রতিটি trading session (Sydney, Tokyo, London, New York) **open হওয়ার ১৫ মিনিট আগে** — notification পাঠাবে (কোন session আসছে + motivational quote)
2. প্রতিটি session **open হওয়ার ঠিক মুহূর্তে** — notification পাঠাবে (session NOW OPEN acknowledge)
3. দুটো channel: **Push Notification** + **Telegram**
4. Quote theme: discipline, analysis, consistency — long-term trading habit building

### Architecture

```text
pg_cron (every minute)
    ↓
session-reminder (Edge Function)
    ↓
    ├── Check: কোনো session 15 min পরে open হচ্ছে?
    │     → Yes → Send "15 min আগে" alert (Push + Telegram)
    │
    └── Check: কোনো session এইমাত্র open হলো?
          → Yes → Send "NOW OPEN" alert (Push + Telegram)
    ↓
session_reminders table (log — duplicate prevention)
```

### Step 1: Database Table — `session_reminders`
Migration তৈরি করবো duplicate notification prevent করতে:
```sql
CREATE TABLE session_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name text NOT NULL,
  alert_type text NOT NULL, -- 'pre_15min' or 'session_open'
  date text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX ON session_reminders(session_name, alert_type, date);
ALTER TABLE session_reminders ENABLE ROW LEVEL SECURITY;
```

### Step 2: Edge Function — `session-reminder/index.ts`
- DST-aware session timing (same logic as `timezone.ts` — Sydney/Tokyo/London/NY)
- প্রতি minute check করবে:
  - **15 min আগে**: session start time - 15 min = current UTC hour:min → alert
  - **Session open**: session start time = current UTC hour:min → alert
- `session_reminders` table চেক করবে duplicate এড়াতে
- **Telegram**: `alert_settings` থেকে `telegram_chat_id` নিয়ে message পাঠাবে (Telegram connector gateway ব্যবহার করবে)
- **Push**: existing `send-push-notification` function call করবে

### Step 3: Trading Quotes (30+ motivational quotes)
Theme গুলো:
- "Discipline is the bridge between goals and accomplishment"
- "Consistency beats intensity — every session, every day"
- "The market rewards patience and punishes impulse"
- Bengali + English mix quotes, trading-focused

### Step 4: pg_cron Schedule
SQL insert (not migration) — প্রতি মিনিটে `session-reminder` call করবে:
```sql
SELECT cron.schedule('session-reminder-cron', '* * * * *', $$ ... $$);
```

### Notification Format

**15 min আগে (Pre-alert)**:
```
⏰ London Session 15 মিনিটে শুরু হচ্ছে!
🕐 BD Time: 14:00 — 22:00
💡 Best Pairs: EUR/USD, GBP/USD, EUR/GBP

📖 "Discipline is doing what needs to be done, even when you don't feel like it."

🔔 চার্ট সেটআপ করো, analysis শেষ করো!
```

**Session open (NOW)**:
```
🟢 London Session NOW OPEN! 🔵
🕐 BD Time: 14:00 — 22:00
💡 Best Pairs: EUR/USD, GBP/USD, EUR/GBP

⚡ Market is live — execute with discipline!
```

### Files Changed
| File | Change |
|---|---|
| `supabase/functions/session-reminder/index.ts` | New edge function |
| Migration | `session_reminders` table |
| SQL insert | pg_cron schedule |

### Weekend/Holiday Handling
- `isForexClosed()` logic replicate করবো — Saturday, Friday 21:00+ UTC, Sunday before 22:00 UTC, holidays → skip

