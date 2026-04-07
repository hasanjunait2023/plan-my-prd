

## Plan: Habit Tracking System with Telegram Reminder

### কি তৈরি হবে
একটি পূর্ণাঙ্গ Habit Tracking page যেখানে:
- Daily habits তৈরি, track ও manage করা যাবে
- প্রতিটি habit এর submission deadline থাকবে — সময়মতো submit না করলে Telegram এ individually reminder যাবে
- Telegram থেকে reply করে habit complete করা যাবে
- Habit formation phase system: **Phase 1** (Day 1–66), **Phase 2** (Day 67–90), **Established** (90+ days)
- Streak tracking, progress visualization, phase badges

### Database Tables

**`habits`** — Habit definitions
| Column | Type | Note |
|--------|------|------|
| id | uuid | PK |
| user_id | uuid | Owner |
| name | text | "Morning Journal", "Exercise" |
| description | text | Optional details |
| submission_time | time | Daily deadline (e.g. "07:00") |
| timezone | text | User's timezone (e.g. "Asia/Dhaka") |
| created_at | timestamptz | Habit start date — Phase 1 starts here |
| active | boolean | default true |
| current_streak | integer | Consecutive days completed |
| longest_streak | integer | Best streak ever |
| total_completions | integer | Lifetime count |

**`habit_logs`** — Daily completion records
| Column | Type | Note |
|--------|------|------|
| id | uuid | PK |
| habit_id | uuid | FK → habits |
| user_id | uuid | Owner |
| date | date | Which day |
| completed_at | timestamptz | When marked done |
| source | text | 'app' or 'telegram' |
| notes | text | Optional reflection |

**`habit_reminders`** — Telegram reminder tracking
| Column | Type | Note |
|--------|------|------|
| id | uuid | PK |
| habit_id | uuid | FK → habits |
| date | date | Reminder date |
| sent_at | timestamptz | When reminder sent |
| responded | boolean | Did user reply? |

### Phase System Logic (Frontend)

```text
Day 1–66   → Phase 1: "Building" (🟡 yellow badge, progress bar /66)
Day 67–90  → Phase 2: "Strengthening" (🔵 blue badge, progress bar /90)
Day 91+    → "Established" (🟢 green badge, ✅ permanent)
```
Phase calculation: `daysSinceCreation = today - habit.created_at`

### Edge Functions

**1. `habit-reminder` (pg_cron — every 5 min)**
- Query all active habits where `submission_time` has passed for today (considering timezone)
- Check if `habit_logs` has entry for today — if not, send Telegram message:
  ```
  ⏰ Habit Reminder: "Morning Journal"
  আজ এখনও complete করা হয়নি!
  Reply /done_<habit_id> to mark complete.
  ```
- Log to `habit_reminders` table

**2. `habit-telegram-poll` (pg_cron — every 1 min)**
- Poll Telegram `getUpdates` for incoming messages
- Parse `/done_<habit_id>` commands
- Insert into `habit_logs` with `source: 'telegram'`
- Update streak in `habits` table
- Reply confirmation: "✅ Morning Journal marked complete! 🔥 Streak: 15 days"

### Frontend Pages & Components

**`src/pages/HabitTracking.tsx`**
- Header with "Add Habit" button
- Today's habits list — each card shows:
  - Habit name, phase badge, streak 🔥
  - Circular progress (phase progress)
  - Deadline time + status (✅ Done / ⏳ Pending / ❌ Missed)
  - "Mark Complete" button
- Weekly heatmap grid (7 days, green = done)
- Stats section: total habits, avg completion rate, longest streak

**`src/components/habits/HabitCard.tsx`**
- Individual habit with phase indicator, streak, complete toggle

**`src/components/habits/HabitFormDialog.tsx`**
- Create/edit habit: name, description, submission time, timezone

**`src/components/habits/PhaseProgress.tsx`**
- Visual phase indicator with progress bar (66 days / 90 days)

**`src/components/habits/WeeklyHeatmap.tsx`**
- 7-day grid showing completion status

### Navigation
Layout.tsx এ profileMenuItems এ `{ title: 'Habits', url: '/habits', icon: Target }` যোগ হবে।
App.tsx এ `/habits` route যোগ হবে।

### Data Flow

```text
User creates habit (app) → habits table
Daily deadline passes → pg_cron → habit-reminder edge fn → Telegram message
User replies /done_xxx → pg_cron → habit-telegram-poll → habit_logs insert → streak update
User clicks "Complete" (app) → habit_logs insert → streak update
Frontend queries habit_logs → shows today's status, streaks, phases
```

### RLS Policies
- `habits`: user_id = auth.uid() (CRUD)
- `habit_logs`: user_id = auth.uid() (CRUD)
- `habit_reminders`: service_role insert, authenticated select

### Summary
- 3 নতুন DB table
- 2 নতুন edge function (reminder + telegram poll)
- 2 pg_cron job
- 1 নতুন page + 4 components
- Phase system: 66-day + 90-day milestones
- Telegram integration: reminder + reply-to-complete

