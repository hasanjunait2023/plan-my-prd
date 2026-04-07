

## Plan: Habit Progress Calendar — সব Habit এর Overall Progress দেখানো

### কি হবে
Habit page এ একটা **full-width monthly calendar** যেখানে প্রতিদিনের overall habit completion rate দেখা যাবে। এটা individual habit এর MonthlyHeatmap থেকে আলাদা — এটা **সব habit মিলিয়ে** daily progress দেখাবে।

### Calendar Design

প্রতিটা দিনের cell এ:
- **Color intensity** — কত % habit complete হয়েছে সেই দিন (0% = empty, 50% = light green, 100% = dark green)
- **Fraction text** — "3/5" (3 out of 5 habits done)
- **Tooltip** — কোন habits done, কোন miss
- **Today** — highlighted ring
- **Streak indicator** — consecutive 100% days streak count header এ

### UI Layout
- Habit list এর উপরে, analytics section এর পরে একটা collapsible Card
- Month navigation (← April 2026 →)
- Legend: color scale empty → light → dark green
- Summary stats row: Total days active, Perfect days (100%), Average completion rate

### Technical Details

**New file:** `src/components/habits/HabitProgressCalendar.tsx`

**Data source:** Existing `monthLogs` query (60 days) + `habits` list — কোন নতুন query লাগবে না

**Logic:**
```
For each day in month:
  totalHabits = habits created before that day & active
  completedHabits = logs for that day
  rate = completed / total
  color = interpolate(rate, green shades)
```

**Integration:** `HabitTracking.tsx` তে analytics section এর পরে add করা হবে

**No DB changes needed** — existing data দিয়েই কাজ হবে

