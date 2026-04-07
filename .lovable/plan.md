

## Plan: Telegram × Habit System — Deep Integration

### বর্তমানে যা আছে
| Function | কি করে |
|----------|--------|
| `habit-reminder` | Deadline পার হলে reminder পাঠায় (Done/Skip button সহ) |
| `habit-telegram-poll` | Button click (Done/Skip) handle করে, streak update করে |
| `habit-daily-summary` | প্রতিদিন সন্ধ্যায় overall summary পাঠায় |
| `telegram-trade-alerts` | Trading alerts (confluence, EMA, risk, session, calendar, MT5) |

### যা নতুন Implement হবে

---

#### 1. Telegram Bot Commands — `/status`, `/list`, `/streak`

`habit-telegram-poll` function এ নতুন text command handling add করা হবে:

- **`/status`** — আজকের habit progress দেখাবে (কোনটা done, কোনটা pending), quick-complete button সহ
- **`/list`** — সব active habits দেখাবে inline button সহ, Telegram থেকেই complete করা যাবে
- **`/streak`** — Top streaks leaderboard + total XP + current level দেখাবে
- **`/help`** — সব available commands এর list

---

#### 2. Streak Break Alert — Instant Notification

`habit-daily-summary` function enhance করা হবে:
- যদি গতকাল কোন habit miss হয়ে থাকে এবং streak ভেঙে যায়, **সকালে** একটা urgent alert পাঠাবে:
  `⚠️ Streak broken! "Journaling" — 14 day streak lost. Start rebuilding today!`
- নতুন cron job: সকাল 7:00 AM (user timezone) এ run হবে

---

#### 3. Weekly Recap Report

নতুন edge function `habit-weekly-recap`:
- প্রতি সোমবার সকালে Telegram এ পাঠাবে:
  - গত সপ্তাহের completion rate
  - Best day / worst day
  - Streak changes (gained/lost)
  - XP earned this week
  - তুলনা: এই সপ্তাহ vs আগের সপ্তাহ (📈/📉)

---

#### 4. Photo Proof — Habit Completion with Screenshot

`habit-telegram-poll` এ photo message handling:
- User একটা photo পাঠালে bot জিজ্ঞেস করবে কোন habit এর জন্য (inline keyboard)
- Photo Supabase Storage এ save হবে
- `habit_logs` এ `proof_url` column add হবে
- Web UI তে proof দেখানো যাবে

---

#### 5. Motivation Reply — Complete করলে Encouragement

`habit-telegram-poll` এ Done callback এর পর:
- Random motivational message reply করবে (30+ Bengali + English mixed messages pool)
- Milestone এ special message: "🔥 7 days! You're building a real habit!"
- Perfect day detection: "🌟 All habits done! You're unstoppable!"

---

### Technical Details

**Modified files:**

| File | Changes |
|------|---------|
| `supabase/functions/habit-telegram-poll/index.ts` | `/status`, `/list`, `/streak`, `/help` commands + photo handling + motivation replies |
| `supabase/functions/habit-daily-summary/index.ts` | Streak break alert section add |
| `supabase/functions/habit-weekly-recap/index.ts` | **New** — weekly summary report |

**DB Migration:**
```sql
-- Photo proof support
ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS proof_url text;

-- Storage bucket for habit proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('habit-proofs', 'habit-proofs', true);
```

**New cron job** (via SQL insert):
```sql
-- Weekly recap: Monday 7 AM BDT (1 AM UTC)
SELECT cron.schedule('habit-weekly-recap', '0 1 * * 1', $$
  SELECT net.http_post(
    url:='https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/habit-weekly-recap',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body:='{}'::jsonb
  );
$$);
```

### Implementation Order
1. Bot commands (`/status`, `/list`, `/streak`, `/help`) — সবচেয়ে useful
2. Motivation replies — Quick win, engagement বাড়াবে
3. Streak break alert — Important notification
4. Weekly recap — Comprehensive report
5. Photo proof — Advanced feature, storage setup needed

