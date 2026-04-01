

# Trade Journal Export Feature — Updated Plan

## কি করতে হবে
Journal page থেকে trades export — PDF বা DOCX format এ, date filter + **trade outcome filter** সহ।

## UI Design

### Export Button
Journal header এ "New Trade" button এর পাশে **Export** button (Download icon)। Click করলে Export Dialog open হবে।

### Export Dialog (`ExportDialog.tsx`)

1. **Format Selection**: PDF / DOCX (radio buttons)

2. **Date Range Selection** (3 options):
   - **Monthly** — Month + Year picker
   - **Yearly** — Year picker
   - **Custom Range** — Start date + End date

3. **Trade Outcome Filter** (multi-select checkboxes, সব default selected):
   - ✅ Winning Trades
   - ✅ Losing Trades
   - ✅ Breakeven Trades

4. **Preview**: "12 trades found" — filter অনুযায়ী count দেখাবে

5. **Export Button** — file generate + download

## Filtering Logic

```text
Date filter:
  Monthly → trades.filter(t => t.date starts with "YYYY-MM")
  Yearly  → trades.filter(t => t.date starts with "YYYY")
  Custom  → trades.filter(t => t.date >= start && t.date <= end)

Outcome filter:
  trades.filter(t => selectedOutcomes.includes(t.outcome))
  // t.outcome is 'WIN' | 'LOSS' | 'BREAKEVEN'

Combined: date filter first, then outcome filter
```

## Export File Content

1. **Header** — "TradeVault Pro — Trade Journal Report", date range, applied filters (e.g., "Winning & Breakeven trades only")
2. **Summary Stats** — Total P&L, Win Rate, Total Pips, Avg RRR (filtered trades এর)
3. **Summary Table** — Date, Pair, Direction, Session, P&L, Pips, Outcome
4. **Individual Trade Details** — Entry/Exit, SMC Tags, Notes, Psychology (date-wise grouped)

## Technical Changes

### New Files
- **`src/components/journal/ExportDialog.tsx`** — Dialog with format, date range, outcome filter
- **`src/lib/exportTrades.ts`** — PDF generation (`jspdf` + `jspdf-autotable`), DOCX generation (`docx` package)

### Modified Files
- **`src/pages/TradeJournal.tsx`** — Export button + dialog state

### Libraries to Install
- `jspdf` + `jspdf-autotable` — client-side PDF
- `docx` + `file-saver` — client-side DOCX

### Flow
1. User selects format + date range + outcome filter
2. `mockTrades` filtered by date then outcome
3. Client-side file generation (no backend)
4. Auto-download via `Blob` + `URL.createObjectURL`

