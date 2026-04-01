

# Screenshot-Based Trade Data Extraction Plan

## তোমার যা চাই
তুমি trading chart এর screenshot paste/upload করবে, এবং AI সেটা analyze করে automatically trade এর data extract করবে — pair, entry price, SL, TP, lot size, timeframe, session, risk amount, RRR ইত্যাদি। আর প্রতিটা trade এ 2টা situation screenshot থাকবে: **Entry situation** আর **Exit situation**।

## How It Works

### AI-Powered Screenshot Analysis
- তুমি screenshot paste/drag-drop করবে New Trade form এ
- একটা **"AI দিয়ে Analyze করো"** button থাকবে
- Click করলে screenshot Supabase Edge Function এ যাবে → সেখান থেকে AI model (Gemini) কে পাঠাবে
- AI chart image থেকে extract করবে:
  - **Pair** (e.g. USD/JPY — chart title থেকে)
  - **Timeframe** (e.g. 15M — chart title থেকে)
  - **Entry Price, Exit Price** (visible trade markers থেকে)
  - **Stop Loss, Take Profit** (visible lines/levels থেকে)
  - **Lot Size** (if visible in trade overlay, e.g. "0.06")
  - **Risk Amount** (e.g. "-11.77 USD" from P&L overlay)
  - **Session** (time axis থেকে estimate — London/NY/Asian)
  - **Direction** (LONG/SHORT — trade marker position থেকে)
- Extracted data auto-fill হবে form এর fields এ
- তুমি verify/edit করতে পারবে before saving

### 2-Situation Screenshots (Entry & Exit)
বর্তমানে একটাই `screenshots: string[]` আছে। এটা restructure হবে:

```text
Trade
├── entryScreenshots: string[]    ← Entry এর সময়ের situation
├── exitScreenshots: string[]     ← Exit এর পরের situation
└── screenshots: string[]         ← অন্যান্য (optional)
```

Journal document view তেও 2টা আলাদা section থাকবে:
- **📸 Entry Situation** — entry এর সময়ের chart screenshots
- **📸 Exit Situation** — exit এর পরের chart screenshots

### Paste Support
- Clipboard paste (`Ctrl+V`) support — screenshot copy করে directly paste করা যাবে upload area তে
- Drag & drop ও support করবে

## Technical Implementation

| Change | Details |
|--------|---------|
| **Supabase Edge Function** `analyze-trade-screenshot` | Screenshot receive করে → AI model কে পাঠায় → structured JSON return করে (pair, prices, lot, timeframe, session, direction) |
| **`src/types/trade.ts`** | `entryScreenshots` ও `exitScreenshots` fields add |
| **`src/components/journal/ImageUpload.tsx`** | Clipboard paste support (`onPaste` event) + drag-drop |
| **`src/components/journal/ScreenshotAnalyzer.tsx`** (new) | Upload → AI analyze → preview extracted data → confirm → auto-fill form |
| **`src/pages/NewTrade.tsx`** | Entry/Exit screenshot sections আলাদা + AI analyze button + auto-fill logic |
| **`src/components/journal/TradeDocument.tsx`** | Entry ও Exit situation screenshots আলাদা sections |
| **`src/data/mockData.ts`** | Update with new screenshot fields |

### AI Extraction Schema
Edge function AI কে এই structure এ data চাইবে:
```json
{
  "pair": "USD/JPY",
  "timeframe": "15M",
  "direction": "SHORT",
  "entryPrice": 159.317,
  "exitPrice": 158.515,
  "stopLoss": 159.709,
  "takeProfit": 158.211,
  "lotSize": 0.06,
  "riskAmount": 11.77,
  "profitAmount": 30.09,
  "session": "London"
}
```

### Limitations / Notes
- AI extraction 100% accurate নাও হতে পারে — সবসময় user verify করবে
- যেসব data chart এ visible না (like strategy, SMC tags), সেগুলো manually দিতে হবে
- Edge function deploy করতে হবে Supabase তে

