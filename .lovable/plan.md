

## User Goal
একটা সম্পূর্ণ **Vision-Mission-Goal driven Life OS** বানানো — যেখানে:
- **Vision** (5-10 year) → **Mission** (yearly) → **Goals** (quarterly/monthly) → **Weekly plan** → **Daily tasks**
- প্রতিটা task উপরের layer-এর সাথে aligned থাকবে
- Achievement-based tracking — কতটা vision-এর কাছে পৌঁছেছেন
- নিজেই A-Z accountable

আলাদা একটা page: `/life-os` (sidebar item: **"Life OS"** with Compass icon)

## Core Concept: The Pyramid

```text
                    ╱ VISION ╲           (Why I exist — 5-10 yr)
                   ╱──────────╲
                  ╱  MISSIONS  ╲         (3-5 life areas — Trading, Health, Faith, Family, Wealth)
                 ╱──────────────╲
                ╱   YEARLY GOALS ╲       (Per mission, 1-3 goals/year)
               ╱──────────────────╲
              ╱  QUARTERLY OBJECTIVES╲   (Break yearly into 4 quarters)
             ╱──────────────────────╲
            ╱   MONTHLY MILESTONES   ╲   (Quarter ÷ 3)
           ╱──────────────────────────╲
          ╱    WEEKLY FOCUS BLOCKS     ╲ (Month ÷ 4)
         ╱──────────────────────────────╲
        ╱      DAILY TASKS / RITUALS     ╲ (What I actually DO today)
```

প্রতিটা daily task একটা weekly block-এর সাথে linked, সেটা monthly milestone-এর সাথে, এভাবে উপরে vision পর্যন্ত। ফলে "আজকে এই task কেন করছি?" — উত্তর পরিষ্কার।

## Database Schema

**One unified `life_nodes` table** (self-referential tree — flexible, future-proof):

```sql
CREATE TYPE life_node_type AS ENUM 
  ('vision','mission','yearly','quarterly','monthly','weekly','daily');

CREATE TABLE public.life_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES life_nodes(id) ON DELETE CASCADE,
  type life_node_type NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT 'target',          -- lucide icon name
  color text DEFAULT '#00C9A7',
  status text DEFAULT 'active',        -- active|completed|paused|archived
  progress numeric DEFAULT 0,          -- 0-100, auto-rolled-up from children
  target_value numeric,                -- optional metric (e.g. "$10k", "200 trades")
  current_value numeric DEFAULT 0,
  unit text DEFAULT '',                -- '%', '$', 'trades', 'days'
  start_date date,
  due_date date,
  completed_at timestamptz,
  priority int DEFAULT 2,              -- 1=critical, 2=high, 3=medium
  sort_order int DEFAULT 0,
  metadata jsonb DEFAULT '{}',         -- flexible: recurrence, tags, etc.
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.life_node_logs (        -- daily check-ins / achievements
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  node_id uuid REFERENCES life_nodes(id) ON DELETE CASCADE,
  date date NOT NULL,
  done boolean DEFAULT false,
  value_added numeric DEFAULT 0,        -- contribution to current_value
  reflection text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
```

RLS: standard `auth.uid() = user_id` for both. Realtime enabled so multi-device updates instantly.

## Page Structure: `/life-os`

**5 tabs** in one focused page:

### 1. **Pyramid** (Overview / default tab)
- Visual top-down pyramid: Vision → Missions → key goals
- Each layer shows progress %, next milestone
- Click any node to drill down
- "North Star" banner at top: Vision statement + days lived this year + alignment score (% of daily tasks linked to a mission)

### 2. **Today** (Daily focus)
- Today's date + day quote
- **Top 3 priorities** (must-do, linked to a weekly block)
- Other daily tasks/rituals list with check-off
- Each task shows: which weekly block → which monthly → which mission (breadcrumb chip)
- Quick-add task with "link to..." selector
- End-of-day reflection box (saves to `life_node_logs`)
- Streak counter for daily ritual completion

### 3. **This Week**
- 7-day grid (Sat-Fri or Mon-Sun based on user pref)
- Weekly focus blocks (max 5 per week, 2-3 recommended)
- Each block: title, target, actual, progress bar, parent monthly milestone
- Drag tasks onto days
- Weekly review section (Friday/Saturday): wins, lessons, next-week intent

