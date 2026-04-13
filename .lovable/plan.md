

## Plan: Currency Strength Page — Auto-detect Active Session as Default Tab

### তুমি যা চাও
Currency Strength page ওপেন করলে **currently active trading session** অনুযায়ী default tab select হবে:
- New York session চলছে → **New York** tab default
- London session চলছে → **London** tab default
- Asian/Tokyo session চলছে → **London (1H)** tab default
- কোনো session না চললে → last active বা London default

### বর্তমান সমস্যা
- `activeTab` সবসময় hardcoded `'1H'` (London) দিয়ে শুরু হয়
- Session detect করার সব utility (`isSessionActive`, `getSessionHours`, `MARKET_SESSIONS`) already আছে `src/lib/timezone.ts` এ

### Plan

**Step 1: Create `getDefaultTab()` helper function**
- `src/pages/CurrencyStrength.tsx` এ একটা function তৈরি করবো
- `MARKET_SESSIONS`, `getSessionHours`, `isSessionActive` ব্যবহার করে current active session detect করবে
- Mapping: New York active → `'New York'`, London active → `'1H'`, Tokyo/Sydney active → `'1H'`
- Multiple session overlap হলে priority: New York > London > Tokyo > Sydney

**Step 2: Update `useState` initialization**
- `useState('1H')` → `useState(getDefaultTab)` — lazy initializer হিসেবে pass করবো
- Page load এ automatically correct session tab select হবে

### Files Changed
| File | Change |
|---|---|
| `src/pages/CurrencyStrength.tsx` | Add `getDefaultTab()` function, update `useState` initial value |

### Technical Note
- No new dependencies needed — সব timezone utility already exists
- শুধু ~15 lines code change

