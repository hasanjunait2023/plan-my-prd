

## Plan: Focus Planner + Reward System — Habit Page

### ১. Focus Planner (কোন Habit এ কাজ করা দরকার)

নতুন component `HabitFocusPanel.tsx` — habits analyze করে priority list তৈরি করবে:

**Priority Logic:**
- 🔴 **Urgent** — streak 0 এবং গতকাল miss (streak ভেঙে গেছে)
- 🟡 **At Risk** — streak আছে কিন্তু আজ এখনো complete হয়নি + deadline কাছে
- 🟢 **On Track** — আজ done বা deadline অনেক দূরে

**UI:**
- Habit list এর উপরে একটা compact card
- "🎯 Focus Today" header
- Urgent habits প্রথমে দেখাবে red badge সহ, তারপর At Risk yellow badge
- প্রতিটায় quick-complete button থাকবে
- সব done হলে "All caught up! 🎉" message

---

### ২. Reward System (Gamification)

নতুন component `HabitRewards.tsx` — overall performance এর উপর ভিত্তি করে:

**Levels & XP:**
- প্রতিটা habit complete = 10 XP
- Perfect day (100% complete) = 50 XP bonus
- Streak bonus = streak_count × 2 XP extra per completion
- Level thresholds: 0→Beginner, 100→Bronze, 500→Silver, 1500→Gold, 3000→Platinum, 5000→Diamond

**Visual Elements:**
- XP progress bar showing current level → next level
- Level badge with icon (🥉🥈🥇💎👑)
- "Perfect Day" counter — কতদিন 100% complete হয়েছে
- Weekly challenge: "Complete all habits 5/7 days this week" with progress ring
- Achievement badges: "First Habit ✅", "7-Day Streak 🔥", "30 Perfect Days 🌟", "100 Completions 💯"

**Data:** সব existing data (habits.total_completions, current_streak, habit_logs) থেকে calculate হবে — কোন নতুন DB table লাগবে না।

---

### Technical Details

**New files:**
| File | Purpose |
|------|---------|
| `src/components/habits/HabitFocusPanel.tsx` | Focus/priority panel |
| `src/components/habits/HabitRewards.tsx` | XP, levels, achievements |

**Modified:**
| File | Changes |
|------|---------|
| `src/pages/HabitTracking.tsx` | Focus panel stats cards এর পরে, Rewards analytics এর আগে add |

**No DB changes needed** — existing habits + habit_logs data দিয়ে সব calculate হবে।

