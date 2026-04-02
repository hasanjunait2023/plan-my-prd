

## Plan: Rules Page এ Trading Parameters & Limits Sections যোগ করা

### সমস্যা
Rules page এ শুধু text-based rules আছে। কিন্তু trading এর জন্য আরও structured limits দরকার — কোন session এ trade করবে, risk কত, daily win/loss limit কত — এগুলো visual cards এ থাকলে Journal এ trade নেওয়ার সময় reference হিসেবে কাজ করবে।

### নতুন Sections

```text
┌──────────────────────────────────────────────┐
│  [Existing: Summary Cards, Rules, Charts]    │
├──────────────────────────────────────────────┤
│  🕐 Allowed Trading Sessions                │
│  Toggle cards: Asian | London | New York |   │
│  London Close — active/inactive visual       │
├──────────────────────────────────────────────┤
│  ⚠️ Risk Parameters                         │
│  Max Risk/Trade: __% | Max Daily Loss: $__   │
│  Max Lot Size: __ | Max Drawdown: __%        │
│  (reads from account_settings + editable)    │
├──────────────────────────────────────────────┤
│  📊 Daily Trade Limits                       │
│  Max Winning Trades/Day: __                  │
│  Max Losing Trades/Day: __                   │
│  Max Total Trades/Day: __                    │
│  (visual progress bars against today's data) │
├──────────────────────────────────────────────┤
│  🎯 Trade Conditions                         │
│  Min Confidence Level: __ (1-10)             │
│  Min RRR: __                                 │
│  Required SMC Tags: __ (minimum count)       │
│  (conditions that MUST be met before entry)  │
└──────────────────────────────────────────────┘
```

### Features Detail

1. **Allowed Trading Sessions** — ৪টা session toggle card (Asian, London, New York, London Close)। Active session গুলো highlight হবে, inactive গুলো dimmed। New Trade form এ যখন session auto-detect হবে তখন check করতে পারবে user allowed session এ trade নিচ্ছে কি না।

2. **Risk Parameters** — Account settings থেকে existing data (maxRiskPercent, dailyLossLimit) দেখাবে + নতুন fields: max lot size, max drawdown %। Editable inline — save করলে `account_settings` update হবে।

3. **Daily Trade Limits** — Max winning trades, max losing trades, max total trades per day। Today's actual count বনাম limit — progress bar দিয়ে visual। Limit cross করলে red warning।

4. **Trade Entry Conditions** — Minimum confidence, minimum RRR, minimum SMC tag count। এগুলো pre-trade checklist হিসেবে কাজ করবে।

### DB Changes
`account_settings` table এ নতুন columns যোগ করতে হবে:

```sql
ALTER TABLE account_settings
  ADD COLUMN allowed_sessions text[] NOT NULL DEFAULT '{Asian,London,New York,London Close}',
  ADD COLUMN max_winning_trades integer NOT NULL DEFAULT 3,
  ADD COLUMN max_losing_trades integer NOT NULL DEFAULT 2,
  ADD COLUMN max_lot_size numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN max_drawdown_percent numeric NOT NULL DEFAULT 5,
  ADD COLUMN min_confidence integer NOT NULL DEFAULT 5,
  ADD COLUMN min_rrr numeric NOT NULL DEFAULT 1.5,
  ADD COLUMN min_smc_tags integer NOT NULL DEFAULT 1;
```

### Journal Integration
New Trade form এ submit করার আগে এই limits check করে warning দেখাবে:
- "আজকে ২টা losing trade হয়ে গেছে, limit ২" 
- "এই session (Asian) তোমার allowed sessions এ নেই"
- "Confidence 3 — minimum 5 দরকার"

### Technical Changes

| File | Change |
|------|--------|
| `supabase/migrations/` | `account_settings` এ নতুন columns |
| `src/pages/TradingRules.tsx` | ৪টা নতুন section card যোগ |
| `src/hooks/useAccountSettings.ts` | নতুন fields map করা |
| `src/types/trade.ts` | `AccountSettings` interface update |
| `src/pages/NewTrade.tsx` | Submit এ limits validation warning যোগ |

