

## Habit Tracking Page — Enhancement Plan

### বর্তমান Gaps (যা নেই)

| Area | সমস্যা |
|------|---------|
| **Streak break detection** | যদি কাল complete না করে থাকি, streak reset হচ্ছে না — manually increment হচ্ছে |
| **Monthly view** | শুধু 7 দিনের heatmap আছে, monthly/yearly overview নেই |
| **Analytics** | কোন habit কতবার miss হয়েছে, completion rate over time — কিছুই নেই |
| **Delete habit** | Edit আছে কিন্তু delete/archive option নেই |
| **Undo complete** | ভুলে complete করলে undo করার উপায় নেই |
| **Reorder/Priority** | কোন habit আগে দেখাবে সেটা control করা যায় না |
| **Category/Tags** | Habits কে group করা যায় না (Trading, Health, Learning) |
| **Notes on completion** | Complete করার সময় কোন note add করা যায় না |

---

### Proposed Enhancements (Priority Order)

#### 1. Streak Auto-Reset Logic
**Problem:** এখন streak শুধু increment হয়, কিন্তু miss করলে reset হয় না।
- App open করলে বা complete করলে check — গতকাল complete ছিল কিনা
- না থাকলে `current_streak = 0` reset
- Edge function দিয়েও daily midnight check করা যায়

#### 2. Monthly Heatmap (GitHub-style)
- Current 7-day heatmap এর নিচে expandable monthly calendar view
- Green shades দিয়ে intensity দেখাবে (miss = empty, done = green)
- Month navigation (< April 2026 >)

#### 3. Habit Analytics Section
- **Completion Rate Chart** — Last 30 days line chart (Recharts)
- **Best/Worst Days** — কোন দিন সবচেয়ে বেশি miss হয়
- **Streak History** — Timeline of streaks with breaks marked
- Per-habit stats card with total completions, avg weekly rate

#### 4. Delete & Archive Habits
- Edit dialog এ "Archive" button — `active = false` set করবে
- Archived habits আলাদা section এ দেখাবে, reactivate option সহ
- Permanent delete with confirmation dialog

#### 5. Undo / Uncomplete
- Already completed habit এ "Undo" button
- Click করলে habit_log delete + streak/completion decrement
- 30-minute time window এর মধ্যে undo allow

#### 6. Completion Notes
- Complete করার সময় optional note input (mini dialog)
- `habit_logs.notes` field ইতিমধ্যে আছে DB তে — শুধু UI add করতে হবে
- Notes hover/click এ দেখাবে heatmap এর উপরে

#### 7. Category System
- Habit create করার সময় category select (Trading, Health, Learning, Custom)
- `habits` table এ `category` column add
- Page এ filter by category tabs

#### 8. Drag-to-Reorder
- Habits list এ drag handle add
- `habits` table এ `sort_order` column
- dnd-kit library ব্যবহার

---

### Technical Details

#### Files to modify/create:

| File | Change |
|------|--------|
| `src/pages/HabitTracking.tsx` | Analytics section, category filter, archive toggle |
| `src/components/habits/HabitCard.tsx` | Undo button, notes display, drag handle |
| `src/components/habits/HabitFormDialog.tsx` | Delete/archive buttons, category select |
| `src/components/habits/MonthlyHeatmap.tsx` | **NEW** — GitHub-style monthly calendar |
| `src/components/habits/HabitAnalytics.tsx` | **NEW** — Completion charts & stats |
| `src/components/habits/CompletionNoteDialog.tsx` | **NEW** — Note input on complete |
| `supabase/migrations/` | `category`, `sort_order` columns to habits |
| Streak reset logic | Either in `HabitTracking.tsx` useEffect or new edge function |

#### DB Changes:
```sql
ALTER TABLE habits ADD COLUMN category text DEFAULT 'general';
ALTER TABLE habits ADD COLUMN sort_order integer DEFAULT 0;
```

---

### Recommended Implementation Order

1. **Streak auto-reset** — সবচেয়ে critical, ভুল data দেখাচ্ছে এখন
2. **Delete/Archive** — Basic feature missing
3. **Undo complete** — UX improvement
4. **Monthly heatmap** — Visual upgrade
5. **Completion notes** — DB ready, শুধু UI
6. **Analytics charts** — Data visualization
7. **Categories** — Organization
8. **Reorder** — Nice-to-have

কোনটা আগে করতে চাও বলো, অথবা সব একসাথে করে দিই।
