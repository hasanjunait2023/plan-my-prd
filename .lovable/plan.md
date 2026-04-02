

# Two-Phase Trade Journal — Entry → Pending → Finalize

## সমস্যা

এখন NewTrade page এ একসাথে Entry ও Exit দুইটাই দিতে হয়। কিন্তু real trading এ প্রথমে trade entry হয়, তারপর কিছুক্ষণ/ঘণ্টা পরে trade close হয়। তাই দুই ধাপে ভাগ করতে হবে।

## কিভাবে কাজ করবে

```text
Phase 1: Trade Entry (NewTrade page)
  → Pair, Direction, Entry Price, SL, TP, Lot, Session, TF, Strategy
  → Entry Screenshots, Reason for Entry, Pre-Situation, Confidence
  → Psychology (entry time emotion)
  → Save → status = "PENDING" (exit_price = 0, pnl = 0)

Phase 2: Trade Finalize (Journal page / Pending list)
  → PENDING trade select করলে "Complete Trade" form আসবে
  → Exit Price, Exit Screenshots, During Situation, Post Situation
  → What Went Well, Improvement Notes, Mistakes, Partial Closes
  → Submit → status = "CLOSED", pnl/pips/outcome calculated
```

## Implementation

### Step 1: DB — `status` column যোগ

`trades` table এ নতুন column:
- `status text NOT NULL DEFAULT 'CLOSED'` — values: `PENDING` / `CLOSED`
- Existing trades সব `CLOSED` থাকবে (default)

### Step 2: NewTrade page split — শুধু Entry fields

- Exit Price field **remove** (Phase 1 এ দরকার নেই)
- Exit Screenshots, Post-Situation, During-Situation, What Went Well, Improvement Notes, Mistakes — এগুলো **remove**
- Submit করলে `status: 'PENDING'`, `exit_price: 0`, `pnl: 0`, `outcome: 'BREAKEVEN'` দিয়ে save হবে
- Button text: "Trade Entry করো" (আগে ছিল "Trade Log করো")
- Save এর পরে Journal page এ redirect

### Step 3: Journal page — Pending indicator ও Complete flow

- **TradePageList** এ PENDING trades এ 🟡 badge দেখাবে (CLOSED trades এ WIN/LOSS/BE badge)
- **Pending trade select** করলে TradeDocument এর বদলে **TradeCompleteForm** component দেখাবে:
  - Exit Price (required)
  - Exit Screenshots
  - During Situation, Post Situation
  - What Went Well, Improvement Notes
  - Mistakes selection
  - Partial Closes
  - "Finalize Trade" button
- Finalize করলে: exit price থেকে pnl/pips/outcome calculate → `status: 'CLOSED'` এ update
- **CLOSED trade** select করলে আগের মতোই TradeDocument দেখাবে

### Step 4: Pending count notification

- Journal header এ pending count badge: "3 Pending" 
- NotebookSidebar এ date এর পাশে pending count দেখাবে
- Dashboard (Index.tsx) এ "X trades pending" alert card

### Step 5: useTrades hook — update mutation যোগ

- `useUpdateTrade` mutation তৈরি — partial update support (exit price, status, post-trade fields)

## Files

| Action | File |
|--------|------|
| **Migration** | `trades` table এ `status` column যোগ |
| **Modify** | `src/types/trade.ts` — `status: 'PENDING' \| 'CLOSED'` field যোগ |
| **Modify** | `src/pages/NewTrade.tsx` — শুধু entry fields রাখা, exit fields remove |
| **Create** | `src/components/journal/TradeCompleteForm.tsx` — Phase 2 form (exit details) |
| **Modify** | `src/pages/TradeJournal.tsx` — pending trade এ TradeCompleteForm দেখানো |
| **Modify** | `src/components/journal/TradePageList.tsx` — PENDING badge |
| **Modify** | `src/hooks/useTrades.ts` — `useUpdateTrade` mutation যোগ, mapRow এ status |
| **Modify** | `src/pages/Index.tsx` — pending trades alert |

