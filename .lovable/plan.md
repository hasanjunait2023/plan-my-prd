

User চাইছে check-in flow simplify করতে:
1. **Web check-in**: প্রথমে একটা yes/no question — "আজকে সব rules maintain করেছ?" Yes দিলে সব rules auto-mark followed। No দিলে শুধু broken rules গুলো select করার option আসবে।
2. **Telegram check-in**: একই flow Telegram এ inline buttons দিয়ে।

Let me check current DailyCheckinTab to know what to refactor.
<br>
Current: probably shows all rules with toggles individually. Need to invert UX — default assume all followed, only mark violations.

Telegram side: need 2-way Telegram bot using getUpdates polling (already have telegram-poll pattern via `mind-telegram-sync`). Need new function `rules-telegram-checkin` that handles inline button callbacks. 9:30 PM push already exists — need to send inline keyboard with "✅ All maintained" / "❌ Some broken" buttons. If broken → send list of rules with checkbox-style buttons.

---

# Plan: Simplified Rules Check-in (Web + Telegram)

## Part 1: Web Check-in UX Refactor

**File**: `src/components/rules/DailyCheckinTab.tsx`

New flow (single page, 2 steps):

```text
Step 1: Big question card
  ┌─────────────────────────────────────┐
  │  আজকে কি সব rules maintain করেছ?     │
  │                                     │
  │  [✅ হ্যাঁ, সব mark করো]             │
  │  [❌ না, কিছু broke করেছি]           │
  └─────────────────────────────────────┘

Step 2a (Yes clicked):
  → All rules auto-marked as followed
  → Mood selector + trade count + note
  → "Submit Check-in" button
  → Score = 100%

Step 2b (No clicked):
  → Show rule list grouped by category
  → User TICKS only the ones they BROKE (red checkboxes)
  → Untouched = followed (default)
  → Counter: "3 broken / 12 total"
  → Mood + trades + note + Submit
```

Logic:
- `mode: 'unset' | 'all-followed' | 'partial'`
- If `all-followed`: `violatedIds = []`, score = 100
- If `partial`: only checked ones go to `rule_violations`, rest counted as followed

## Part 2: Telegram Check-in Flow

### New edge function: `rules-telegram-checkin-poll`

Polls Telegram `getUpdates` for callback queries (button clicks). Runs every minute via cron.

### Updated edge function: `rules-daily-checkin-push` (9:30 PM)

Currently sends plain text. Change to send inline keyboard:

```text
🌙 Day's end — Rules check-in

আজকে কি সব rules maintain করেছ?

[✅ All maintained]  [❌ Some broken]
[📝 Open in app]
```

### Callback handling logic

When user clicks button, Telegram sends `callback_query`. Poller processes:

1. **`✅ All maintained`** → Insert `daily_rule_adherence` (score 100, all followed). Edit message: "✅ Logged — all rules maintained! 100%"

2. **`❌ Some broken`** → Edit message to show rule list with one button per rule:
   ```
   কোন rules broke করেছ? (tap to toggle)
   
   [⬜ No revenge trades]
   [⬜ Wait for confirmation]
   [⬜ Risk max 1%]
   ...
   [✅ Done — Submit]
   ```
   Tapping a rule toggles ⬜ ↔ 🔴. State stored in a new table `telegram_checkin_state` (chat_id + date + selected_rule_ids[]).

3. **`✅ Done — Submit`** → Insert adherence + violations to DB. Confirm: "Logged — 3 broken, 9 followed (75%)"

### Database additions

New table for Telegram interaction state:
```sql
create table telegram_checkin_state (
  chat_id bigint not null,
  date date not null,
  user_id uuid not null,
  selected_rule_ids uuid[] default '{}',
  message_id bigint,
  updated_at timestamptz default now(),
  primary key (chat_id, date)
);
```

User-to-chat mapping: use existing `alert_settings.telegram_chat_id` to identify which user a chat belongs to.

### Cron job

Add new pg_cron job: `rules-telegram-checkin-poll` every minute.

## Technical Details

**Files to modify**:
- `src/components/rules/DailyCheckinTab.tsx` — invert UX (yes/no → conditional rule list)
- `src/hooks/useDailyAdherence.ts` — add `submitAllFollowed()` helper
- `supabase/functions/rules-daily-checkin-push/index.ts` — send inline keyboard

**Files to create**:
- `supabase/functions/rules-telegram-checkin-poll/index.ts` — polls callback_queries, handles state machine
- migration: `telegram_checkin_state` table + cron job

**Telegram API methods used**:
- `sendMessage` with `reply_markup.inline_keyboard`
- `editMessageText` to update buttons after each tap
- `answerCallbackQuery` to dismiss spinner
- `getUpdates` with `allowed_updates: ['callback_query']`

## Open Questions

1. **Telegram identification**: `alert_settings` has only ONE shared `telegram_chat_id`। Single-user app বলে assume করছি — তোমার নিজের user_id এর সাথে map করব। ঠিক আছে?
2. **Rule list size**: যদি 15+ rules থাকে, Telegram message এ অনেক button হবে। 8+ হলে category-wise group করব?
3. **Web yes/no**: "All maintained" click করলে কি immediately submit হবে নাকি mood/trades fill করার option থাকবে?

Defaults if no answer: single user mapping, group by category if >8 rules, show mood/trades after Yes click before final submit.

