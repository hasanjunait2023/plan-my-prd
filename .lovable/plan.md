

# Trading Intelligence Dashboard — Advanced Metrics Plan

## বর্তমানে যা আছে
1. **Currency Strength** — 8 currency এর strength/weakness ranking
2. **EMA Scanner** — EMA 9/15/200 alignment across 5min, 15min, 1H
3. **Pair Suggestions** — Strong vs Weak pair generation
4. **Analytics** — Win rate, P&L, profit factor (mock data)

## নতুন Metrics — যা Trading Focus ও Output বাড়াবে

### 1. Confluence Score Dashboard (নতুন page)
Currency Strength + EMA Alignment + Session Timing combine করে প্রতিটা pair কে **A+, A, B, C, D** grade দেবে।

- **A+ Setup**: Strength diff > 5 AND EMA 9/9 aligned AND active session (London/NY overlap)
- **A Setup**: Strength diff > 3 AND EMA 7+/9
- **B/C/D**: ক্রমশ কম confluence

এটা তোমাকে বলবে — "এই মুহূর্তে কোন pair এ সবচেয়ে বেশি edge আছে"

### 2. Session Overlap Tracker
Forex market sessions (Tokyo, London, New York) এর overlap সময়ে volume ও volatility সবচেয়ে বেশি। এই widget দেখাবে:
- এখন কোন session active
- পরের high-volatility overlap কখন
- Session অনুযায়ী কোন pair এ সবচেয়ে বেশি move হয় (historical data থেকে)

### 3. ADR (Average Daily Range) Monitor
প্রতিটা pair আজকে তার Average Daily Range এর কতটুকু move করেছে — percentage হিসেবে।
- ADR 80%+ মানে pair exhausted — **entry avoid**
- ADR 20-50% মানে room আছে — **good entry zone**
- TwelveData `time_series` API থেকে daily high/low নিয়ে calculate করা যাবে

### 4. Risk-Reward Calculator Widget
Trade entry এর আগে quick R:R calculation:
- Entry, SL, TP input দিলে auto-calculate: lot size, risk amount, potential profit
- Account balance ও risk % (1-2%) integrate
- EMA Scanner এর aligned pair click করলে auto-populate entry price

### 5. Strength Divergence Alert
Currency strength যখন direction change করে (strong থেকে weak হচ্ছে বা vice versa) — সেটা early reversal signal। এই metric:
- Last 3-4 scan এর strength trend track করবে
- Divergence detect করলে notification দেবে
- "USD weakening — USD pairs এ SELL bias shift হচ্ছে" type alert

### 6. Kill Zone Heatmap
ICT/SMC concept অনুযায়ী নির্দিষ্ট সময়ে (Kill Zones) price সবচেয়ে বেশি move করে:
- London Kill Zone: 7-9 AM GMT
- NY Kill Zone: 12-2 PM GMT
- Asian Kill Zone: 12-2 AM GMT
Calendar heatmap দেখাবে কোন kill zone এ তোমার win rate সবচেয়ে ভালো

### 7. Pair Correlation Matrix
28 major pairs এর মধ্যে correlation coefficient (-1 to +1) matrix:
- Highly correlated pairs এ একসাথে trade নেওয়া = double risk
- Negative correlation = hedge opportunity
- Color-coded grid: green (positive), red (negative)

---

## Implementation Priority (সুপারিশ)

| Priority | Feature | Impact | Effort |
|----------|---------|--------|--------|
| 1 | **Confluence Score** | Highest — best setup filter | Medium |
| 2 | **ADR Monitor** | High — overextended pair avoid | Medium (API) |
| 3 | **Risk-Reward Calculator** | High — pre-trade discipline | Low (frontend only) |
| 4 | **Session Overlap Tracker** | Medium — timing awareness | Low (frontend only) |
| 5 | **Strength Divergence** | Medium — early reversal catch | Medium (DB history) |
| 6 | **Kill Zone Heatmap** | Medium — pattern recognition | Medium (trade data) |
| 7 | **Pair Correlation Matrix** | Lower — risk management | High (API + compute) |

## Technical Approach

### নতুন Page: `/trade-intelligence`
সব advanced metrics একটা unified "Trade Intelligence" page এ — tabs বা sections দিয়ে organize।

### Database
- `confluence_scores` table — pair, grade, components breakdown, timestamp
- `adr_data` table — pair, daily range, % used, date
- Existing `ema_alignments` + `currency_strength` combine query

### Edge Functions
- `calculate-confluence` — strength + EMA data merge করে grade assign
- `fetch-adr` — TwelveData `time_series` API থেকে daily high/low

### Frontend Components
- `ConfluenceCard.tsx` — A+ to D grade badge with breakdown
- `SessionTracker.tsx` — live session indicator with countdown
- `AdrGauge.tsx` — circular progress showing ADR % used
- `RiskCalculator.tsx` — input form with auto-calculation
- `DivergenceAlert.tsx` — strength trend mini-chart
- `CorrelationMatrix.tsx` — color-coded grid

### API Usage
TwelveData free tier (800 calls/day) এর মধ্যে থাকতে:
- ADR: দিনে 1 বার fetch (28 pairs × 1 call = 28)
- Confluence: existing EMA + strength data reuse — extra API call নেই
- Session tracker: pure frontend, no API needed

