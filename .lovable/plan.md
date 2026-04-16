

# RSI Divergence Detection — Pair Selector Add-on

## কি করবো
Pair Selector edge function যখন 1H candles fetch করে, সেই data থেকেই RSI calculate করে **price vs RSI divergence** detect করবো। Divergence পাওয়া pair গুলো আলাদা "Divergence Alerts" section এ UI তে দেখাবো।

## Divergence Logic (1H Timeframe)

**Bullish Divergence**: Price lower low করেছে কিন্তু RSI higher low → potential reversal up
**Bearish Divergence**: Price higher high করেছে কিন্তু RSI lower high → potential reversal down

RSI 14-period standard। শেষ 30টা candle এর মধ্যে swing highs/lows compare করে detect করবো।

## Changes

### 1. Edge Function: `session-pair-selector/index.ts`

- **Add RSI calculation function** — standard 14-period RSI from close prices
- **Add divergence detection function** — last 30 candles এর swing points (local highs/lows within 5-bar window) compare করে:
  - Bullish: price swing low < previous swing low AND RSI swing low > previous RSI swing low
  - Bearish: price swing high > previous swing high AND RSI swing high < previous swing high
- **PairData interface** তে `rsi_value`, `divergence_type` (`"BULLISH"`, `"BEARISH"`, `"NONE"`) এবং `divergence_strength` (`"STRONG"`, `"MODERATE"`) add করবো
- **Results** এ divergence info include করবো + DB তে store করবো
- **Telegram message** এ divergence pairs আলাদা section এ দেখাবো

### 2. DB Migration: `session_pair_recommendations` table

- Add columns: `rsi_value numeric default 0`, `divergence_type text default 'NONE'`, `divergence_strength text default 'NONE'`

### 3. UI: `src/pages/PairSelector.tsx`

- Results tab এ **"🔀 Divergence Alerts"** নামে নতুন section — Priority Brief এর পরে, detailed cards এর আগে
- শুধু `divergence_type !== 'NONE'` pairs দেখাবো
- Card design: Pair name + flags + BULLISH/BEARISH badge (green/red) + RSI value + strength indicator + direction
- কোনো divergence না থাকলে section hide

### 4. Types update
- `QualifiedPair` interface এ `rsi_value`, `divergence_type`, `divergence_strength` add

## Technical Notes

- RSI আলাদা API call লাগবে না — existing 1H candles (201টা) থেকেই calculate হবে, তাই কোনো extra API usage নেই
- Swing point detection: 5-bar lookback window (2 bars each side)
- Divergence শুধু informational — pair selector এর scoring/qualification change হবে না

