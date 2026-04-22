

# Bias panel — show currently-running session's strength

## সমস্যা

Watchlist panel-এ "Strength from NEW YORK" দেখাচ্ছে যদিও এখন London session চলছে। এর কারণ:

1. **Mismatched labels** — Scanner DB-তে London-এর data **`1H`** label-এ store করে, কিন্তু `detectCurrentSession()` return করে `"London"` string. তাই DB lookup fail হয় এবং fallback `'New York'` (২ দিনের পুরোনো) data accept হয়ে যায়।
2. **Session overlap priority ভুল** — `detectCurrentSession()` 13:00–22:00 UTC-এর মধ্যে সবসময় "New York" দেয়, কিন্তু 13:00–16:00 হলো London/NY overlap — সেই সময় London-ই primary।
3. **Stale-data guard fallback-এ নাই** — শুধু `currentSession`-এর জন্য 24h staleness check আছে; fallback session-এর data যত পুরোনোই হোক accept করে নেয়।

## কীভাবে ঠিক করব

### 1. Scanner labels-এর সাথে session detector align (single source of truth)

`src/hooks/useCurrencyStrengths.ts`-এর `detectCurrentSession()` rewrite — `MARKET_SESSIONS` (`src/lib/timezone.ts`) থেকে DST-aware active session নির্ধারণ করে সেটাকে DB label-এ map করব:

| Live session | DB `timeframe` label |
|---|---|
| Tokyo / Sydney | `Asian` |
| London (only) | `1H` |
| London + NY overlap (13–16 UTC) | `1H` (London-priority — overlap-এ London momentum dominant) |
| New York (only, 16–22 UTC) | `New York` |
| Off-hours / weekend | latest non-stale snapshot |

(Sydney আলাদাভাবে scan হয় না, তাই Tokyo/Sydney → `Asian` bucket।)

### 2. Display label ↔ DB label আলাদা করা

`StrengthSnapshot`-এ দুইটা ফিল্ড:
- `timeframe` (DB row) — internal
- `sessionLabel` (UI banner-এ দেখানোর জন্য) — যেমন `"London"`, `"New York"`, `"Tokyo"`, `"London/NY Overlap"`

`WatchlistPanel.tsx`-এর banner এই `sessionLabel` দেখাবে, raw `1H` না।

### 3. Fallback chain-এ universal staleness guard

প্রতিটা fallback timeframe-এর জন্যও 24h staleness check apply করব (শুধু currentSession-এর জন্য না)। Weekend/holiday-এর সময় 7 দিন পর্যন্ত fallback allow করব যাতে UI খালি না থাকে, কিন্তু banner-এ "Last seen: X ago" দেখাব।

### 4. Cache invalidation session boundary-তে

বর্তমানে cache 60s TTL — session change হলে immediate refresh হয় না। Fix: `useStrengthSnapshot` mount/visibility-change-এ যদি detected session আগের cached `timeframe`-এর সাথে না মেলে, immediately refresh trigger করব।

## Files Changed

- **`src/hooks/useCurrencyStrengths.ts`** —
  - `detectCurrentSession()` rewrite করে `MARKET_SESSIONS` ব্যবহার করব এবং `{ dbTimeframe, displayLabel }` return করব।
  - `StrengthSnapshot` interface-এ `sessionLabel: string | null` add।
  - `fetchSnapshot()`-এ universal staleness check ও session-mismatch detection।
  - Cache key-তে detected session inclusion যাতে boundary cross করলে stale data না দেখায়।

- **`src/components/floating/WatchlistPanel.tsx`** — banner-এ `snapshot.sessionLabel || snapshot.timeframe` দেখাব (label friendly হবে: "LONDON" / "NEW YORK" / "TOKYO" / "LONDON/NY OVERLAP")।

## Out of Scope

- Cron schedule / scanner change (already correct)।
- Bias calculation logic (already strict)।
- DB label rename (`1H` → `London`) — backwards compat-এর জন্য DB যেমন আছে রেখে hook-এ map করব।