### 4. **This Month / Quarter**
- Month view: milestones with progress bars, deadlines, status
- Quarter view: roll-up of 3 months
- "Pace" indicator: ahead/on-track/behind based on date elapsed vs progress
- Each milestone expandable → shows child weekly blocks

### 5. **Vision & Missions** (Long-term)
- Vision statement editor (rich text, big quote-style display)
- 3-5 Mission cards (e.g. *Trader Mastery*, *Deen & Discipline*, *Family*, *Wealth*, *Health*)
- Each mission: yearly goals list + lifetime progress meter
- "Year at a glance": 12-month strip showing milestone completion per mission

## Key Features

### Alignment Engine
- Every daily task **must** link to a weekly block (or marked "ad-hoc")
- Dashboard shows **Alignment Score** = (aligned tasks ÷ total tasks) × 100
- Warning if >30% tasks are ad-hoc → "You're drifting from your mission"

### Achievement-based Progress Roll-up
- Daily completion → auto-updates weekly block %
- Weekly → monthly milestone %
- Monthly → quarterly → yearly goal %
- Yearly → mission lifetime %
- **One Postgres function** `recompute_node_progress(node_id)` triggered on log insert

### Accountability Layer
- **Daily check-in prompt** (morning): "What 3 things will move you closer to your vision today?"
- **Evening reflection**: "Did today honor your mission? Yes/No + note"
- **Weekly review** (auto-prompts on Saturday): wins, gaps, next week's top 3
- **Monthly retrospective**: alignment score, biggest win, area to improve
- All saved to `life_node_logs` — historical accountability trail

### Achievement System
- Badges unlocked: "First Vision Set", "30-day streak", "Quarter Crusher", "Mission Mastered"
- Year-end report: PDF-style summary of everything achieved
- Visual "growth ring" per mission (like Apple rings)

## Integration with Existing App

- **Habits**: existing habits can be tagged to a Mission (one-time mapping in habit form)
- **Trades**: trade pnl auto-feeds into "Wealth/Trading" mission `current_value`
- **Mind Journal**: thoughts can be tagged to a node for reflection trail
- **Psychology logs**: alignment with mission = bonus to daily score

## Implementation Phases

**Phase 1 (this build):**
1. Migration: `life_nodes` + `life_node_logs` + RLS + realtime + roll-up function
2. Sidebar nav item "Life OS" (Compass icon) → `/life-os`
3. Page skeleton with 5 tabs
4. Vision & Missions tab (CRUD)
5. Today tab (task list + check-off + reflection)
6. Pyramid overview (read-only visual)

**Phase 2 (next):**
- Weekly/Monthly/Quarter tabs
- Drag-drop scheduling
- Achievement badges + year-end report
- Cross-module integration (habits/trades auto-feed)

## Files to Create

**Migration:**
- `supabase/migrations/<ts>_life_os.sql`

**Hooks:**
- `src/hooks/useLifeNodes.ts` — CRUD + realtime
- `src/hooks/useLifeNodeLogs.ts`

**Page + components:**
- `src/pages/LifeOS.tsx` — main page with tabs
- `src/components/lifeos/VisionMissionTab.tsx`
- `src/components/lifeos/TodayTab.tsx`
- `src/components/lifeos/WeekTab.tsx` (Phase 1: placeholder)
- `src/components/lifeos/MonthTab.tsx` (Phase 1: placeholder)
- `src/components/lifeos/PyramidView.tsx`
- `src/components/lifeos/NodeCard.tsx` — reusable card for any node type
- `src/components/lifeos/NodeFormDialog.tsx` — create/edit any node
- `src/components/lifeos/AlignmentBadge.tsx` — shows alignment score
- `src/components/lifeos/DailyReflectionDialog.tsx`

**Routing:**
- `src/App.tsx` — add `/life-os` route
- `src/components/Layout.tsx` — add to `ALL_NAV_ITEMS`

## Result

আপনার একটা সম্পূর্ণ **personal Life OS** হবে। প্রতিদিন সকালে app খুললেই দেখবেন — আজকে কী করতে হবে এবং সেটা আপনার vision-এর সাথে কীভাবে aligned। প্রতিটা completed task পিরামিড উপরে উঠবে। বছর শেষে দেখবেন — সব daily action মিলে আপনার vision-এর দিকে কতটা এগিয়েছেন।

