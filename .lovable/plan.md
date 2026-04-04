

## Plan: Currency Strength Correlation Fix

### সমস্যা চিহ্নিত

Database এ ৩টা সমস্যা পাওয়া গেছে:

1. **Timeframe parsing inconsistency**: Edge function কখনো `"New York"` আবার কখনো `"Strength On New York"` হিসেবে timeframe save করছে। ফলে New York tab এ কিছু data missing হয়।

2. **Duplicate/test data**: New York session এ অনেক entry তে সব currency 0 strength দেখাচ্ছে (test/debug data মনে হচ্ছে) — এগুলো correlation calculation বিভ্রান্ত করছে।

3. **Tab label mismatch**: London session এর data `timeframe = "1H"` হিসেবে stored কিন্তু tab label "London" দেখায় — কিন্তু query ঠিকমতো `"1H"` পাঠাচ্ছে, এটা ঠিক আছে।

### সমাধান

#### 1. Edge Function Fix (`store-currency-strength/index.ts`)
- Timeframe parser normalize করা — `"Strength On New York"` → `"New York"`, `"FX Co-Relation Strength On 1H"` → `"1H"`
- Extra prefix strip: `"Strength On "` prefix থাকলে সরিয়ে দেবে

#### 2. Frontend Query Fix (`CurrencyStrength.tsx`)
- New York tab select করলে দুটো timeframe-ই query করবে: `"New York"` এবং `"Strength On New York"` — যাতে পুরানো data-ও দেখায়
- অথবা `.in('timeframe', ['New York', 'Strength On New York'])` ব্যবহার করা

#### 3. Trend Chart Fix (`StrengthTrendChart.tsx`)
- Same `.in()` filter যোগ করা New York timeframe এর জন্য

#### 4. DB Cleanup Migration
- Existing `"Strength On New York"` records গুলোকে `"New York"` এ update করা

### Technical Changes

| File | Change |
|------|--------|
| `supabase/functions/store-currency-strength/index.ts` | Timeframe normalization — strip "Strength On " prefix |
| `supabase/migrations/` | `UPDATE currency_strength SET timeframe = 'New York' WHERE timeframe = 'Strength On New York'` |
| `src/pages/CurrencyStrength.tsx` | Fallback `.in()` query for NY variants (temporary safety) |
| `src/components/correlation/StrengthTrendChart.tsx` | Same `.in()` query fix |

### Result
- New York tab এ সব NY data ঠিকমতো দেখাবে
- Pair suggestions (correlation) সঠিক strength diff দিয়ে calculate হবে
- ভবিষ্যতে edge function সবসময় clean timeframe value save করবে

