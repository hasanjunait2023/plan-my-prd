

## Plan: Chart Variant Toggle — With RSI / Without RSI

### কি করা হবে
Correlation Pairs page এ chart এর জন্য ২টা variant toggle যোগ করা:
1. **EMA + RSI** (বর্তমান — default)
2. **EMA Only** (RSI ছাড়া — chart এ বেশি জায়গা পাওয়া যাবে)

### Technical Changes

| File | Change |
|------|--------|
| `src/pages/CorrelationPairs.tsx` | নতুন state `chartVariant: 'ema-rsi' | 'ema-only'` + toggle button যোগ (timeframe bar এর পাশে) |
| `src/components/correlation/MiniChart.tsx` | `showRsi` prop accept করা। `showRsi=false` হলে studies array থেকে `RSI@tv-basicstudies` বাদ দেওয়া |

### UI
Timeframe buttons (3M, 15M, 1H) এর পাশে ২টা variant button:
- **EMA+RSI** — active হলে highlight
- **EMA** — active হলে highlight

Toggle করলে সব MiniChart re-render হবে নতুন studies config সহ।

### Implementation Detail
`MiniChart` এর ভেতরের `TradingViewWidget` এ `showRsi` prop pass হবে:
```
studies: showRsi
  ? [EMA9, EMA15, EMA200, RSI]
  : [EMA9, EMA15, EMA200]
```

