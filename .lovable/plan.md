
# Chart Enhancement Plan

## কী করব

### 1. Drawing tool hide (Floating Chart Window)
**File**: `src/components/floating/FloatingChartWindow.tsx`
- দুটো `AdvancedChartEmbed` instance এ `hideSideToolbar={true}` prop pass করব
- side toolbar = TradingView এর drawing tools (left side এর pencil/line/shape icons)

### 2. RSI toggle button (ChartPanel)
**Files**:
- `src/components/charts/TradingViewWidget.tsx` — `showRsi` prop add করব (default `true`)
- `src/components/charts/ChartPanel.tsx` — timeframe buttons এর পাশে compact RSI toggle button add করব
- প্রতিটা panel এর নিজস্ব RSI on/off state থাকবে (local state in ChartPanel)

**Logic**: `showRsi=false` হলে studies array থেকে RSI বাদ যাবে, শুধু EMA 9/15/200 + Volume থাকবে।

### 3. Top bar compact (ChartAnalysis)
**File**: `src/pages/ChartAnalysis.tsx`
- Top bar height: `h-6` → `h-5` (সব button)
- Padding: `py-1` → `py-0.5`
- Result: ~8-10px বেশি chart area

## Files Modified

```text
EDIT: src/components/floating/FloatingChartWindow.tsx
EDIT: src/components/charts/TradingViewWidget.tsx
EDIT: src/components/charts/ChartPanel.tsx
EDIT: src/pages/ChartAnalysis.tsx
```

## Design Notes
- RSI toggle: h-5 height, 9px text "RSI"
- Active = `bg-primary/20 text-primary`, inactive = muted
- Mobile-first (428px viewport)
- কোন business logic বা data flow change নেই

## যা change হবে না
- Currency strength, bias calculator, pair suggestions touch হবে না
- ChartAnalysis এর drawing tool already hidden আছে — সেটাই থাকবে
