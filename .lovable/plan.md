

## Plan: Currency Strength Page — Improvement Features

### বর্তমানে যা আছে
- Strength Meter (bar chart ranking)
- Summary Cards (strongest, weakest, best pair, gap)
- Pair Suggestions (BUY/SELL with TradingView charts)
- 30-day Trend Chart (line chart)
- Session Panel (live market sessions)
- Date picker + realtime subscription
- London / New York tab switching

### যা নতুন Add হবে

---

#### 1. Strength Change Indicator (আগের দিনের তুলনায়)
- প্রতিটা currency এর পাশে **↑+3** বা **↓-2** দেখাবে — গতকালের তুলনায় আজ কত বদলেছে
- StrengthMeter component এ previous day data fetch করে delta calculate করবে
- Green/red color coded change badge

---

#### 2. Currency Heatmap Matrix
- 8×8 grid — প্রতিটা cell এ base vs quote এর strength difference দেখাবে
- Color intensity দিয়ে বোঝা যাবে কোন pair এ সবচেয়ে বেশি opportunity
- Cell click করলে সেই pair এর chart expand হবে
- নতুন component: `StrengthHeatmap.tsx`

---

#### 3. Multi-Timeframe Comparison
- London vs New York strength **পাশাপাশি** দেখানো — একটা compact table
- Currency wise দুই session এর strength + change direction
- কোন currency কোন session এ strong/weak হচ্ছে সেটা easily compare করা যাবে
- নতুন component: `TimeframeComparison.tsx`

---

#### 4. Strength Alert Threshold
- User একটা threshold set করতে পারবে (e.g., strength ≥ 7 হলে alert)
- Currency strength update হলে threshold cross করলে Telegram notification
- Settings UI তে threshold slider add হবে
- `store-currency-strength` function এ alert trigger logic

---

#### 5. Top Pair Radar/Score Card
- Pair suggestions কে enhance করে একটা **"Trade of the Day"** card
- সবচেয়ে বেশি strength gap + EMA alignment + confluence score মিলিয়ে best pair recommend করবে
- Confluence scores table থেকে data combine করবে
- নতুন component: `TradeOfTheDay.tsx`

---

### Technical Details

**New files:**

| File | Purpose |
|------|---------|
| `src/components/correlation/StrengthHeatmap.tsx` | 8×8 currency pair heatmap matrix |
| `src/components/correlation/TimeframeComparison.tsx` | London vs NY side-by-side table |
| `src/components/correlation/TradeOfTheDay.tsx` | Best pair recommendation card |

**Modified files:**

| File | Changes |
|------|---------|
| `src/components/correlation/StrengthMeter.tsx` | Add delta badge (previous day comparison) |
| `src/pages/CurrencyStrength.tsx` | New components integrate, extra query for previous day data |
| `supabase/functions/store-currency-strength/index.ts` | Alert threshold check + Telegram notify |

**Data sources:** Existing `currency_strength` + `confluence_scores` tables — কোন নতুন table লাগবে না।

