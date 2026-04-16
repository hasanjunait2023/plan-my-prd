

# Floating Watchlist Enhancement Plan

## কোথায় কাজ হবে
**Right-side floating Watchlist panel** (Index dashboard থেকে accessible) — `WatchlistPanel.tsx` + `StrengthBadge.tsx`।

বর্তমানে প্রতিটা pair row-তে:
- Left: short tier badges ("EUR M+" / "USD W")  
- Right: numeric values (+5/-3) + ছোট Δ pill

## কী Build/Update করব

### 1. Full Strength Label (left side)
**File**: `src/components/floating/StrengthBadge.tsx` + `WatchlistPanel.tsx`
- `PairStrengthBadges`-এ নতুন prop `variant="full"` add (default থাকবে compact যাতে FloatingChartWindow break না করে)
- `full` mode-এ short ("M+", "W") replace হয়ে দেখাবে: **"EUR Medium Strong"**, **"USD Weak"**
- WatchlistPanel-এর `PairRow`-এ `variant="full"` pass করব
- Vertical stack layout (mobile-friendly, 428px viewport-এ ভাঙবে না)

### 2. Extended Strength Bar with Indicator (right side)
**Reuse**: existing `ExtendedStrengthBar` component (already built, 14px gradient bar with center marker)
- Right column-এর numeric blocks replace করে দুটো mini ExtendedStrengthBar বসাব (base + quote)
- Δ pill-এর জায়গায় **Bias Badge** (HQ BUY / MED SELL / NEUTRAL) — `calculateBias()` থেকে color + label
- Bias badge হবে full-width pill, gradient background, conviction-based glow

### 3. Bias Calculation Integration
**Reuse**: `src/lib/biasCalculator.ts` (already exists)
- প্রতিটা PairRow-এ `calculateBias(baseStrength - quoteStrength)` call হবে
- Result: `HIGH_BUY | MEDIUM_BUY | NEUTRAL | MEDIUM_SELL | HIGH_SELL`
- PairRow-এর border color bias-driven করব (subtle highlight)

### 4. Sorting & Filtering
**Reuse**: `BiasFilterBar` component (already exists from PairSuggestions)
- WatchlistPanel-এর search input-এর নিচে BiasFilterBar mount করব
- Filter chips: All | HQ Buy | Med Buy | Neutral | Med Sell | HQ Sell  
- Sort dropdown: Differential ↓/↑ | Pair Name | Bias Quality
- যেসব pair-এ strength data নেই (bias undefined) সেগুলো filter-এ "ALL" বাদে exclude
- Sort apply হবে category grouping-এর ভেতরে (ALL tab-এ গ্রুপ-by-category preserve)

### 5. Empty State
- Filter result empty হলে "এই filter-এ কোনো pair নেই" + Reset button (PairSuggestions-এর pattern)

## Files Modified/Created

```text
EDIT: src/components/floating/StrengthBadge.tsx       (add variant="full" prop)
EDIT: src/components/floating/WatchlistPanel.tsx      (full labels + bias + filter/sort)
NEW:  src/components/floating/PairBiasRow.tsx         (extracted enriched row component)
```

`biasCalculator.ts`, `strengthLabels.ts`, `ExtendedStrengthBar.tsx`, `BiasFilterBar.tsx` সব already আছে — শুধু reuse।

## Layout (mobile 428px)

```text
┌───────────────────────────────────────┐
│ 🇪🇺🇺🇸  EURUSD                     [HQ BUY]│
│         Euro - US Dollar                  │
│  EUR  Medium Strong  ████████▌ +4.2      │
│  USD  Weak           ▌████████ -5.1      │
│                          Δ +9.3 →         │
└───────────────────────────────────────┘
```

## Design Notes
- Touch target ≥48px (min-height 80px per row)
- Bias badge: top-right, conviction-based gradient + glow
- Bars: 10px height (compact than PairSuggestions-এর 14px, watchlist-এ density বেশি দরকার)
- Filter chip bar: sticky-friendly, horizontal scroll
- Color tokens: existing `biasCalculator` palette reuse

## যা Change হবে না
- ChartAnalysis, PairSuggestions, FloatingChartWindow header — সব intact
- StrengthBadge-এর default behavior unchanged (backward compatible)
- Watchlist-এর search, tabs, openChart click — সব same

