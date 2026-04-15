

## Plan: Currency Strength page এ তিনটি Session Tab + AI Scanner Data Integration

### Goal
Currency Strength page এ শুধু Asian tab না, **তিনটি session (Asian, London, New York)** এর AI Scanner থেকে আসা data সঠিকভাবে show করা। নতুন **Asian tab** যোগ করা এবং existing London/NY tab গুলোও AI Scanner এর same data source থেকে data দেখাবে।

### Changes (1 file: `src/pages/CurrencyStrength.tsx`)

**1. Tab UI তে Asian যোগ**
- Line ~298-301: TabsList এ তৃতীয় tab `Asian` যোগ হবে
- Tab values: `Asian`, `1H` (London), `New York`

**2. `getDefaultTab()` আপডেট**
- Tokyo/Sydney session active থাকলে `'Asian'` return করবে (currently `'1H'` return করে)

**3. `useCurrencyStrength` hook আপডেট**
- `timeframe === 'Asian'` হলে `['Asian']` variants ব্যবহার করবে
- এতে AI Scanner এর Asian cron যে data store করে (`timeframe='Asian'`), সেটাই show হবে
- London (`1H`) এবং New York (`New York`, `Strength On New York`) এর existing logic unchanged

**4. `usePreviousSessionData` hook আপডেট**
- Asian tab active → previous session হিসেবে New York data fetch করবে
- London tab active → previous session হিসেবে Asian data fetch করবে
- New York tab active → previous session হিসেবে London data fetch করবে (existing)

**5. `useBothSessionData` → `useAllSessionData` আপডেট**
- Asian session এর data ও fetch করবে
- `TimeframeComparison` component এ তিনটি session pass করা হবে (optional `asianData` prop)

### Data Flow
```text
AI Scanner Edge Function (3 cron jobs)
  ├── Asian  → currency_strength (timeframe='Asian')
  ├── London → currency_strength (timeframe='1H')
  └── NY     → currency_strength (timeframe='New York')
                    ↓
        ┌──────────┴──────────┐
   AI Scanner Page      Currency Strength Page
   (3 tabs)             (3 tabs — same data)
```

### No Migration Needed
Same `currency_strength` table, same data — শুধু UI query logic update।

