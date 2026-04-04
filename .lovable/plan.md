

## Plan: Currency Strength — ভুল Date এ Data দেখানো Fix

### সমস্যা
1. **Fallback দিয়ে misleading data**: Selected date এ data না থাকলে latest data fetch করে দেখায় — future date বা empty date তেও পুরানো data আসে
2. **Future dates selectable**: Calendar এ আগামীকালের date ও select করা যায়
3. **Trend Chart unfiltered**: সব timeframe এর সব date এর data আনে, কোনো limit নেই

### সমাধান

#### 1. `src/pages/CurrencyStrength.tsx` — Fallback সরানো + Calendar fix
- **Fallback logic সরাও**: যদি selected date এ data না থাকে, empty state দেখাও — পুরানো data misleadingly দেখাবে না
- **Calendar এ `disabled`**: `{ after: new Date() }` দিয়ে future dates disable করো
- যেই date select করবে সেই date এর data-ই শুধু আসবে, না থাকলে "এই তারিখে data নেই" message

#### 2. `src/components/correlation/StrengthTrendChart.tsx` — Date range limit
- শুধু গত ৩০ দিনের data fetch করো (অথবা reasonable limit)
- Future dates এর data আসবে না কারণ `.lte('recorded_at', new Date().toISOString())` filter যোগ হবে

### Technical Changes

| File | Change |
|------|--------|
| `src/pages/CurrencyStrength.tsx` | Fallback query সরানো, Calendar `disabled={{ after: new Date() }}` যোগ |
| `src/components/correlation/StrengthTrendChart.tsx` | `.lte('recorded_at', now)` + last 30 days filter যোগ |

