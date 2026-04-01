

# Currency Strength Page — n8n Workflow Result Visualization

## তোমার Workflow Output Format
```
💱 FX Co-Relation Strength On 1H
⏰ April 1st 2026, 12:00:00 pm
🟢 STRONG: EUR → 6, JPY → 6
🟡 NEUTRAL: USD → 3, AUD → 1, CHF → -1, GBP → -2
🟠 MID WEAK: CAD → -4
🔴 WEAK: NZD → -7
```

Strength score range: -10 to +10, 4টা category — STRONG, NEUTRAL, MID WEAK, WEAK।

## Architecture

```text
n8n Workflow (scheduled)
       │
       ▼
Supabase Table (currency_strength)  ◄── Edge Function (webhook endpoint)
       │
       ▼
React Page (reads from table, visualizes)
```

**Flow:**
1. n8n workflow execute হলে result কে Supabase table এ store করবে (edge function webhook দিয়ে)
2. Frontend table থেকে latest data read করবে
3. Manual "Refresh" button দিয়ে on-demand n8n workflow trigger করা যাবে

## Supabase Table — `currency_strength`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| currency | text | EUR, USD, GBP, etc. |
| strength | integer | -10 to +10 |
| category | text | STRONG / NEUTRAL / MID WEAK / WEAK |
| timeframe | text | 1H / 15M / 3M |
| recorded_at | timestamptz | কখন record হয়েছে |
| created_at | timestamptz | default now() |

## Page Layout

### Currency Strength Meter
- 8টা currency horizontal bar chart — left to right
- Bar color: 🟢 STRONG (green), 🟡 NEUTRAL (yellow/gray), 🟠 MID WEAK (orange), 🔴 WEAK (red)
- Score number দেখাবে bar এর পাশে
- Country flag emoji প্রতিটা currency র পাশে
- Timeframe tabs: **1H** / **15M** / **3M**
- Last updated timestamp top এ দেখাবে

### Visual Style
- Dark background (existing black theme)
- Bars: gradient fill based on category
- Sorted by strength (strongest → weakest)
- Clean, minimal — trading terminal feel

## Files to Create/Change

| File | Change |
|------|--------|
| **Migration** | `currency_strength` table create |
| `supabase/functions/store-currency-strength/index.ts` (new) | Webhook endpoint — n8n calls this to store results |
| `src/types/correlation.ts` (new) | TypeScript interfaces |
| `src/pages/CurrencyStrength.tsx` (new) | Main page — strength meter visualization |
| `src/components/correlation/StrengthMeter.tsx` (new) | Bar chart component |
| `src/App.tsx` | Add `/currency-strength` route |
| `src/components/AppSidebar.tsx` | Add nav item |

## Edge Function — `store-currency-strength`
- n8n workflow থেকে POST request নেবে
- Body: `{ timeframe: "1H", currencies: [{ currency: "EUR", strength: 6, category: "STRONG" }, ...] }`
- Supabase table এ insert করবে
- পুরনো same timeframe data replace করবে

## n8n Integration Note
তোমার n8n workflow এ একটা HTTP Request node add করতে হবে যেটা edge function এর webhook URL এ POST করবে parsed result। এটা তুমি n8n এ করবে — আমি edge function এর URL দিয়ে দেবো।

