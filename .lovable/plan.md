

## Plan: Pair Suggestions — ৩টা করে Pair + Chart সহ

### পরিবর্তন

#### 1. `src/types/correlation.ts` — ৪ থেকে ৩ করা
- `slice(0, 4)` → `slice(0, 3)` — BUY ও SELL দুই দিকেই top 3 pair দেখাবে

#### 2. `src/components/correlation/PairSuggestions.tsx` — Chart যোগ করা
- প্রতিটা suggested pair এর নিচে TradingView MiniChart embed করব
- Pair name (যেমন `EUR/USD`) কে TradingView symbol format এ convert করব (`FX:EURUSD`)
- Layout:
  - BUY section: top 3 BUY pairs list + তাদের 3টা chart (stacked)
  - SELL section: top 3 SELL pairs list + তাদের 3টা chart (stacked)
  - Grid: 2 columns (BUY left, SELL right) — existing layout রাখব
- Chart height: 300px per chart (compact কিন্তু readable)
- Existing `MiniChart` component reuse করব (already has expand dialog)
- Interval: `"60"` (1H) default

#### 3. Pair → TradingView Symbol Mapping
`EUR/USD` → `FX:EURUSD` — simple string replace: `"FX:" + pair.replace("/", "")`

### Technical Summary

| File | Change |
|------|--------|
| `src/components/correlation/PairSuggestions.tsx` | Slice 3 instead of 4, add MiniChart for each suggested pair |

মোট ১টা ফাইল পরিবর্তন।

