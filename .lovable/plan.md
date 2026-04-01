

# Trade Journal Redesign — Document-Style Journal

## Current State
বর্তমানে Trade Journal একটি basic table view — শুধু row-based list আর একটি dialog popup দিয়ে trade details দেখা যায়। তোমার যেটা দরকার সেটা হলো একটা **document/diary-style journal** যেখানে screenshots, Bengali notes, structured analysis সব একসাথে readable format এ থাকবে।

## What We'll Build

### 1. Trade Journal Layout (3 views)
- **Date-wise timeline** (default): তারিখ অনুযায়ী grouped — প্রতিটা date এর নিচে সেই দিনের সব trades collapsed card হিসেবে
- **Individual trade view**: একটা trade click করলে full document-style page opens (like your uploaded example)
- **All trades view**: সব trades একসাথে scrollable document format

### 2. Individual Trade Journal Page (Document Format)
Each trade journal will have these structured sections, like a doc:

```text
┌──────────────────────────────────────────────┐
│  📅 March 31, 2026 — Trade #1               │
│  EUR/USD  |  LONG  |  London Session  |  15M │
│  Outcome: WIN  |  P&L: +$225  |  RRR: 1.8   │
├──────────────────────────────────────────────┤
│                                              │
│  📊 Trade Data                               │
│  Entry: 1.0825  Exit: 1.0870  SL: 1.0800    │
│  TP: 1.0875  Lots: 0.5  Risk: 1.5% ($187)   │
│  Pips: +45  SMC: [OB] [FVG] [BOS]           │
│                                              │
│  🖼️ Screenshots                              │
│  [Chart Image 1]  [Chart Image 2]            │
│                                              │
│  📝 Trade নেওয়ার কারণ (Pre-Trade Analysis)   │
│  Free-text Bengali/English area              │
│                                              │
│  🎯 Confidence Level: 8/10                   │
│                                              │
│  📍 Entry এর আগে Situation                   │
│  Free-text area                              │
│                                              │
│  ⏳ Trade চলাকালীন Situation                  │
│  Free-text area                              │
│                                              │
│  📍 Trade এর পরে Situation                   │
│  Free-text area                              │
│                                              │
│  ✅ কি কি ভালো হয়েছে                         │
│  Free-text area                              │
│                                              │
│  ❌ কি কি ভুল হয়েছে (Mistakes)               │
│  Tags + free-text explanation                │
│                                              │
│  🔧 Improvement Notes                        │
│  Free-text area                              │
│                                              │
│  🧠 Psychology                               │
│  Mental State: 8/10  Emotion: Confident      │
│  Plan Followed: ✓                            │
│                                              │
│  ⭐ Starred / Bookmarked                     │
└──────────────────────────────────────────────┘
```

### 3. Extended Trade Type
Add new fields to `Trade` interface:
- `preSituation` — Entry এর আগে কি situation ছিল
- `duringSituation` — Trade চলাকালীন কি হলো
- `postSituation` — Trade close এর পরে কি হলো
- `whatWentWell` — কি ভালো হয়েছে
- `improvementNotes` — কোথায় আরো ভালো করা যেত
- `confidenceLevel` — 1-10 (separate from psychologyState)
- `reasonForEntry` — কেন trade নিলাম (separate detailed field)

### 4. Screenshot Support
- Image upload via file input (stored locally as base64 or object URLs for now)
- Multiple screenshots per trade
- Full-width display in journal view (like your doc example)
- Click to expand/zoom

### 5. Bengali Text Support
- All text areas accept Bengali input (no special config needed — standard HTML textarea supports it)
- Labels will be bilingual: Bengali label + English technical term
- Large comfortable textareas for voice typing input

### 6. Date Timeline View
- Left sidebar or top tabs: date list
- Click a date → see all trades from that day in document format
- Daily summary header showing total P&L, win/loss count

## Technical Changes

| File | Change |
|------|--------|
| `src/types/trade.ts` | Add 5 new fields to `Trade` interface |
| `src/data/mockData.ts` | Update mock trades with new fields + Bengali sample text |
| `src/pages/TradeJournal.tsx` | Complete rewrite — date timeline + document view |
| `src/components/journal/TradeCard.tsx` | Collapsed card for timeline view |
| `src/components/journal/TradeDocument.tsx` | Full document-style trade view |
| `src/components/journal/DateGroup.tsx` | Date group wrapper with daily summary |
| `src/components/journal/ImageUpload.tsx` | Screenshot upload + gallery component |
| `src/pages/NewTrade.tsx` | Add new structured note fields + image upload |

