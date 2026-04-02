

## Plan: Pair Suggestions — শুধু 28 Tradeable Pairs থেকে Best Opportunities দেখানো

### সমস্যা

বর্তমান `generatePairSuggestions()` function যেকোনো strong/weak currency combination তৈরি করে — যেমন `JPY/NZD`, `EUR/NZD` — যেগুলো real forex market এ exist করে না বা standard pair নয়। এটা দুইটা সমস্যা তৈরি করে:

1. **Invalid pairs**: `JPY/NZD` বলে কিছু নেই, standard pair হলো `NZD/JPY`
2. **No filtering**: 28টা tradeable pair এর বাইরেও pair suggest করছে
3. **Direction logic wrong**: pair এর base/quote order ঠিক না হলে direction ও উল্টো হয়ে যায়

### সমাধান

#### Step 1: 28 Tradeable Pairs List তৈরি করা (`src/types/correlation.ts`)

8টা major currency (EUR, USD, GBP, JPY, AUD, NZD, CAD, CHF) থেকে 28টা standard forex pair define করব:

```text
EUR/USD, EUR/GBP, EUR/JPY, EUR/AUD, EUR/NZD, EUR/CAD, EUR/CHF,
GBP/USD, GBP/JPY, GBP/AUD, GBP/NZD, GBP/CAD, GBP/CHF,
AUD/USD, AUD/JPY, AUD/NZD, AUD/CAD, AUD/CHF,
NZD/USD, NZD/JPY, NZD/CAD, NZD/CHF,
USD/JPY, USD/CAD, USD/CHF,
CAD/JPY, CAD/CHF,
CHF/JPY
```

#### Step 2: `generatePairSuggestions()` Logic সম্পূর্ণ নতুন করা

নতুন approach:
1. সব 28 pair iterate করব
2. প্রতিটা pair এর base ও quote currency এর strength বের করব
3. **Strength difference** calculate করব: `base_strength - quote_strength`
4. যদি diff **positive** এবং বড় → **BUY** (base strong, quote weak)
5. যদি diff **negative** এবং বড় → **SELL** (base weak, quote strong)
6. **Absolute diff দিয়ে sort** করে top 4 BUY ও top 4 SELL return করব
7. Minimum threshold রাখব (diff >= 3) যেন weak signals না আসে

এতে:
- শুধু real tradeable pairs দেখাবে
- Direction সঠিক থাকবে (pair এর standard order অনুযায়ী)
- সবচেয়ে বড় strength gap ওয়ালা pairs আগে আসবে = best opportunities

### Technical Changes

| File | Change |
|------|--------|
| `src/types/correlation.ts` | Add `TRADEABLE_PAIRS` array (28 pairs), rewrite `generatePairSuggestions()` |

UI component (`PairSuggestions.tsx`) এ কোনো পরিবর্তন লাগবে না — same interface return করবে।

