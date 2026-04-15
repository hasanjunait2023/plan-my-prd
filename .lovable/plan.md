

## Plan: AI Scanner — Session-Based Tabs + Scheduled Runs + Full Filtering

### Goal
AI Scanner page কে Currency Strength page এর মতো করে 3 টি session tab (London, New York, Asian), date picker, auto-refresh, এবং session-based data filtering যোগ করা।

### What Changes

**1. Session Tabs (London / New York / Asian)**
- Timeframe dropdown (1H, 15M, 3M) সরিয়ে 3 টি session tab যোগ করা: **London**, **New York**, **Asian**
- প্রতিটি tab তার নিজের session এর data দেখাবে (currency_strength table থেকে timeframe filter দিয়ে)
- Active session auto-detect করবে (Currency Strength page এর `getDefaultTab()` logic reuse)

**2. Scheduled Scan per Session**
- প্রতিটি session এর জন্য edge function এ separate timeframe mapping:
  - Asian → `1H` scan
  - London → `1H` scan  
  - New York → `New York` scan
- Edge function আপডেট করে session name accept করবে timeframe এর পাশাপাশি
- `currency_strength` table এ session name সহ data store হবে

**3. Date Picker + History Navigation**
- Currency Strength page এর মতো Calendar date picker যোগ করা
- Selected date অনুযায়ী data filter হবে

**4. Refresh Button + Real-time Updates**
- Manual refresh button
- Supabase Realtime subscription দিয়ে নতুন data আসলে auto-update

**5. Previous Session Comparison**
- Currency Strength page এর মতো previous scan batch এর সাথে comparison (change arrows, ↑↓ badges)

**6. Run Scan Button Retained**
- Manual "Run Scan" button থাকবে, কিন্তু selected session অনুযায়ী scan চালাবে

### Technical Details

**Files to modify:**
- `src/pages/AiScanner.tsx` — Full redesign:
  - `Tabs` component দিয়ে London/New York/Asian tabs
  - `Calendar` date picker (Popover এ)
  - `useCurrencyStrength()` style query hook — session tab + date filter
  - Previous session data fetch for comparison
  - Realtime channel subscription
  - `RefreshCw` button
  - StrengthRow component as-is (already built)

- `supabase/functions/ai-currency-scanner/index.ts` — Accept `session` parameter alongside `timeframe`, store with session-appropriate timeframe label

**No database changes needed** — `currency_strength` table already has `timeframe` column that can store session names.

### UI Layout (matching Currency Strength page)
```text
┌─────────────────────────────────────────┐
│ FX Currency Strength                    │
│ EMA(200) Pure Math — Updated: ...       │
│                        [📅 Date] [🔄]  │
├─────────────────────────────────────────┤
│  [London] [New York] [Asian]  [▶ Scan] │
├─────────────────────────────────────────┤
│  Progress bar (when scanning)           │
├─────────────────────────────────────────┤
│  1  🇦🇺 AUD  ████████████  +7  ↑2  STRONG   │
│  2  🇳🇿 NZD  ██████████    +5  ↑1  STRONG   │
│  ...                                    │
│  8  🇯🇵 JPY  ██            -5  ↓2  WEAK     │
└─────────────────────────────────────────┘
```

