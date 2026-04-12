

## Plan: Price Spike Detector — Grouped Correlated Alerts + UI Page

### কি করা হবে
আগের plan এ একটা key change: যখন একসাথে অনেক correlated pairs spike করবে (যেমন USD weakness এ EURUSD, GBPUSD, AUDUSD সব উঠে), তখন **একটা grouped message** যাবে — আলাদা আলাদা alert না।

### Grouped Alert Logic

Edge function এ spike detection এর পরে একটা **grouping step** থাকবে:

1. সব spiked pairs collect হবে
2. Direction অনুযায়ী group হবে (BULLISH / BEARISH)
3. **Major pairs** (EURUSD, GBPUSD, USDJPY, USDCHF, USDCAD, AUDUSD, NZDUSD) → headline এ দেখাবে
4. **Cross/Other pairs** → নিচে secondary list হিসেবে দেখাবে
5. একটাই Telegram message পাঠাবে

### Grouped Telegram Message Format

যখন ≥2 pairs একসাথে spike করে:

```
🔴🔴🔴 MULTI-PAIR SPIKE 🔴🔴🔴

⚡ USD Weakness Detected — 5 pairs moving!

📊 Major Pairs:
  📈 EUR/USD +0.28% | 1.0850 → 1.0880
  📈 GBP/USD +0.35% | 1.2700 → 1.2745
  📈 AUD/USD +0.22% | 0.6520 → 0.6535

📋 Also moving:
  EUR/JPY +0.18% | GBP/JPY +0.24% | AUD/NZD +0.15%

⏰ 🇧🇩 15:32 BST
⚠️ Possible: News event / Central bank action
🎯 Check economic calendar NOW
```

যখন শুধু 1টা pair spike করে → আগের মতো individual message।

### Urgency Level (grouped)
- ≥4 pairs spike → **CRITICAL 🔴** (multi-pair)
- 2-3 pairs spike → **HIGH 🟡** (multi-pair)
- 1 pair spike → আগের মতো individual urgency

### Detection Flow
```text
Fetch prices (28 pairs, 1 batch call)
  → Compare with price_snapshots
  → Filter: change > threshold
  → IF spiked_pairs.length >= 2:
      → Group by direction (BULL/BEAR)
      → Separate majors vs crosses
      → Send 1 grouped message per direction
  → ELSE IF spiked_pairs.length == 1:
      → Send individual alert (আগের format)
  → Update price_snapshots
```

### যা তৈরি হবে

| File | Purpose |
|------|---------|
| **Migration**: `price_snapshots` table | Last price per pair |
| **Migration**: `spike_thresholds` table | Configurable thresholds |
| `supabase/functions/price-spike-detector/index.ts` | Price fetch → detect → group → alert |
| `src/pages/SpikeAlerts.tsx` | Status, config, live feed page |
| `src/App.tsx` | Route: `/spike-alerts` |
| `src/components/Layout.tsx` | Nav item in Market tools |

### UI Page (`/spike-alerts`)

```text
┌─────────────────────────────────────────────────┐
│  🚨 Price Spike Alerts                          │
├─────────────────────────────────────────────────┤
│  ┌─── Status ────────┐  ┌─── Thresholds ───┐   │
│  │ Monitor: ✅ Active │  │ Major: 0.15%     │   │
│  │ Pairs: 28         │  │ Cross: 0.20%     │   │
│  │ Last: 12s ago     │  │ Gold:  0.30%     │   │
│  └────────────────────┘  │ Cooldown: 5 min  │   │
│                          │ [Save]           │   │
│                          └──────────────────┘   │
├─────────────────────────────────────────────────┤
│  Recent Spikes (Realtime)                       │
│  ┌──────────────────────────────────────────┐   │
│  │ 🔴 MULTI-PAIR  5 pairs  15:32 BD        │   │
│  │    Majors: EUR/USD, GBP/USD, AUD/USD     │   │
│  │    Also: EUR/JPY, GBP/JPY               │   │
│  ├──────────────────────────────────────────┤   │
│  │ 🟠 SINGLE    XAU/USD +0.31%  13:05 BD   │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

- Realtime subscribe to `alert_log` table
- Grouped alerts show expandable pair list
- Config save করলে `spike_thresholds` table update হবে

### DB Tables

**`price_snapshots`**:
```sql
CREATE TABLE price_snapshots (
  pair text PRIMARY KEY,
  price numeric NOT NULL,
  previous_price numeric,
  updated_at timestamptz DEFAULT now()
);
```

**`spike_thresholds`**:
```sql
CREATE TABLE spike_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE,
  threshold_percent numeric NOT NULL,
  cooldown_minutes integer DEFAULT 5,
  updated_at timestamptz DEFAULT now()
);
```

### Cron
প্রতি **2 মিনিটে** run (TwelveData free tier friendly)। Weekend skip।

### Key Grouping Rules
- Same direction এর pairs একসাথে group হবে (সব BULLISH একটা message, সব BEARISH আরেকটা)
- Major pairs উপরে bold/prominent, crosses নিচে compact list
- `alert_log` এ grouped alert এর `metadata` তে `{ type: "multi", pairs: [...], direction: "BULLISH" }` save হবে

