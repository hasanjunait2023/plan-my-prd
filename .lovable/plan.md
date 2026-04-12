

## Plan: Supply & Demand Zones + Chart Visualization

### কি করা হবে
Aligned pair গুলোর জন্য **Supply & Demand zone detect** করা হবে এবং প্রতিটি pair এর পাশে একটি **TradingView mini chart** embed করা হবে — যেখানে zone levels horizontal line হিসেবে visually দেখা যাবে।

### Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Supply & Demand Zones                                    🔄 Scan  │
├──────────┬───────┬────────────────┬────────────────┬───────────────┤
│ Pair     │ Bias  │ Demand Zone    │ Supply Zone    │ Proximity     │
├──────────┼───────┼────────────────┼────────────────┼───────────────┤
│ EUR/USD  │▲ BUY  │1.0812 – 1.0835│1.0920 – 1.0945│ 🟢 Near DZ   │
│          │       │  [▼ Show Chart]                                 │
│──────────┼───────┼────────────────┼────────────────┼───────────────│
│ GBP/USD  │▲ BUY  │1.2650 – 1.2670│1.2780 – 1.2810│ ⏳ Mid Range  │
└──────────┴───────┴────────────────┴────────────────┴───────────────┘

Expanding chart row:
┌─────────────────────────────────────────────────────────────────────┐
│  EUR/USD — 1H Chart                                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  TradingView Advanced Chart Widget (embedded)                │  │
│  │  ── ── ── Supply Zone line (red dashed) ── ── ──            │  │
│  │                                                               │  │
│  │  ── ── ── Demand Zone line (green dashed) ── ── ──          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Chart Visualization Approach

TradingView embed widget `overrides` ব্যবহার করে zone mark করা যায় না (widget API limitation)। তাই approach হবে:

1. **TradingView Mini Chart Widget** — প্রতিটি pair এর জন্য expandable row তে 1H chart embed করা হবে
2. **Zone Overlay** — Chart এর উপরে CSS `position: absolute` দিয়ে Demand ও Supply zone গুলো **color band** হিসেবে overlay করা হবে — approximate Y-position calculate করে
3. **Alternative**: Zone levels chart এর পাশে text label হিসেবে দেখানো হবে (যেন user chart এ নিজে match করতে পারে)

> **Limitation**: TradingView embed widget এ programmatically horizontal line draw করা যায় না। তাই overlay band approach ব্যবহার হবে যা approximate কিন্তু visually helpful।

### Implementation Details

**1. Edge Function — `supabase/functions/supply-demand-zones/index.ts`**
- Input: `{ pairs: [{ pair, direction }] }` 
- TwelveData `time_series` API → 1H candles (100 bars)
- Swing High/Low pivot detection → Impulsive move filter (2x ATR) → Zone calculate
- Return: `{ pair, demandZone: {high, low}, supplyZone: {high, low}, currentPrice, proximity, priceRange: {chartHigh, chartLow} }`
- `priceRange` chart overlay positioning এর জন্য দরকার

**2. Component — `src/components/correlation/SupplyDemandPanel.tsx`**
- Table: Pair, Bias, Demand Zone, Supply Zone, Proximity
- প্রতিটি row expandable — click করলে নিচে TradingView chart দেখাবে
- Chart এর উপরে zone overlay bands:
  - Demand zone = green semi-transparent band
  - Supply zone = red semi-transparent band
- Mobile: Chart height ছোট (200px), desktop এ 350px
- Expand শুধু একটা pair এর জন্য — অন্যটা click করলে আগেরটা collapse

**3. CurrencyStrength page — section add**

### Files

| File | Action |
|------|--------|
| `supabase/functions/supply-demand-zones/index.ts` | Create — S/D zone detection |
| `src/components/correlation/SupplyDemandPanel.tsx` | Create — Table + expandable chart |
| `src/pages/CurrencyStrength.tsx` | Edit — নতুন section add |

### TradingView Chart Config (per pair)
- Symbol: pair এর TradingView format (e.g., `FX:EURUSD`)
- Interval: `60` (1H)
- Compact: `hide_top_toolbar: true`, `hide_side_toolbar: true`, no studies
- Height: 300px (expandable row তে)

### Zone Overlay Positioning
```text
Chart container (relative) 
  └── TradingView iframe
  └── Demand band (absolute, bottom %, green/10% opacity)
  └── Supply band (absolute, top %, red/10% opacity)
  
Position % = ((zonePrice - chartLow) / (chartHigh - chartLow)) * 100
```

Edge function থেকে পাওয়া `priceRange` (chart high/low) ব্যবহার করে band এর CSS `bottom%` ও `height%` calculate হবে।

