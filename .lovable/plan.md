

## Plan: New York Session Data Fix — Timeframe Mapping

### সমস্যা
n8n workflow London এবং New York দুটো session এর জন্যই Telegram message এ "Strength On 1H" পাঠায়। Edge function সেটা parse করে `timeframe: "1H"` হিসেবে store করে। ফলে:
- **London tab** (`1H` query) → London + New York দুটোর data ই দেখায়
- **New York tab** (`New York` query) → কিছুই পায় না

DB তে আজকের data: `2026-04-07 12:00:00 UTC` → `timeframe: 1H` (এটা আসলে New York session — 12 UTC = 7 AM ET)

### Solution
`store-currency-strength` edge function এ timeframe auto-detect logic যোগ করা। যখন parsed timeframe `1H`, তখন `recorded_at` এর UTC hour দেখে session নির্ধারণ:

| UTC Hour | Session | Stored Timeframe |
|----------|---------|-----------------|
| 0-11 | London | `1H` (unchanged) |
| 12-23 | New York | `New York` |

### Changes

| File | Change |
|------|--------|
| `supabase/functions/store-currency-strength/index.ts` | `timeframe === "1H"` হলে `recorded_at` hour check করে `"New York"` এ remap করা |

### Fix করার পরে
- আজকের existing `1H` data (12:00 UTC) কে `New York` এ update করা দরকার — একটা migration SQL দিয়ে
- ভবিষ্যতে নতুন data সঠিক tab এ যাবে automatically

### Migration SQL
```sql
UPDATE currency_strength 
SET timeframe = 'New York' 
WHERE timeframe = '1H' 
AND EXTRACT(HOUR FROM recorded_at) >= 12;
```

