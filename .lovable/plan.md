
# Pair Selector Enhancement Plan

## কী Build করব

### 1. Bias Calculator Utility
নতুন file: `src/lib/biasCalculator.ts`
- Input: strength differential (base − quote)
- Output: `'HIGH_BUY' | 'MEDIUM_BUY' | 'NEUTRAL' | 'MEDIUM_SELL' | 'HIGH_SELL'`
- Thresholds: ≥3 = HIGH, 1.5-3 = MEDIUM, -1.5 to +1.5 = NEUTRAL

### 2. Strength Label Utility
নতুন file: `src/lib/strengthLabels.ts`
- Number → full word: "Strong", "Medium Strong", "Neutral", "Medium Weak", "Weak"
- Color mapping per category

### 3. Extended Strength Bar Component
নতুন file: `src/components/correlation/ExtendedStrengthBar.tsx`
- Wider/taller gradient bar (currently thin)
- Numeric value + full label (e.g. "EUR Medium Strong" not "EUR M")
- Bias badge attached (HIGH BUY/SELL/NEUTRAL with color)

### 4. Filter & Sort Bar
নতুন file: `src/components/correlation/BiasFilterBar.tsx`
- Filter chips: All | High Quality Buy | Medium Buy | Neutral | Medium Sell | High Quality Sell
- Sort dropdown: Differential ↓ | Differential ↑ | Pair Name | Bias Quality
- Active state highlight

### 5. Update PairSuggestions Component
- Replace short labels with full text
- Wire up bias badges
- Use ExtendedStrengthBar

### 6. Update PairSelector Page
- Add filter/sort state
- Apply filter+sort to suggestions list
- Empty state when filter returns nothing

## Files Modified/Created

```text
NEW:  src/lib/biasCalculator.ts
NEW:  src/lib/strengthLabels.ts
NEW:  src/components/correlation/ExtendedStrengthBar.tsx
NEW:  src/components/correlation/BiasFilterBar.tsx
EDIT: src/components/correlation/PairSuggestions.tsx
EDIT: src/pages/PairSelector.tsx
EDIT: src/types/correlation.ts (add bias types + threshold constants)
```

## Logic Detail

**Bias thresholds** (`absDiff` of strengths):
- `>= 3`: HIGH QUALITY
- `>= 1.5 && < 3`: MEDIUM QUALITY  
- `< 1.5`: NEUTRAL

Direction (BUY/SELL) আসে strength sign থেকে — base stronger = BUY, quote stronger = SELL.

**Full labels** (strength value):
- `>= 5`: "Strong" (green)
- `2 to 5`: "Medium Strong" (light green)
- `-2 to 2`: "Neutral" (yellow)
- `-5 to -2`: "Medium Weak" (orange)
- `<= -5`: "Weak" (red)

**Color tokens**: existing `CATEGORY_COLORS` reuse + semantic tokens from index.css.

## Design Notes
- Mobile-first (428px viewport)
- Filter chips horizontal scroll on small screens
- Bias badge: pill style, bold, contrasting color
- Bar height: 8px → 14px, full label below bar
