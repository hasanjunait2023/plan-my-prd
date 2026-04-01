

# EMA Alignment Scanner — TwelveData API Integration

## কী বানাবো
Currency strength থেকে যে strong/weak pair পাওয়া যায়, সেগুলোর **EMA 9, 15, 200** তিনটা timeframe এ (3min, 15min, 1H) alignment check করবো TwelveData API দিয়ে। Aligned pairs গুলো একটা নতুন page এ premium UI তে দেখাবো। Trading hours এ প্রতি ঘন্টায় auto-sync হবে।

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Edge Function (scan-ema-alignment)        │
│                                                             │
│  1. DB থেকে latest currency_strength পড়ো                   │
│  2. Strong/weak pairs generate করো                           │
│  3. প্রতিটা pair এর জন্য TwelveData EMA API call:           │
│     - EMA 9, EMA 15, EMA 200                                │
│     - 3 timeframes: 3min, 15min, 1h                         │
│  4. Alignment check:                                         │
│     - BULLISH: price > EMA9 > EMA15 > EMA200                │
│     - BEARISH: price < EMA9 < EMA15 < EMA200                │
│  5. Results → ema_alignments table এ store                   │
│  6. Aligned pairs থাকলে → notification store                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              pg_cron (hourly during trading hours)           │
│  6:00-9:00, 13:00-15:00, 19:00-21:00 (user's timezone)     │
│  → calls scan-ema-alignment edge function                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               Frontend: /ema-scanner page                    │
│                                                             │
│  ┌─ Summary Cards ─────────────────────────────────────┐    │
│  │ Total Pairs Scanned │ Bullish Aligned │ Bearish Aligned│  │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─ Aligned Pairs Table ───────────────────────────────┐    │
│  │ Pair │ Direction │ 3m EMA │ 15m EMA │ 1H EMA │ Score│    │
│  │ EUR/NZD │ BUY 🟢 │ ✅✅✅ │ ✅✅✅ │ ✅✅✅ │ 9/9 │    │
│  │ GBP/CAD │ BUY 🟢 │ ✅✅❌ │ ✅✅✅ │ ✅✅✅ │ 8/9 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─ EMA Detail View (click a pair) ────────────────────┐    │
│  │ Price vs EMA 9/15/200 — visual comparison per TF    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─ Scan History ──────────────────────────────────────┐    │
│  │ Date picker → past scan results দেখা যাবে          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Steps

### 1. Database — 2 নতুন table

**`ema_alignments`** — scan results store:
- `id`, `pair` (EUR/USD), `direction` (BUY/SELL), `timeframe` (3min/15min/1h)
- `ema_9`, `ema_15`, `ema_200`, `current_price` (numeric values)
- `is_aligned` (boolean), `alignment_type` (BULLISH/BEARISH/NONE)
- `scanned_at`, `created_at`

**`ema_scan_notifications`** — alignment alerts:
- `id`, `pair`, `direction`, `alignment_score` (1-9)
- `message`, `is_read` (boolean), `created_at`

### 2. Edge Function — `scan-ema-alignment`

- TWELVEDATA_API_KEY secret add করবো (user এর key: `2c7f2479b4e645b8a7746d8f74bb08ca`)
- Currency strength DB থেকে strong/weak pairs নেবে
- প্রতিটা pair + timeframe এর জন্য TwelveData EMA API call:
  ```
  GET https://api.twelvedata.com/ema?symbol=EUR/USD&interval=3min&time_period=9&apikey=KEY
  ```
- 3 EMAs × 3 timeframes = 9 checks per pair
- Alignment logic: সব EMA aligned থাকলে score 9/9 — partial alignment ও track হবে
- Results `ema_alignments` এ insert, aligned pairs `ema_scan_notifications` এ insert

### 3. Scheduled Sync — pg_cron

- Trading hours: 6-9 AM, 1-3 PM, 7-9 PM (Bangladesh time, UTC+6)
- প্রতি ঘন্টায় edge function invoke করবে
- Cron expressions: `0 0-3,7-9,13-15 * * 1-5` (UTC equivalent)

### 4. New Page — `/ema-scanner`

- **Summary cards**: Total scanned, bullish aligned, bearish aligned count
- **Aligned pairs grid**: Premium glass cards — pair name, direction badge, per-timeframe EMA status (✅/❌), alignment score bar
- **Manual scan button**: Instantly trigger scan
- **Date picker**: Past scan results দেখার জন্য
- **Notification integration**: Layout এর notification panel এ real alerts add হবে DB থেকে

### 5. Layout Update

- Nav items এ "EMA Scanner" add করবো (icon: `Crosshair` বা `ScanLine`)
- Route add `/ema-scanner` in App.tsx

## Additional Ideas — ভবিষ্যতে আরো কী করা যায়

1. **Multi-Timeframe Confluence Score** — 3min + 15min + 1H alignment score combine করে "A+ Setup" grade দেওয়া
2. **Alert Sound/Push** — browser notification API ব্যবহার করে sound alert
3. **Backtesting** — historical alignment data দিয়ে past win rate calculate
4. **Heatmap View** — all 28 forex pairs এর alignment status একটা heatmap grid এ
5. **Telegram/Discord Alert** — aligned pair পেলে Telegram bot এ notification

## Files

| File | Action |
|------|--------|
| `supabase/migrations/` | 2 tables: ema_alignments, ema_scan_notifications |
| `supabase/functions/scan-ema-alignment/index.ts` | Edge function — TwelveData API → DB |
| `src/pages/EmaScanner.tsx` | New page — scanner UI |
| `src/types/ema.ts` | TypeScript types |
| `src/components/ema/AlignmentCard.tsx` | Aligned pair card component |
| `src/components/ema/ScanSummary.tsx` | Summary cards |
| `src/components/ema/EmaDetailView.tsx` | Per-pair EMA detail |
| `src/components/Layout.tsx` | Nav item add |
| `src/App.tsx` | Route add |
| Secret: TWELVEDATA_API_KEY | API key store |

## TwelveData API Notes
- Free tier: 8 API calls/minute, 800/day
- EMA endpoint: `GET /ema?symbol=EUR/USD&interval=3min&time_period=9&outputsize=1`
- Each pair needs 9 calls (3 EMAs × 3 TFs) — rate limiting এবং batching handle করতে হবে
- Edge function এ delay/throttle add করবো API limit exceed না করার জন্য

