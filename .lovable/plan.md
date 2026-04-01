

# Real-Time Currency Strength via OpenRouter — n8n Workflow Clone

## কি করবো

তোমার n8n workflow যেভাবে কাজ করে — TwelveData থেকে 28 pairs এর real-time price fetch → currency strength calculate → STRONG / MID STRONG / NEUTRAL / MID WEAK / WEAK category assign → `currency_strength` table এ store — ঠিক হুবহু একই কাজ একটা নতুন Edge Function করবে, কিন্তু calculation এর জন্য **OpenRouter free model** ব্যবহার করবে।

Result একই `currency_strength` table এ যাবে, একই CurrencyStrength page এ দেখাবে। London ও New York session আলাদা আলাদা দেখা যাবে।

## Flow

```text
Edge Function: market-correlation-analysis
    │
    ├─► TwelveData API (28 pairs, sequential, 8s gap)
    │    └── time_series → current price, open, high, low, close
    │
    ├─► Raw price data aggregate → per-currency performance calculate
    │    └── প্রতি currency কতগুলো pair এ strong/weak সেটা বের করা
    │
    ├─► OpenRouter Free Model (e.g. meta-llama/llama-4-maverick)
    │    └── Prompt: "এই price data দেখে প্রতি currency এর strength score (-10 to +10) দাও"
    │    └── Response: JSON → {currency, strength, category}
    │
    ├─► currency_strength table এ INSERT (session label সহ)
    │
    └─► Telegram Alert (summary message)
```

## Rate Limit Strategy

TwelveData free = 8 calls/min। 28 pairs = 28 calls। `sleep(8000)` per call = ~3.5 min total।

**Problem**: Deno edge function max ~150s। 28 × 8s = 224s > 150s।

**Solution**: Function কে **2 batch এ** ভাগ করবো:
- Request body তে `batch: 1` বা `batch: 2` পাঠাবে
- Batch 1: pairs 1-14 fetch → temp store
- Batch 2: pairs 15-28 fetch → merge with batch 1 → AI analysis → final store
- Frontend "Run Analysis" button 2টা sequential call করবে automatically

## Categories (n8n এর মতো)

| Score Range | Category |
|---|---|
| +7 to +10 | STRONG |
| +4 to +6 | MID STRONG |
| -3 to +3 | NEUTRAL |
| -6 to -4 | MID WEAK |
| -10 to -7 | WEAK |

**Note**: MID STRONG category নতুন যোগ হবে — `StrengthMeter`, `CATEGORY_COLORS`, legend সব update হবে।

## Implementation

### Step 1: Update types ও UI — MID STRONG category যোগ

- `src/types/correlation.ts` → `CATEGORY_COLORS` এ `'MID STRONG': 'hsl(100, 60%, 45%)'` যোগ
- `src/components/correlation/StrengthMeter.tsx` → MID STRONG support
- `src/pages/CurrencyStrength.tsx` → Legend এ MID STRONG যোগ, Session tabs (London / New York / Latest) যোগ

### Step 2: Edge Function — `market-correlation-analysis`

**Batch 1 call** (`{batch: 1}`):
- Pairs 1-14 fetch from TwelveData, 8s gap each
- প্রতি pair: `time_series?symbol=X&interval=1h&outputsize=2` → current ও previous close
- Result একটা temp table বা in-memory রাখবে (DB temp table `market_scan_temp`)

**Batch 2 call** (`{batch: 2, session: "New York"}`):
- Pairs 15-28 fetch
- Batch 1 + Batch 2 data merge
- প্রতি currency র cross-pair performance calculate:
  - EUR কতগুলো pair এ up, কতগুলোতে down
  - Relative change % per currency
- এই structured data OpenRouter free model কে পাঠাবে:
  ```
  "Analyze this forex data. For each of 8 currencies (EUR,USD,GBP,JPY,AUD,NZD,CAD,CHF), 
   give a strength score -10 to +10 and category (STRONG/MID STRONG/NEUTRAL/MID WEAK/WEAK).
   Return JSON array: [{currency, strength, category}]"
  ```
- AI response parse → `currency_strength` table এ INSERT (timeframe: session name)
- Telegram alert send

### Step 3: Telegram Alert

```
🧠 Market Strength — New York Session
━━━━━━━━━━━━━━━━━━━
💪 STRONG: EUR (+8), GBP (+7)
📈 MID STRONG: AUD (+5)
⚖️ NEUTRAL: USD (+1), CHF (-2)
📉 MID WEAK: CAD (-5)
💀 WEAK: JPY (-8), NZD (-9)
━━━━━━━━━━━━━━━━━━━
🏆 Best: EUR/JPY BUY | GBP/NZD BUY
```

### Step 4: CurrencyStrength page — Session Tabs

- Page এর top এ **3 tabs**: "London" / "New York" / "Latest"
- London = timeframe filter `London`, NY = `New York`, Latest = most recent regardless
- "Run Live Analysis" button — batch 1 → batch 2 sequential call
- Loading state দেখাবে "Scanning pair 7/28..."
- বাকি সব (StrengthMeter, SummaryCards, PairSuggestions, Trend) একই থাকবে

### Step 5: Temp storage for batch processing

Migration: `market_scan_temp` table — batch 1 এর raw data রাখবে যাতে batch 2 merge করতে পারে।

| Column | Type |
|---|---|
| id | uuid PK |
| scan_id | text (unique per scan session) |
| pair | text |
| current_price | numeric |
| previous_close | numeric |
| change_percent | numeric |
| fetched_at | timestamptz |

## Files

| Action | File |
|---|---|
| **Migration** | `market_scan_temp` table create |
| **Create** | `supabase/functions/market-correlation-analysis/index.ts` |
| **Modify** | `src/types/correlation.ts` — MID STRONG category যোগ |
| **Modify** | `src/components/correlation/StrengthMeter.tsx` — MID STRONG color |
| **Modify** | `src/pages/CurrencyStrength.tsx` — Session tabs, Run Analysis button |
| **Modify** | `supabase/functions/telegram-trade-alerts/index.ts` — strength alert format |

## Prerequisites
- `TWELVEDATA_API_KEY` ✓
- `OPENROUTER_API_KEY` ✓
- `TELEGRAM_BOT_TOKEN` ✓

## OpenRouter Free Models
OpenRouter এ free models available: `meta-llama/llama-4-maverick:free`, `google/gemma-3-27b-it:free`, `mistralai/mistral-small-3.1-24b-instruct:free` — এর যেকোনো একটা ব্যবহার হবে structured JSON output এর জন্য।

