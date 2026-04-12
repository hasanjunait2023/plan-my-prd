

## Plan: Currency Strength পেজে Fundamental News Bias Section যোগ করা

### কী তৈরি হবে
Currency Strength পেজে একটা নতুন **"Fundamental Bias"** section যোগ হবে। প্রতিটি currency (EUR, USD, GBP, JPY, AUD, NZD, CAD, CHF) এর পাশে দেখাবে:
- সর্বশেষ high-impact news কী ছিল
- সেই news এর ভিত্তিতে currency টা **Bullish** নাকি **Bearish**
- Correlation strength এর সাথে fundamental bias মিলছে কিনা (✅ Aligned / ⚠️ Divergent)

### কিভাবে কাজ করবে

**Step 1: Edge Function তৈরি — `fundamental-bias`**
- ForexFactory calendar API থেকে recent high/medium impact events fetch করবে
- প্রতিটি currency এর জন্য latest released event (যেটার `actual` value আছে) বের করবে
- Actual vs Forecast/Previous compare করে bias নির্ধারণ করবে:
  - Actual > Forecast → **Bullish** (currency strong হওয়ার সম্ভাবনা)
  - Actual < Forecast → **Bearish** (currency weak হওয়ার সম্ভাবনা)
  - Actual ≈ Forecast → **Neutral**
- Response format:
```json
{
  "biases": {
    "USD": { "bias": "Bullish", "event": "Non-Farm Payrolls", "actual": "256K", "forecast": "180K", "previous": "212K", "impact": "High", "date": "..." },
    "EUR": { "bias": "Bearish", "event": "CPI y/y", ... }
  }
}
```

**Step 2: নতুন Component — `FundamentalBias.tsx`**
- `src/components/correlation/FundamentalBias.tsx` তৈরি হবে
- প্রতিটি currency row তে দেখাবে:
  - 🇺🇸 USD — **Bullish** ↑ — "Non-Farm Payrolls: 256K vs 180K forecast"
  - Correlation strength data এর সাথে compare করে Aligned/Divergent badge
- Color coding: Bullish = green, Bearish = red, Neutral = yellow
- "Aligned" যখন fundamental bias ও correlation strength একই দিকে যায়

**Step 3: CurrencyStrength পেজে integrate করা**
- `sectionMap` এ নতুন `'fundamental-bias'` key যোগ
- `DEFAULT_ORDER` array তে `'summary'` এর পরে add
- Draggable section হিসেবে কাজ করবে (বাকি sections এর মতো)

### Technical Details

| Item | Detail |
|------|--------|
| New edge function | `supabase/functions/fundamental-bias/index.ts` |
| New component | `src/components/correlation/FundamentalBias.tsx` |
| Modified file | `src/pages/CurrencyStrength.tsx` |
| Data source | ForexFactory API (same as `fetch-forex-calendar`) |
| Bias logic | Numeric comparison of actual vs forecast; special handling for inverted indicators (unemployment, jobless claims) |
| Refresh | useQuery with 5-min refetchInterval |
| Inverted indicators | Unemployment, Jobless Claims — এগুলোতে actual < forecast = Bullish |

### UI Preview
```text
┌─────────────────────────────────────────────┐
│ 📊 Fundamental Bias         Last updated: … │
├─────────────────────────────────────────────┤
│ 🇺🇸 USD   ▲ Bullish    NFP: 256K vs 180K  │
│            Correlation: STRONG  ✅ Aligned   │
│─────────────────────────────────────────────│
│ 🇪🇺 EUR   ▼ Bearish    CPI: 2.1% vs 2.4%  │
│            Correlation: WEAK    ✅ Aligned   │
│─────────────────────────────────────────────│
│ 🇬🇧 GBP   ● Neutral    GDP: 0.3% vs 0.3%  │
│            Correlation: STRONG  ⚠️ Divergent │
└─────────────────────────────────────────────┘
```

