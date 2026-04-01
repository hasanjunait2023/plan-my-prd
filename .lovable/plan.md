

# TradingView Chart — EMA, RSI ও Timeframe Selector

## কি করতে হবে
TradingView chart embed এ **EMA 9, 15, 200** ও **RSI** indicators যোগ করা, এবং **timeframe switch** (3M, 15M, 1H) করার UI দেওয়া।

## Technical Changes

**File: `src/components/assets/TradingViewChart.tsx`**

1. **State যোগ**: `useState` দিয়ে selected timeframe track করা (default: `60` i.e. 1H)

2. **Timeframe buttons**: Chart header এ 3টা button — `3M`, `15M`, `1H`। Active button highlighted।

3. **iframe URL update**:
   - `"interval"` parameter: `"3"` / `"15"` / `"60"` (timeframe অনুযায়ী)
   - `"studies"` parameter: `["MAExp@tv-basicstudies@9","MAExp@tv-basicstudies@15","MAExp@tv-basicstudies@200","RSI@tv-basicstudies"]`

4. **useEffect dependency**: `symbol` ও `timeframe` দুটোতেই re-render হবে

```text
Timeframe map:
  "3M"  → interval: "3"
  "15M" → interval: "15"  
  "1H"  → interval: "60"
```

### UI Layout
```text
┌─ Chart Card ──────────────────────┐
│  📊 Title        [3M] [15M] [1H] │
│  ┌──────────────────────────────┐ │
│  │  TradingView Chart           │ │
│  │  (EMA 9/15/200 + RSI)       │ │
│  └──────────────────────────────┘ │
└───────────────────────────────────┘
```

শুধু একটা file modify হবে: `TradingViewChart.tsx`

