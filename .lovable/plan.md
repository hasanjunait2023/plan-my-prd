

## Plan: Session Pair Selector — 6-Layer Analysis System + Testing Page

### Overview
একটি নতুন Edge Function + একটি নতুন page তৈরি করা হবে যেটা প্রতি session এ 6-layer analysis চালিয়ে Top 3-4 pair BUY/SELL bias সহ recommend করবে। Page থেকে manually trigger করে test করা যাবে।

### API Credit Budget Check
- Current capacity: 5 keys × 800 = **4,000 calls/day**
- All keys currently exhausted (calls_today = 800 each)
- New function per run: 28 pairs × 2 timeframes (1H + 4H) = **56 calls**
- 3 sessions/day = **168 calls/day** — manageable

---

### Part 1: Database — New Table `session_pair_recommendations`

```sql
pair TEXT, session TEXT, direction TEXT (BUY/SELL),
total_score INTEGER, differential INTEGER,
bias_4h TEXT, overextension_pct NUMERIC,
daily_structure TEXT, adr_remaining NUMERIC,
atr_status TEXT, reasoning TEXT,
is_qualified BOOLEAN, rank INTEGER,
scanned_at TIMESTAMPTZ
```

### Part 2: Edge Function — `session-pair-selector`

একটি single function যা:

1. **Input**: `{ session: "Asian" | "London" | "New York" }`
2. **1H + 4H data fetch**: 28 pairs × 2 TF = 56 API calls (reusing `fetchWithRotation`)
3. **6 Layers compute**:
   - Layer 1-2: Currency strength score + pair differential (from 1H EMA200)
   - Layer 3: 4H EMA200 bias alignment check
   - Layer 4: Overextension check (price vs 1H EMA200 distance %)
   - Layer 5: Daily structure (uses existing `adr_data` table's today_high/today_low)
   - Layer 6: ADR remaining (from `adr_data`) + ATR (calculated from 1H candles)
4. **Scoring**: Weighted matrix (max 105 pts), threshold 70 pts
5. **Store** results in `session_pair_recommendations`
6. **Optional Telegram** send with formatted message

### Part 3: New Page — `/pair-selector`

**File**: `src/pages/PairSelector.tsx`

UI components:
- **Session selector** (Asian / London / New York dropdown)
- **Run Analysis** button — triggers edge function
- **Results cards** — Top 3-4 qualified pairs with:
  - Pair name + BUY/SELL badge
  - Score breakdown (6 layers visual)
  - Currency strength differential bar
  - ADR remaining gauge
- **Skipped pairs** section — কেন skip হলো সেটা দেখাবে
- **History** — previous scan results দেখার option
- Auto-refresh / loading state with progress

### Part 4: Route + Navigation

- `App.tsx` এ `/pair-selector` route যোগ
- Navigation এ "Pair Selector" link যোগ

---

### Execution Time Estimate
- 56 API calls × ~10s gap between chunks of 2 = **~5 minutes per run**
- UI তে progress bar দেখাবে

### File Changes Summary
| File | Action |
|------|--------|
| Migration: `session_pair_recommendations` table | Create |
| `supabase/functions/session-pair-selector/index.ts` | Create |
| `src/pages/PairSelector.tsx` | Create |
| `src/App.tsx` | Add route |

