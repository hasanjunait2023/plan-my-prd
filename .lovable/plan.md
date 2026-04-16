

User wants: EMA 9, 15, 200 + RSI indicators + favorite timeframes (1m, 3m, 15m, 1H, 4H) on chart.

Looking at current code:
- `TradingViewWidget.tsx` and `AdvancedChartEmbed.tsx` already have EMA 9/15/200 + RSI in studies array
- Both already have `favorites.intervals: ["1", "3", "15", "60", "240"]`

So technically code-এ already আছে। কিন্তু user বলছে দেখা যাচ্ছে না — মানে TradingView free embed widget এ `favorites` API actually কাজ করে না (এটা শুধু advanced charting library তে available)।

Real issue: free embed widget এ favorites bar render হয় না। Solution হলো custom timeframe pills add করা চার্টের উপরে overlay হিসেবে যেগুলো TradingView interval change trigger করবে।

Plan:

# Chart Indicators + Favorite Timeframes Plan

## কী Build করব

### 1. Indicators verify (already আছে)
**Files**: `TradingViewWidget.tsx`, `AdvancedChartEmbed.tsx`
- EMA 9, 15, 200 + RSI already studies array এ আছে
- Confirm করে নিশ্চিত করব render হচ্ছে কিনা, missing থাকলে re-add করব

### 2. Custom Timeframe Pills (favorites replacement)
**সমস্যা**: TradingView free embed widget এ `favorites.intervals` actually visible bar render করে না — এটা শুধু paid charting library তে কাজ করে।

**Solution**: Chart-এর top-এ একটা compact custom pill bar add করব:
- Pills: `1m | 3m | 15m | 1H | 4H`
- Active pill highlighted (`bg-primary/20 text-primary`)
- Click করলে chart-এর interval change হবে (parent state update → widget re-render)

### 3. ChartPanel Update
**File**: `src/components/charts/ChartPanel.tsx`
- বর্তমানে শুধু RSI toggle আছে
- পাশে timeframe pills add করব (h-5, text-[9px], compact)
- `onIntervalChange` prop already আছে — সেটা wire up করব

### 4. FloatingChartWindow Update
**File**: `src/components/floating/FloatingChartWindow.tsx`
- দুটো `AdvancedChartEmbed` instance-এর উপরে same timeframe pill bar add করব
- প্রতিটার নিজস্ব interval state থাকবে (already আছে likely)

## Files Modified

```text
EDIT: src/components/charts/ChartPanel.tsx
EDIT: src/components/floating/FloatingChartWindow.tsx
VERIFY: src/components/charts/TradingViewWidget.tsx (EMA + RSI studies)
VERIFY: src/components/charts/AdvancedChartEmbed.tsx (EMA + RSI studies)
```

## Design Notes
- Pill bar: horizontal flex, gap-0.5, h-5
- Each pill: `px-2 text-[10px] font-bold rounded`
- Active = `bg-primary text-primary-foreground`
- Inactive = `bg-muted/30 text-muted-foreground hover:bg-muted/50`
- RSI toggle pill bar-এর ডানপাশে থাকবে
- Mobile-first (428px viewport) — single row, no wrap

## যা change হবে না
- Indicator config (EMA periods, RSI defaults)
- Volume overlay setup
- Drawing tools hidden state
- Chart business logic

