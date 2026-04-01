

# Currency Strength Page — Enhanced Visualization + Date History

## বর্তমান অবস্থা
এখন শুধু একটা horizontal bar chart আছে timeframe tabs সহ। তুমি চাও:
1. **আরো visual structures** — যাতে seconds এ বোঝা যায় কে strong, কে weak
2. **Date-wise history** — পুরনো data stored থাকবে, যেকোনো date এর data দেখা যাবে
3. **Additional features** — আরো কী কী useful হতে পারে

## Plan

### 1. Summary Cards (Top Row)
Page এর top এ 4টা summary card:
- 🟢 **Strongest Currency** — flag + name + score (বড় করে)
- 🔴 **Weakest Currency** — flag + name + score
- 📊 **Best Pair to Trade** — strongest vs weakest (e.g. "EUR/NZD — BUY")
- ⚡ **Strength Gap** — strongest আর weakest এর মধ্যে difference

এতে এক নজরে বুঝে যাবে কোন pair trade করতে হবে।

### 2. Ranking Table
Bar chart এর পাশে একটা compact **ranking list**:
- 1st, 2nd, 3rd... rank number
- Flag + Currency + Score
- Category color dot
- Arrow icon (↑ bullish / ↓ bearish)

### 3. Pair Suggestion Grid
Strongest আর weakest currencies combine করে automatically **tradable pair suggestions** দেখাবে:
- Top 3 BUY pairs (strong vs weak)
- Top 3 SELL pairs (weak vs strong)
- Direction + expected strength

### 4. Date Picker — Historical Data
- Page এ একটা **date picker** add করবো
- Default: আজকের date
- যেকোনো পুরনো date select করলে সেই দিনের data দেখাবে
- Query: `recorded_at` column filter করে সেই date এর data আনবে

### 5. DB Change — Data Retention
বর্তমানে edge function পুরনো data delete করে নতুন data insert করে। পরিবর্তন:
- **Delete বন্ধ** — পুরনো data রাখবো
- শুধু নতুন data insert হবে
- Frontend এ latest data default দেখাবে, date picker দিয়ে পুরনো দেখা যাবে

### 6. Strength Change Indicator (Bonus)
যদি আগের দিনের data থাকে:
- প্রতিটা currency র পাশে ↑↓ arrow দেখাবে — আগের দিনের তুলনায় strength বেড়েছে না কমেছে

## Files to Change

| File | Change |
|------|--------|
| `src/pages/CurrencyStrength.tsx` | Date picker, summary cards, pair suggestions, ranking table add |
| `src/components/correlation/StrengthMeter.tsx` | Ranking numbers + change indicators add |
| `src/components/correlation/SummaryCards.tsx` (new) | Top summary cards component |
| `src/components/correlation/PairSuggestions.tsx` (new) | Auto pair suggestion grid |
| `supabase/functions/store-currency-strength/index.ts` | Delete logic সরাবো — শুধু insert করবে |
| `src/types/correlation.ts` | PairSuggestion interface add |

## Visual Layout

```text
┌─────────────────────────────────────────────────────┐
│  💱 Currency Strength    [Date Picker] [1H|15M|3M]  │
│  আপডেট: 01 Apr 2026, 12:00 PM         [রিফ্রেশ]   │
├──────────┬──────────┬──────────┬────────────────────┤
│ 🟢 EUR   │ 🔴 NZD   │ 📊 BUY   │ ⚡ Gap: 13       │
│ Strongest│ Weakest  │ EUR/NZD  │ (6 vs -7)         │
│ +6       │ -7       │          │                    │
├──────────┴──────────┴──────────┴────────────────────┤
│  [Strength Meter Bars — existing + rank numbers]    │
│  1. 🇪🇺 EUR  ████████████▓  +6  STRONG             │
│  2. 🇯🇵 JPY  ████████████▓  +6  STRONG             │
│  3. 🇺🇸 USD  ██████▓        +3  NEUTRAL            │
│  ...                                                │
├─────────────────────────────────────────────────────┤
│  📈 Suggested Pairs                                 │
│  BUY: EUR/NZD, JPY/NZD, EUR/CAD                    │
│  SELL: NZD/EUR, NZD/JPY, CAD/EUR                   │
└─────────────────────────────────────────────────────┘
```

