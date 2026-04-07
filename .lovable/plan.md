

## Plan: Habit Page — বাকি ৫টা Feature একসাথে Implement

### Already Done (recap)
Streak auto-reset, Monthly heatmap, Analytics, Delete/Archive, Undo, Completion notes, Category filter — সব আছে।

### যা Implement হবে

---

#### 1. Drag-to-Reorder (dnd-kit)
- `@dnd-kit/core` ও `@dnd-kit/sortable` install
- `HabitTracking.tsx` এ `DndContext` + `SortableContext` wrap
- `HabitCard` কে sortable item বানানো (drag handle icon add)
- Drop এ `sort_order` update করা DB তে

#### 2. Streak Milestones & Badges
- `HabitCard.tsx` তে milestone detection: 7, 21, 66, 100 day streak
- Milestone badge icon দেখাবে (🔥7, ⚡21, 💎66, 👑100)
- First time milestone reach করলে `toast` দিয়ে celebration
- Confetti animation (CSS keyframe) milestone hit এ

#### 3. Habit Templates
- `HabitFormDialog.tsx` তে "Use Template" button
- Predefined templates: Morning Journal, Chart Review, Exercise, Read 30 min, Backtest, Meditation
- Template click করলে name + description + category auto-fill

#### 4. Vacation Mode
- `habits` table এ `vacation_start` (date, nullable) ও `vacation_end` (date, nullable) columns add — **DB migration**
- `HabitFormDialog.tsx` তে vacation date range picker
- Streak auto-reset logic তে vacation period skip — vacation range এ থাকলে streak reset হবে না
- Vacation badge দেখাবে habit card এ (🏖️)

#### 5. Telegram Daily Evening Summary
- New edge function `habit-daily-summary/index.ts`
- সন্ধ্যায় একটা summary পাঠাবে: কয়টা done, কয়টা missed, current streaks
- pg_cron দিয়ে schedule (daily 9 PM BDT = 3 PM UTC)

---

### Technical Details

**New Dependencies**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

**DB Migration**:
```sql
ALTER TABLE habits ADD COLUMN vacation_start date;
ALTER TABLE habits ADD COLUMN vacation_end date;
```

**Files to create**:
| File | Purpose |
|------|---------|
| `supabase/functions/habit-daily-summary/index.ts` | Evening Telegram summary |

**Files to modify**:
| File | Changes |
|------|---------|
| `src/pages/HabitTracking.tsx` | DndContext wrap, sort_order update on drag end, vacation-aware streak reset |
| `src/components/habits/HabitCard.tsx` | Drag handle, milestone badges, vacation badge |
| `src/components/habits/HabitFormDialog.tsx` | Templates section, vacation date inputs |

**pg_cron** (via insert tool, not migration):
```sql
SELECT cron.schedule('habit-daily-summary', '0 15 * * *', $$
  SELECT net.http_post(
    url:='https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/habit-daily-summary',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body:='{}'::jsonb
  );
$$);
```

