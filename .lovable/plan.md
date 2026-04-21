

# Floating Watchlist-এ Bias Display + Quality Filter

## কী Add হবে

Floating assistive button → Watchlist panel-এর প্রতিটা forex pair-এর জন্য একটা **Bias badge** দেখাবে (HQ Buy / Med Buy / Neutral / Med Sell / HQ Sell), এবং উপরে একটা **Quality Filter chip bar** থাকবে দ্রুত filter করার জন্য।

## UI Design (WatchlistPanel-এর ভেতরে)

```text
┌──────────────────────────────────────────┐
│ Watchlist                            [×] │
│ ⚡ Strength from NEW YORK      14:32     │
├──────────────────────────────────────────┤
│ 🔍 Search pairs...                       │
├──────────────────────────────────────────┤
│ [All] [USD] [EUR] [GBP] [JPY] ...        │ ← existing category tabs
├──────────────────────────────────────────┤
│ ★ Quality:                               │ ← NEW bias filter row
│ [All] [HQ Buy] [Med Buy] [Neut]          │
│ [Med Sell] [HQ Sell]                     │
│                          12 of 33 pairs  │
├──────────────────────────────────────────┤
│ 🇪🇺🇺🇸  EURUSD          EUR +6   ┃      │
│ Euro / U.S. Dollar      USD -4   ┃      │
│ [EUR S] / [USD W] [🟢 HQ BUY]    Δ +10   │ ← NEW bias pill
├──────────────────────────────────────────┤
│ 🇬🇧🇯🇵  GBPJPY          GBP +5   ┃      │
│ ...                     [🟡 NEUT] Δ +1   │
└──────────────────────────────────────────┘
```

## Bias Logic (existing `src/lib/biasCalculator.ts` reuse)

প্রতিটা forex pair-এর জন্য:
- `diff = baseStrength − quoteStrength` (already calculated in `PairRow`)
- `calculateBias(diff)` → returns `{ quality, shortLabel, color, bgColor, borderColor, rank }`

Quality bands (existing thresholds):
- **|diff| ≥ 3** → HQ Buy / HQ Sell (green/red strong)
- **1.5 ≤ |diff| < 3** → Med Buy / Med Sell
- **|diff| < 1.5** → Neutral
- Non-forex pairs (XAUUSD, BTCUSD ইত্যাদি যাদের একটা leg-এর strength নেই) → bias dekhabe na, "—" দেখাবে; filter active থাকলে এগুলো hide হবে।

## Filter Behavior

- Default: **"All"** selected → কোনো filter নেই
- "HQ Buy" tap → শুধু HQ_BUY pairs
- Multiple tabs একসাথে combine হবে: **Category tab AND Search AND Bias filter** — তিনটাই AND condition
- Filter selection **`useSyncedPreference`** দিয়ে save হবে (`watchlist.biasFilter`) → device-cross persisted
- Sort order: bias filter active থাকলে diff-এর descending order-এ auto-sort (strongest signal উপরে)

## Files Changed/Created

**New file:**
- `src/components/floating/BiasPill.tsx` — small inline badge using `BiasInfo` colors (similar pattern to `StrengthBadge.tsx`)

**Modified:**
- `src/components/floating/WatchlistPanel.tsx`:
  - Import `calculateBias`, `BIAS_FILTER_OPTIONS`, `BiasQuality` from `@/lib/biasCalculator`
  - Add `biasFilter` state via `useSyncedPreference<BiasQuality | 'ALL'>('watchlist.biasFilter', 'ALL')`
  - Add filter chip row between category tabs and list (compact horizontal scroll, similar style to existing tabs but smaller)
  - In `useMemo` items filter: compute bias for each forex pair, then filter by `biasFilter` (skip non-forex when filter ≠ 'ALL')
  - When filter ≠ 'ALL', sort by `|diff|` descending
  - Pass `bias` prop into `PairRow`
- `PairRow` component (same file):
  - Render `<BiasPill>` next to existing `PairStrengthBadges` (or below on narrow widths)
  - Color the pill using `bias.bgColor` / `bias.color` / `bias.borderColor`
- Show "X of Y pairs" counter when filter active

## Technical Details

- **No DB changes needed** — bias is derived live from existing `currency_strength` snapshot already loaded by `useStrengthSnapshot()`
- **Non-forex pairs** (Metals/Crypto/Oil): বাদ পড়বে যখন quality filter active। "All" mode-এ "—" placeholder দেখাবে।
- **Performance**: bias calculation cheap (one subtract + threshold check per pair); recomputed inside existing `useMemo`
- **Persistence key**: `watchlist.biasFilter` synced via `PreferencesContext` (same pattern as `watchlist.lastPair`)
- **Mobile-first**: filter chips horizontally scrollable, identical styling pattern to existing category tabs but with quality-specific colors (green/yellow/red shades from `biasCalculator`)
- **Empty state**: if filter yields 0 pairs, show "No pairs match this bias quality" message

## Out of Scope (not in this change)

- Bias trend over time / history
- Bias-based push notifications
- Editing bias thresholds from UI

