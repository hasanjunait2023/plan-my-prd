

## Plan: Post Analysis ও Revision Pending Label দেখানো

### সমস্যা
CLOSED trade গুলোতে Post Analysis বা Revision করা হয়নি — সেটা ১ সপ্তাহ পরেও বোঝা যায় না। সহজে identify করার উপায় নেই।

### সমাধান
তিনটা জায়গায় pending labels দেখাবে:

#### 1. `TradePageList.tsx` — সাইড লিস্টে label
প্রতিটা CLOSED trade item এ outcome badge এর পাশে:
- **"📋 Analysis"** — যদি `ruleChecklist` empty থাকে বা `ruleScore === 0`
- **"📝 Revision"** — যদি `revisedAt === null` এবং trade ১ সপ্তাহের বেশি পুরানো

ছোট pill-style badge, `text-[9px]`, amber/orange color (`bg-amber-500/10 text-amber-400`)

#### 2. `TradeCard.tsx` — মূল journal list এ label
একই logic — outcome badge এর পাশে ছোট pending indicators দেখাবে

#### 3. `DateGroup` header বা Journal page top — summary count
Optional: "3 trades need Post Analysis, 5 need Revision" — এটা journal page এর top এ একটা ছোট banner/alert হিসেবে দেখাবে যেন সরাসরি চোখে পড়ে

### Logic
```typescript
const needsAnalysis = trade.status === 'CLOSED' && 
  (!trade.ruleChecklist?.length || trade.ruleScore === 0);

const needsRevision = trade.status === 'CLOSED' && 
  !trade.revisedAt && 
  differenceInDays(new Date(), parseISO(trade.date)) >= 7;
```

### Technical Changes

| File | Change |
|------|--------|
| `src/components/journal/TradePageList.tsx` | CLOSED trades এ pending analysis/revision badges যোগ |
| `src/components/journal/TradeCard.tsx` | Same badges যোগ |
| `src/pages/TradeJournal.tsx` | Page top এ pending count summary banner যোগ |

কোনো DB change লাগবে না — existing fields (`ruleScore`, `ruleChecklist`, `revisedAt`) থেকেই detect করা যাবে।

