

## Plan: AI Currency Strength Scanner — Google Sheet থেকে Logic বুঝে Native Implementation

### Google Sheet Structure (তোমার uploaded file থেকে)

তোমার sheet এ **5টা sheet** আছে:

1. **Co-related Number (Page 1)** — Final summary: Currency, 1H Score, Classification, 15M Score, 3M Score
2. **Trading Signal (Page 2)** — AI generated trade signals with Entry/TP/SL
3. **Co-relation Currency (Page 3)** — 1H timeframe: Per-pair GPT score → "Modified Number" → per-currency "Final Co-relation" sum
4. **Page 4 & 5** — Same structure for 15M and 3M timeframes

### Aggregation Logic (Critical Finding)

```text
Example: USD on 1H (Page 3)
┌──────────────┬────────┬─────────────────┐
│ Pair         │ Number │ Modified Number │
├──────────────┼────────┼─────────────────┤
│ FX:EURUSD    │  +1    │  -1  (inverted) │  ← USD is quote, so flip sign
│ FX:GBPUSD    │  +1    │  -1  (inverted) │
│ FX:USDJPY    │  -1    │  -1  (keep)     │  ← USD is base, keep sign
│ FX:AUDUSD    │  +1    │  -1  (inverted) │
│ FX:NZDUSD    │  +1    │  -1  (inverted) │
│ FX:USDCAD    │  -1    │  -1  (keep)     │
│ FX:USDCHF    │  -1    │  -1  (keep)     │
│              │        │ Sum = -7        │  ← Final 1H Score for USD
└──────────────┴────────┴─────────────────┘

Rule: 
- If currency is BASE (left side) → Modified Number = Number (keep)
- If currency is QUOTE (right side) → Modified Number = -Number (flip)
- Final Score = Sum of all Modified Numbers
```

Classification:
- **STRONG**: Score ≥ 5
- **MID STRONG**: Score = 4  
- **NEUTRAL**: Score -3 to 3
- **MID WEAK**: Score = -4
- **WEAK**: Score ≤ -5

### 7 Pairs Per Currency (Fixed List)

```text
USD: EURUSD, GBPUSD, USDJPY, AUDUSD, NZDUSD, USDCAD, USDCHF
EUR: EURUSD, EURGBP, EURJPY, EURAUD, EURNZD, EURCAD, EURCHF
GBP: GBPUSD, EURGBP, GBPJPY, GBPAUD, GBPNZD, GBPCAD, GBPCHF
JPY: USDJPY, EURJPY, GBPJPY, AUDJPY, NZDJPY, CADJPY, CHFJPY
AUD: AUDUSD, EURAUD, GBPAUD, AUDJPY, AUDNZD, AUDCAD, AUDCHF
NZD: NZDUSD, EURNZD, GBPNZD, NZDJPY, AUDNZD, NZDCAD, NZDCHF
CAD: USDCAD, EURCAD, GBPCAD, CADJPY, AUDCAD, NZDCAD, CADCHF
CHF: USDCHF, EURCHF, GBPCHF, CHFJPY, AUDCHF, NZDCHF, CADCHF
```
Total unique pairs = **28** (same as `TRADEABLE_PAIRS`)

### Implementation Plan

**Step 1: Add `CHARTIMG_API_KEY` secret**
- Value from your workflow: `pFgZxyqajb9h4SYtIdz3m27OiqrSTggt2LAC6ZJ3`

**Step 2: Create `ai_scan_results` table (migration)**
- `id, scan_batch_id, timeframe, pair, base_currency, result (+1/-1/0), strength_label, scanned_at, created_at`
- RLS: service_role insert/delete, authenticated select

**Step 3: Create Edge Function `ai-currency-scanner/index.ts`**
- Input: `{ timeframe: "1H" | "15M" | "3M" }`
- Loop through 28 unique pairs
- For each pair:
  1. Fetch chart from chart-img.com: `GET /v1/tradingview/advanced-chart?symbol=FX:{pair}&interval={tf}&studies=EMA:200&width=700&height=400`
  2. Convert to base64 → send to OpenRouter GPT-4o vision with your exact prompt
  3. Parse `RESULT: +1/-1/0`
  4. Store in `ai_scan_results`
- After all pairs done:
  1. For each of 8 currencies, find its 7 related pairs
  2. Apply Modified Number logic (flip sign if quote currency)
  3. Sum → Final Score → Classify
  4. Insert into `currency_strength` table
  5. Send Telegram report (same format as your n8n workflow)
- **Timeout handling**: Use chunked processing — process 4 pairs at a time with 2s delay between chunks

**Step 4: Create `/ai-scanner` page**
- Manual "Run Scan" button (select timeframe: 1H/15M/3M)
- Real-time progress: pair being scanned, count done/total
- Scan history with per-pair breakdown
- Visual: pair name, result badge (+1/-1/0), strength label

**Step 5: Add route + nav**
- Add to `App.tsx` routing
- Add to nav config

### Requirements Checklist

| Item | Status |
|------|--------|
| `CHARTIMG_API_KEY` | ❌ Need to add as secret |
| `OPENROUTER_API_KEY` | ✅ Exists |
| `TELEGRAM_BOT_TOKEN` | ✅ Exists |
| `currency_strength` table | ✅ Exists |
| `ai_scan_results` table | ❌ Need to create |
| pg_cron for auto-schedule | Can add after manual testing works |

### Files to Create/Edit

| File | Action |
|------|--------|
| Migration | Create `ai_scan_results` table |
| `supabase/functions/ai-currency-scanner/index.ts` | New — main scanner logic |
| `src/pages/AiScanner.tsx` | New — scanner control UI |
| `src/App.tsx` | Add route |
| `src/hooks/useNavConfig.ts` | Add nav item |

