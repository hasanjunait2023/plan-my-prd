

## Plan: Correlation Pairs Page — Running Correlation Numbers + Single Screen UI

### তুমি যা চাও
- Correlation Pairs page এ **running session এর currency strength numbers** দেখাবে (যেটা Currency Strength page এ আছে)
- পুরো page টা **একটা screen এ fit** করবে — scroll minimize
- UI finalize করো premium look এ

### Current সমস্যা
- Page এ শুধু charts আছে, কোনো correlation number / strength data নেই
- 6টা TradingView chart scroll করতে হয় — one screen এ দেখা যায় না
- Session panel অনেক জায়গা নিচ্ছে

### Changes

**1. Compact Session Bar** — `SessionPanel` কে replace করবো একটা slim single-row bar দিয়ে
- শুধু active session highlight + BD time — horizontal one-liner
- পুরো panel না, শুধু `🟢 London LIVE • 5h 37m left • 🇧🇩 19:23` এরকম

**2. Running Strength Numbers Strip** — নতুন component
- Currency selector এর নিচে, charts এর উপরে
- Horizontal bar এ 8টা currency র strength number দেখাবে — sorted by strength
- Color coded (STRONG = green, WEAK = red, NEUTRAL = yellow)
- Data source: `currency_strength` table থেকে latest fetch (same query as CurrencyStrength page)
- Selected currency টা highlighted/glowing
- Format: `🇪🇺 EUR +7.2` `🇬🇧 GBP +5.1` ... inline badges

**3. Chart Grid — Compact Height**
- Chart height 400px → **250px** (2-col) বা **220px** (3-col)
- এতে 6টা chart একটা screen এ fit করবে
- RSI panel এর জন্য showRsi=false default করলে আরো compact হবে

**4. One-Screen Layout**
- Header + Currency selector + Strength strip + Compact session + Charts = all in viewport
- `space-y-5` → `space-y-2` to reduce gaps
- Timeframe/Layout/Chart controls একটা row তে compact করবো

### Files

| File | Action |
|------|--------|
| `src/pages/CorrelationPairs.tsx` | Edit — add strength data fetch, compact layout, integrate new components |
| `src/components/correlation/CorrelationStrengthStrip.tsx` | New — horizontal strength numbers bar |
| `src/components/correlation/MiniChart.tsx` | Edit — reduce default chart height |
| `src/components/correlation/SessionPanel.tsx` | No change (reuse existing, but page will use compact inline version instead) |

### Technical Details
- `useQuery` দিয়ে `currency_strength` table থেকে latest data fetch — same pattern as `CurrencyStrength.tsx`
- Strength strip auto-refreshes every 60s
- Chart height prop যোগ করবো MiniChart এ — page থেকে pass করবো

