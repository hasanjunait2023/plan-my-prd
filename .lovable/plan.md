

# Pair Selector UI Redesign — Premium & Simplified

## Problem
বর্তমান PairSelector page এ `PremiumPairCard` অনেক complicated — score ring, 6-layer breakdown bar, layer legend, metric boxes, status badges, আর mini symbol overview chart (যেটা ছোট এবং non-interactive)। অনেক visual noise।

## Design Direction
Clean, premium, card-per-pair layout। প্রতিটি qualified pair এর জন্য:
1. **Header strip** — Flag + Pair name + BUY/SELL badge + Score (simple text, no ring)
2. **Live TradingView Advanced Chart** — 15-minute interval, EMA 9/15/200 + RSI (same config as `PairSuggestions > InlineChart`), height **450px** (mobile-friendly বড় chart)
3. **Expand button** — Full-screen dialog (already exists pattern)

সব layer breakdown bar, metric boxes (Gap/ADR/Ext), status badges — **remove**। শুধু pair name, direction, score, আর chart।

## Changes

### File: `src/pages/PairSelector.tsx`

1. **Replace `PremiumPairCard`** with a simplified component:
   - Header: `🇬🇧🇯🇵 GBP/JPY` + `BUY` badge (green/red) + score as simple text `85/105`
   - Below header: Full TradingView Advanced Chart widget (15min, EMA 9/15/200 + RSI), height 450px
   - Expand icon to open full-screen dialog with the same chart
   
2. **Remove** these sub-components (no longer needed):
   - `MetricBox`
   - `LayerSegment`
   - `StatusBadge`
   - `parseLayerScores`
   - Score ring SVG
   - 6-layer breakdown bar + legend
   - Status badges row

3. **Replace `MiniTradingViewChart`** with the full Advanced Chart widget (reuse the same pattern from `PairSuggestions > InlineChart` — `embed-widget-advanced-chart.js` with EMA 9, 15, 200 + RSI studies, interval `"15"`)

4. Chart height: **450px** inline, full viewport in expanded dialog

### No changes to:
- Hero header, session tabs, run button, progress bar, currency strength strip, skipped tab, empty states — these stay as-is

## Technical Notes
- TradingView Advanced Chart widget config identical to `PairSuggestions > InlineChart` but with `interval: "15"` instead of `"60"`
- The expand dialog reuses the existing `Dialog/DialogContent` pattern
- Removing ~150 lines of complex sub-components, replacing with ~80 lines of clean card + chart

