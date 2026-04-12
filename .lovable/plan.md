

## Plan: Volume Spike Detection — TwelveData দিয়েই (নতুন API দরকার নেই)

### কেন TwelveData রাখছি

তোমার system এ TwelveData already integrated, API key set আছে, এবং `time_series` endpoint volume data দেয়। নতুন API add করলে:
- নতুন secret manage করতে হবে
- দুই API এর rate limit আলাদাভাবে handle করতে হবে
- Maintenance বাড়বে

TwelveData `time_series` endpoint এ `interval=5min` দিলে OHLCV (volume সহ) data আসে — এটাই যথেষ্ট।

### Architecture

```text
Cron (every 2 min) → volume-spike-scanner Edge Function
  → TwelveData time_series (5min, 25 bars, batch 8 pairs)
  → Current bar volume vs 20-bar average compare
  → Spike? → INSERT alert_log (alert_type: 'volume_spike')
           → Telegram notify
           → Supabase Realtime → UI instant update
```

### Implementation

**1. Edge Function — `supabase/functions/volume-spike-scanner/index.ts`**
- TwelveData `time_series` API → `interval=5min`, `outputsize=25`
- 4 groups rotate (same groups as price-spike-detector) — minute % 4
- Detection: `currentVolume / avg20Volume` ratio
  - 2x–3x = 🟠 MEDIUM
  - 3x–5x = 🟡 HIGH  
  - 5x+ = 🔴 CRITICAL
- Direction: candle close > open = Bullish, else Bearish
- INSERT `alert_log` with `alert_type: 'volume_spike'`
- Telegram alert পাঠাবে (existing pattern)

**2. UI — `src/pages/SpikeAlerts.tsx` edit**
- নতুন section: "🔊 Volume Spike Scanner" — existing price spike alerts এর উপরে
- Table: Pair, Volume, Avg Vol, Spike Ratio, Direction, Time
- Supabase Realtime subscription on `alert_log` where `alert_type = 'volume_spike'`
- Green pulsing dot = "Monitoring Active"
- Manual "Scan Now" button

**3. Cron Setup** — SQL insert দিয়ে `pg_cron` schedule (every 2 min)

### Files

| File | Action |
|------|--------|
| `supabase/functions/volume-spike-scanner/index.ts` | Create |
| `src/pages/SpikeAlerts.tsx` | Edit — Volume Spike section add |

### Rate Limit Management
- Price spike detector ও volume scanner দুটো alternate করবে
- Even minutes → price spike, Odd minutes → volume spike
- প্রতিটা call এ max 8 pairs (TwelveData limit)

