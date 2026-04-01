

# Correlation Pairs Page — Multi-Chart Grid (Modified)

## কি করতে হবে
নতুন `/correlation-pairs` page — user একটা currency select করবে, তারপর সেই currency র **6টা** major pairs 2x3 grid এ TradingView charts এ দেখাবে।

## Pair Generation Logic

প্রতিটা currency র জন্য সবচেয়ে traded 6টা pair select করবো (7টার মধ্যে least liquid টা বাদ):

```text
Selected: CAD → USDCAD, GBPCAD, EURCAD, NZDCAD, AUDCAD, CADJPY
Selected: EUR → EURUSD, EURGBP, EURJPY, EURAUD, EURNZD, EURCAD
Selected: USD → EURUSD, GBPUSD, USDJPY, AUDUSD, NZDUSD, USDCAD
```

## UI Layout

```text
┌──────────────────────────────────────────┐
│  📊 Correlation Pairs                     │
│  [🇪🇺EUR] [🇺🇸USD] [🇬🇧GBP] [🇯🇵JPY]...  │
│  Timeframe: [3M] [15M] [1H]             │
├──────────┬──────────┬──────────┐         │
│ Pair 1   │ Pair 2   │ Pair 3   │         │
│ (chart)  │ (chart)  │ (chart)  │         │
├──────────┼──────────┼──────────┤         │
│ Pair 4   │ Pair 5   │ Pair 6   │         │
│ (chart)  │ (chart)  │ (chart)  │         │
└──────────────────────────────────────────┘
```

Clean 2x3 grid — কোনো orphan chart নেই।

## Files

| Action | File | Description |
|--------|------|-------------|
| **Create** | `src/pages/CorrelationPairs.tsx` | Main page — currency selector, timeframe, 2x3 pair grid |
| **Create** | `src/components/correlation/MiniChart.tsx` | Compact TradingView chart (~250px height) with EMA+RSI |
| **Modify** | `src/App.tsx` | Route `/correlation-pairs` যোগ |
| **Modify** | `src/components/Layout.tsx` | Navigation link যোগ |

## Technical Details

- **MiniChart**: `TradingViewChart` এর compact version — height ~250px, `hide_top_toolbar: true`, `hide_side_toolbar: true`, flag emoji header
- **Pair ordering**: Standard forex convention (EUR > GBP > AUD > NZD > USD > CAD > CHF > JPY), প্রতিটা currency থেকে top 6 pairs
- **TradingView symbols**: `OANDA:` prefix
- **Grid**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` — responsive 2x3

