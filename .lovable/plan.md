

## Plan: NY Session Power Grab — নতুন Section

### ধারণা
প্রতিটি currency এর correlation strength ও fundamental bias অনুযায়ী তার related pair গুলোতে গতকালের **New York session High/Low** break হয়েছে কিনা — সেটা দেখাবে। Break হলে সেই currency "Power Grab" করেছে বোঝায়।

### কিভাবে কাজ করবে

```text
┌──────────┬───────────┬──────────┬──────────┬─────────────┬──────────────┐
│ Pair     │ Bias      │ NY High  │ NY Low   │ Current     │ Status       │
├──────────┼───────────┼──────────┼──────────┼─────────────┼──────────────┤
│ EUR/USD  │ ▲ BUY     │ 1.0865   │ 1.0812   │ 1.0878      │ 🟢 HH Break │
│ GBP/USD  │ ▲ BUY     │ 1.2710   │ 1.2655   │ 1.2690      │ ⏳ In Range  │
│ USD/JPY  │ ▼ SELL    │ 154.20   │ 153.45   │ 153.30      │ 🟢 LL Break  │
│ AUD/USD  │ ▲ BUY     │ 0.6510   │ 0.6475   │ 0.6480      │ ⚠ No Break  │
└──────────┴───────────┴──────────┴──────────┴─────────────┴──────────────┘
```

**Logic:**
- Pair direction BUY হলে → NY High break করেছে কিনা check → হলে "🟢 HH Break" (Power Grab ✅)
- Pair direction SELL হলে → NY Low break করেছে কিনা check → হলে "🟢 LL Break" (Power Grab ✅)
- Range এর মধ্যে থাকলে "⏳ In Range"
- বিপরীত দিকে break করলে "⚠ Counter Move"

### Technical Implementation

**1. নতুন Edge Function — `supabase/functions/ny-session-breaks/index.ts`**
- Input: correlation strength থেকে pair suggestions (BUY/SELL direction সহ)
- TwelveData API দিয়ে প্রতিটি pair এর `1h` candles fetch করবে (last 48 hours)
- NY session hours (13:00–22:00 UTC) এর candles filter করে High/Low বের করবে
- Current price ও return করবে
- Response: `{ pairs: [{ pair, nyHigh, nyLow, currentPrice, direction, breakStatus }] }`
- Rate limit সামলাতে batch করে fetch করবে (TwelveData max 8 symbols per call)

**2. নতুন Component — `src/components/correlation/PowerGrabPanel.tsx`**
- Table layout — shadcn Table components
- Pair, Expected Bias (BUY/SELL from correlation), NY High, NY Low, Current Price, Break Status columns
- Color coding: Green row tint for Power Grab confirmed, Amber for In Range, Red for Counter Move
- Props: `strengthData` ও `pairSuggestions` নেবে CurrencyStrength page থেকে

**3. CurrencyStrength page update — `src/pages/CurrencyStrength.tsx`**
- PowerGrabPanel component add করা হবে section list এ
- FundamentalBias এর পরে দেখাবে

### Files
| File | Action |
|------|--------|
| `supabase/functions/ny-session-breaks/index.ts` | Create — TwelveData থেকে NY session H/L ও current price fetch |
| `src/components/correlation/PowerGrabPanel.tsx` | Create — Table UI component |
| `src/pages/CurrencyStrength.tsx` | Edit — নতুন section add |

### API Rate Limit Note
TwelveData free tier এ minute প্রতি 8 credits। `time_series` call প্রতি symbol 1 credit। তাই max 8 pairs একবারে fetch করা যাবে। Pair suggestions থেকে top 8 strongest diff pairs নিয়ে কাজ করবে।

