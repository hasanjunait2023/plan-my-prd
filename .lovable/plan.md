
User wants daily rule memorization — morning + evening repetition flow. They want to repeat rules to internalize them.

Let me think about the right approach. They're on /rules page already. The existing system has:
- `trading_rules` table with category, text, active
- `rule_categories` with colors
- Telegram + Push notification infrastructure already wired (used for slot pushes, habit reminders)
- Edge function pattern established (`lifeos-slot-push` is a good template)
- pg_cron already set up for scheduled pushes

Two delivery channels needed:
1. **In-app Memorization Mode** — flashcard-style repetition UI on /rules
2. **Auto morning + evening Telegram/Push** — sends rules to repeat

Let me design this concisely.

---

# Plan: Daily Rules Memorization System

## Goal
Morning (6 AM) এবং Evening (10 PM) এ active rules গুলো Telegram + Push এ পাঠানো হবে, plus /rules page এ একটা **Memorize Mode** থাকবে যেখানে flashcard style এ rules repeat করা যাবে।

## Part 1 — In-app "Memorize Mode" (/rules page)

A new button **"Memorize Mode"** at the top of TradingRules page. Clicking it opens a fullscreen-style focused view:

```text
┌──────────────────────────────────┐
│  Rule 3 of 12     [Risk] •       │
│                                  │
│  "Never risk more than           │
│   1% per trade"                  │
│                                  │
│  [ I know this ]  [ Repeat ]    │
│      ← Prev    Next →            │
└──────────────────────────────────┘
```

Features:
- Shows one active rule at a time (large, centered)
- Category color dot + name on top
- Auto-advance every 8 seconds (toggleable)
- "I know this" → marks confidence, moves on
- "Repeat" → keeps rule in rotation
- Shuffle / sequential toggle
- Progress bar at bottom (3/12)
- Filter by category (optional)

Storage: lightweight `rule_memorization` table tracking `confidence_score` (0-5) per rule per user, so weak rules show more often.

## Part 2 — Scheduled Morning + Evening Pushes

New edge function `rules-memorize-push` that:
- Fetches user's active rules
- Picks 3-5 rules (prioritizing low-confidence ones)
- Sends as numbered Telegram message + Web Push
- Morning message: "🌅 আজকের দিন শুরু — এই rules মাথায় রাখো"
- Evening message: "🌙 দিন শেষ — কাল এর জন্য এই rules রিভাইজ করো"

Two new pg_cron jobs:
- **Morning**: 6:00 AM Dhaka (00:00 UTC)
- **Evening**: 10:00 PM Dhaka (16:00 UTC)

Both buttons added to `TelegramReminderCard.tsx` for manual testing.

## Part 3 — Settings on /rules page

Small "Daily Reminders" card at top showing:
- ✅ Morning push: 6 AM (toggle on/off)
- ✅ Evening push: 10 PM (toggle on/off)
- Number of rules per push: 3 / 5 / All (slider)

Stored in `alert_settings` (add `rules_morning_push`, `rules_evening_push`, `rules_per_push` columns).

## Technical Changes

**Database migration**:
- New table `rule_memorization` (user_id, rule_id, confidence_score, last_shown_at, repeat_count)
- Add columns to `alert_settings`: `rules_morning_push bool`, `rules_evening_push bool`, `rules_per_push int default 5`

**New files**:
- `supabase/functions/rules-memorize-push/index.ts` — sends Telegram + Push
- `src/components/rules/MemorizeMode.tsx` — fullscreen flashcard component
- `src/components/rules/DailyReminderCard.tsx` — toggle settings card
- `src/hooks/useRuleMemorization.ts` — confidence tracking

**Edited files**:
- `src/pages/TradingRules.tsx` — add "Memorize Mode" button + reminder card
- `src/components/lifeos/TelegramReminderCard.tsx` — add test buttons for rule pushes

**Cron jobs** (2 new):
- 6 AM Dhaka morning push
- 10 PM Dhaka evening push

## Build Order
1. Database migration (table + alert_settings columns)
2. Memorize Mode UI (most immediate value)
3. Edge function + cron jobs
4. Daily Reminder settings card
5. Test buttons

## Open Question
Repetition strategy — চাও:
- **Spaced repetition** (low-confidence rules show more often, smart)
- **Simple rotation** (সব rules সমান ভাবে rotate হবে)
- **Random shuffle** (প্রতিবার এলোমেলো)

Default suggestion: **spaced repetition** — যে rules তুমি "Repeat" চাপবে সেগুলো বেশি বার আসবে, "I know this" চাপলে কম আসবে। এটাই memorization এ সবচেয়ে effective।
