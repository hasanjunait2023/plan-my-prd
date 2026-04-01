

# Correlation Page — Chart Visibility Improvement

## সমস্যা
বর্তমানে chart height মাত্র 250px — EMA + RSI সহ analysis করা কঠিন। 3-column grid এ chart গুলো খুব ছোট হয়ে যায়।

## সমাধান

### 1. Grid Layout পরিবর্তন — 2 column
- `lg:grid-cols-3` → `lg:grid-cols-2` করবো
- এতে প্রতিটা chart wider হবে, candlestick ও indicators ভালো দেখা যাবে
- 2x3 layout (2 columns, 3 rows)

### 2. Chart Height বাড়ানো
- `h-[250px]` → `h-[400px]` করবো
- RSI নিচে separate pane এ থাকে, তাই বেশি height দরকার proper analysis এর জন্য

### 3. Full-screen Expand Button
- প্রতিটা MiniChart এ একটা expand icon button যোগ করবো (header এ)
- Click করলে chart টা full-screen modal/dialog এ open হবে `h-[80vh]` height সহ
- Dialog এ same TradingView widget বড় করে render হবে — detailed analysis করা যাবে

### 4. Page Max Width বাড়ানো
- `max-w-[1400px]` → `max-w-[1600px]` করবো — wider screen এ আরো জায়গা পাবে

## Files

| File | Change |
|------|--------|
| `src/components/correlation/MiniChart.tsx` | Height 250→400px, expand button যোগ, fullscreen dialog |
| `src/pages/CorrelationPairs.tsx` | Grid 3→2 cols, max-width বাড়ানো |

