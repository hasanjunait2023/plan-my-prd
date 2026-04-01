

# TradingView Chart Indicators Fix

## সমস্যা
`widgetembed` URL এ studies parameter এর format সঠিক না — `MAExp@tv-basicstudies|{\"length\":9}` syntax এই widget type এ কাজ করে না।

## সমাধান
TradingView এর **Advanced Chart Widget** (`embed-widget/advanced-chart/`) ব্যবহার করবো — এটা newer endpoint যেখানে studies properly কাজ করে। Script-based widget initialization করবো iframe এর বদলে।

## Technical Change

**File: `src/components/assets/TradingViewChart.tsx`**

iframe URL approach বাদ দিয়ে TradingView widget script inject করবো:

```typescript
const script = document.createElement('script');
script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
script.async = true;
script.innerHTML = JSON.stringify({
  symbol: tvSymbol,
  interval: interval,
  theme: 'dark',
  style: '1',
  locale: 'en',
  timezone: 'Etc/UTC',
  studies: [
    { id: "MAExp@tv-basicstudies", inputs: { length: 9 } },
    { id: "MAExp@tv-basicstudies", inputs: { length: 15 } },
    { id: "MAExp@tv-basicstudies", inputs: { length: 200 } },
    { id: "RSI@tv-basicstudies" }
  ],
  hide_top_toolbar: true,
  hide_legend: false,
  save_image: false,
  width: '100%',
  height: '100%',
});
```

- Script-based embed properly supports `studies` array with `inputs`
- EMA 9, 15, 200 এবং RSI সব correctly render হবে
- Timeframe switch ও আগের মতো কাজ করবে — `useEffect` dependency তে `interval` আছে
- শুধু একটা file change

