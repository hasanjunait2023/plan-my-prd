

## Plan: Strength Ranking এ Previous Snapshot এর Category ও Strength দেখানো

### তুমি যা চাও
প্রতিটা currency এর পাশে তার **আগের snapshot** এ সে কোন category তে ছিল (STRONG / NEUTRAL / WEAK) এবং তার strength number কত ছিল — এটা দেখাতে চাও।

### UI তে কিভাবে দেখাবে

```text
#1 🇪🇺 EUR  ████████  +7  ↑2  ▲  STRONG   was: NEUTRAL (+5)
#2 🇬🇧 GBP  ██████    +5  ↓1  ▲  STRONG   was: STRONG (+6)
#3 🇺🇸 USD  █████     +4  ↑1  ▲  NEUTRAL  was: WEAK (+2)
```

- **"was: NEUTRAL (+5)"** — আগের snapshot এ category কি ছিল এবং strength number কত ছিল
- Category change হলে color contrast দিয়ে highlight করবে (যেমন WEAK → STRONG হলে green glow)
- Category same থাকলে muted/dim style এ দেখাবে

### Technical Changes

**1. `src/pages/CurrencyStrength.tsx`** — `usePreviousDayStrength` কে `usePreviousSnapshot` এ পরিবর্তন
- বর্তমান query সবসময় গতকালের data আনে
- নতুন logic: একই দিনের + গতকালের সব data আনবে, current latest `recorded_at` এর ঠিক আগের unique `recorded_at` snapshot খুঁজে বের করবে
- এতে London → NY switch হলে London এর data দেখাবে (last snapshot)
- `previousData` হিসেবে full `CurrencyStrengthRecord[]` পাঠাবে (category সহ)

**2. `src/components/correlation/StrengthMeter.tsx`** — Previous info badge যোগ
- Existing delta badge (↑2/↓1) যেমন আছে তেমনই থাকবে
- নতুন একটা "was" badge যোগ হবে — আগের category + strength number দেখাবে
- `prevMap` কে extend করে `prevCategoryMap` ও বানাবে
- Category change হলে highlighted badge, same হলে dim badge

### Files

| File | Action |
|------|--------|
| `src/pages/CurrencyStrength.tsx` | Edit — `usePreviousDayStrength` → `usePreviousSnapshot` (আগের snapshot fetch করবে, শুধু গতকাল না) |
| `src/components/correlation/StrengthMeter.tsx` | Edit — "was: CATEGORY (±N)" badge যোগ করবে existing layout এ |

### কোনো DB change নেই
`currency_strength` table এ সব data আছে — শুধু query logic পরিবর্তন।

