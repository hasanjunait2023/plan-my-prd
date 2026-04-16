

# Floating Watchlist Button + Live Chart Window

## কি বানাবো (TradingView mobile app style)

একটা **floating draggable button** (iPhone AssistiveTouch এর মত) সব page এ থাকবে। Click করলে screenshot এর মত **categorized watchlist** খুলবে — pair click করলে **floating chart window** open হবে indicators সহ, drag/resize করা যাবে, close button থাকবে।

## Component Architecture

```text
<Layout>
  ├─ <Header />
  ├─ {children}  ← all pages
  └─ <FloatingWatchlist />     ← NEW (mounted once globally)
        ├─ FAB (draggable, position saved in localStorage)
        ├─ Watchlist Sheet/Panel  ← screenshot style list
        └─ FloatingChartWindow    ← draggable + resizable chart
```

## Files to create

### 1. `src/lib/watchlistData.ts`
সব 28 forex pairs + commodities + crypto একটা structured list এ:
```ts
{ category: 'USD'|'EUR'|...|'METALS'|'CRYPTO', symbol: 'EURUSD', name: 'Euro / U.S. Dollar', tvSymbol: 'OANDA:EURUSD' }
```
- USD majors, EUR/GBP/AUD/NZD/CAD/CHF crosses
- METALS: XAUUSD, XAGUSD, OILUSD
- CRYPTO: BTCUSD, ETHUSD, SOLUSD

### 2. `src/components/floating/FloatingAssistiveButton.tsx`
- Circular FAB (56px), gradient primary color, floating shadow
- **Drag logic**: `pointerdown/move/up` events → updates `transform: translate()`
- Position saved to `localStorage` key `fab-position`
- Snaps to nearest edge on release (left/right) like iOS
- Z-index 9999, fixed positioning
- Long-press shows quick menu (optional)

### 3. `src/components/floating/WatchlistPanel.tsx`
- **Mobile**: bottom Sheet (full height); **Desktop**: right-side Sheet (420px wide) — uses existing shadcn `Sheet`
- Top: Tabs row → "All Pair", "USD", "EUR", "GBP", "AUD", "NZD", "CAD", "CHF", "METALS", "CRYPTO" (horizontal scroll)
- Search input top-right
- Grouped list (when "All Pair" selected): category headers (USD, EUR, ...) with pairs underneath
- Each row: flag pair icons + symbol + full name + live price + change% (green/red)
- Live price: poll `fetch-asset-price` for commodities/crypto; for FX pairs use a lightweight realtime fetch (TwelveData via existing edge function or static skeleton if rate-limited — see Technical Notes)
- Click pair → opens `FloatingChartWindow`

### 4. `src/components/floating/FloatingChartWindow.tsx`
- **Desktop**: draggable floating window (default 720×520, min 480×360, resizable from bottom-right corner)
- **Mobile**: full-screen modal style
- Header bar: pair name + flags, drag handle, close (X) button
- Timeframe selector inside: **3M, 15M, 1H, 4H, D**
- Body: TradingView Advanced Chart widget (reuse logic from existing `LiveAdvancedChart` in PairSelector — EMA 9/15/200 + RSI, dark theme, range mapping)
- Position + size saved to `localStorage` (`chart-window-state`)
- Multiple windows? → **Single window only** (clicking new pair replaces). Keeps it simple + light.

### 5. `src/contexts/FloatingWatchlistContext.tsx` (optional, lightweight)
Provides: `openWatchlist()`, `openChart(symbol)`, `closeAll()` — so other parts of app can trigger.

## Layout integration

`src/components/Layout.tsx` — render `<FloatingAssistiveButton />` once at the bottom of the layout `<div>`, outside the main content. Hidden on `/auth` route.

## UX details (matching screenshots)

- Dark background (`bg-background`), thin separators
- Pair row: 64px tall, flag circles (overlap, base on top of quote — already have `PairWithFlags`)
- Price right-aligned, change% below in green/red
- Category headers small uppercase muted text
- Smooth animation on FAB drag (no transition during drag, ease on snap)
- Touch-friendly tap targets ≥44px

## Technical Notes

- **TradingView reuse**: Extract chart widget logic into shared `src/components/charts/AdvancedChartEmbed.tsx` (currently inlined in PairSelector). FloatingChartWindow + PairSelector both use it.
- **Live prices in watchlist**: Use existing `fetch-asset-price` for commodities/crypto. For 28 FX pairs — add new lightweight edge function `fetch-watchlist-prices` (single batch call to TwelveData `/quote` endpoint, returns array). Polls every 15s while panel open, paused when closed (saves API quota).
- **Drag**: Pure pointer events, no library needed. Constrain within viewport bounds.
- **Resize (desktop chart window)**: Bottom-right grip handle with pointer events.
- **Persistence**: FAB position, last opened pair, chart window size all in localStorage.
- **Z-index layers**: FAB 9999, watchlist sheet 9998, chart window 9997 — chart can stay open when watchlist closes.
- **Mobile vs Desktop**: `useIsMobile()` hook decides Sheet direction + window vs full-screen.

## Out of scope (later)
- Adding/removing pairs from watchlist (custom list)
- Multiple simultaneous chart windows
- Drawing tools persistence

