

# Commodities & Crypto Pages — Plan

## নতুন Pages

### 1. Commodities Page (`/commodities`)
Gold (XAUUSD), Silver (XAGUSD), Oil (USOIL/WTICL) — তিনটা asset নিয়ে।

### 2. Crypto Page (`/crypto`)
BTC (BTCUSD) নিয়ে।

## প্রতিটা Page এ কি কি থাকবে

### A. Live Price & Chart
- **TradingView Embed Widget** (free, no API key needed) — lightweight chart embed করবো প্রতিটা asset এর জন্য
- Real-time price display with 24h change %

### B. Key Trading Metrics Card
- **ADR (Average Daily Range)** — current day range vs average
- **Session Activity** — কোন session এ সবচেয়ে বেশি move হয়
- **Spread Indicator** — typical spread info (static data)

### C. Technical Snapshot
- **EMA Alignment Status** — existing EMA scan edge function reuse করে asset-specific scan
- **Trend Direction** — current trend (Bullish/Bearish/Ranging) based on EMA data
- **Key Levels** — static/manually updated support & resistance levels

### D. Trading Tips Card (Static)
- **Commodities**: Gold এর জন্য session correlation (London/NY best), Silver এর Gold correlation, Oil এর inventory report timing
- **Crypto**: BTC volatility patterns, weekend vs weekday behavior, halving cycle info

### E. Correlation Card
- **Gold**: USD inverse correlation meter
- **Silver**: Gold-Silver ratio display
- **Oil**: Geopolitical risk indicator (static)
- **BTC**: BTC dominance % (static/manual)

## Data Sources

| Source | Usage | Cost |
|--------|-------|------|
| TradingView Widget | Chart embed | Free (no API key) |
| Yahoo Finance (via edge function) | Live price, 24h change | Free |
| Existing Supabase data | EMA scan, ADR | Already setup |

### Yahoo Finance Edge Function
নতুন edge function `fetch-asset-price` — Yahoo Finance API থেকে price fetch করবে Gold, Silver, Oil, BTC এর জন্য। Free, no API key needed।

## Technical Changes

### New Files
1. **`src/pages/Commodities.tsx`** — Gold, Silver, Oil page with tabs
2. **`src/pages/Crypto.tsx`** — BTC focused page
3. **`src/components/assets/AssetPriceCard.tsx`** — Live price display card (reusable)
4. **`src/components/assets/TradingViewChart.tsx`** — TradingView widget embed (reusable)
5. **`src/components/assets/TradingTipsCard.tsx`** — Static trading tips
6. **`src/components/assets/CorrelationInfo.tsx`** — Correlation display card
7. **`supabase/functions/fetch-asset-price/index.ts`** — Yahoo Finance price fetcher

### Modified Files
- **`src/App.tsx`** — নতুন routes যোগ
- **`src/components/Layout.tsx`** — nav items এ Commodities ও Crypto যোগ (bottom bar restructure needed — mobile এ 8টা item হয়ে যাবে, তাই Commodities ও Crypto কে profile dropdown এ রাখা ভালো, অথবা mainNav এ রেখে আরো compact করা)
- **`src/lib/pairFlags.tsx`** — Oil (USOIL) এর জন্য flag যোগ: `🛢️`

### Nav Strategy
Bottom bar already 6টা item আছে। নতুন 2টা page যোগ করলে cramped হবে। তাই:
- **Desktop sidebar**: সব items দেখাবে
- **Mobile bottom bar**: Commodities ও Crypto কে profile dropdown menu তে যোগ করবো (Psychology, Intel, Settings এর সাথে)

### TradingView Widget
```text
Lightweight embed — iframe based, free:
- XAUUSD chart for Gold
- XAGUSD chart for Silver  
- USOIL chart for Oil
- BTCUSD chart for BTC
```

## Page Layout (Both Pages)

```text
┌─────────────────────────────────┐
│  🥇 Commodities / ₿ Crypto     │
│  [Gold] [Silver] [Oil] tabs     │  ← Commodities only
├─────────────────────────────────┤
│  Live Price Card    │ 24h Chg   │
├─────────────────────────────────┤
│  TradingView Chart (embed)      │
├────────────────┬────────────────┤
│ Trading Metrics│ Correlation    │
├────────────────┴────────────────┤
│ Trading Tips & Best Practices   │
└─────────────────────────────────┘
```

