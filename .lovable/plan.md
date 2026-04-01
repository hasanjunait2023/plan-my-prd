

# Chart Analysis Page — Redesign Plan (Updated)

## কি হবে

### 1. Layout System (1-4 charts, no scroll)
- **1 chart**: full screen — timeframe 1H
- **2 charts**: 2 columns, 50/50 — 15m, 1H
- **3 charts**: 3 columns equal — 15m, 1H, 4H
- **4 charts**: 2x2 grid — 15m, 1H, 4H, D
- সব chart **viewport height এ fit** হবে, scroll লাগবে না — `h-[calc(100vh-<header>)]` ব্যবহার হবে
- Panel এর মধ্যে gap কমিয়ে `gap-0.5` বা `gap-1` রাখবো

### 2. Single Symbol, Independent Timeframe
- **Top bar এ symbol selector** — সব panel এ একই symbol
- প্রতিটা panel এ **নিজের timeframe selector** থাকবে — তুমি যেকোনো panel এর timeframe আলাদাভাবে change করতে পারবে
- Default timeframe auto-assign হবে (15m, 1H, 4H, D) কিন্তু তুমি change করলে **তোমার সেটাই থাকবে** — state persist হবে

### 3. Chart বড় করা
- Panel toolbar শুধু timeframe buttons (একটা thin row) — বাকি সব top bar এ
- TradingView widget `flex-1 min-h-0` দিয়ে maximum space নেবে
- Panel border/padding কমিয়ে chart area maximize

### 4. forwardRef Warning Fix

## Files

| Action | File |
|--------|------|
| **Modify** | `src/pages/ChartAnalysis.tsx` — Layout 1-4, single symbol top bar, full viewport height |
| **Modify** | `src/components/charts/ChartPanel.tsx` — Symbol prop receive, নিজের timeframe selector রাখবে |
| **Modify** | `src/components/charts/TradingViewWidget.tsx` — forwardRef fix if needed |

