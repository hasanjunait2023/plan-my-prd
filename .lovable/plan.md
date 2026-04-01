

# Correlation Pairs — Opposite Pair Highlighting

## ধারণা
Selected currency (যেমন EUR) এর 6টা pair এর মধ্যে:
- **Direct pairs** (EUR base): EURUSD, EURGBP, EURJPY — EUR strong হলে এগুলো **উপরে** যায়
- **Inverse pairs** (EUR quote): GBPEUR → chart এ EURGBP — EUR strong হলে এগুলো **নিচে** যায়

Majority pairs যেদিকে move করে, তার **opposite** দিকের pairs গুলোর card border/header হালকা (dimmed) করে দেবো — যেন তুমি বুঝতে পারো কোনটা same direction আর কোনটা ulta।

## Logic
- Selected currency pair এর base কিনা check করবো: `pair.startsWith(selected)` → **direct**, না হলে → **inverse**
- 6টার মধ্যে যেগুলো minority (কম সংখ্যক), সেগুলো "opposite" হিসেবে mark হবে
- Opposite pair এর card এ `opacity-50` + একটা small "↕ Inverse" badge দেবো

## Technical Changes

### File: `src/pages/CorrelationPairs.tsx`
- প্রতিটা pair এর জন্য determine করবো `isBase = pair.startsWith(selected)`
- Count করবো কতগুলো base, কতগুলো quote — minority group = opposite
- `MiniChart` এ নতুন `dimmed` prop পাঠাবো

### File: `src/components/correlation/MiniChart.tsx`
- `dimmed?: boolean` prop accept করবে
- `dimmed` true হলে:
  - Card border ও header এ `opacity-50` class
  - Header এ ছোট `↕ Inverse` badge (orange/muted color)
  - Chart widget unchanged (full visibility রাখবো analysis এর জন্য)

```text
┌─ Normal Card ─────────┐   ┌─ Dimmed Card (opacity) ─┐
│ 🇪🇺🇺🇸 EURUSD          │   │ 🇬🇧🇪🇺 GBPEUR  ↕ Inverse │
│ [full chart]           │   │ [full chart, dim border] │
└────────────────────────┘   └──────────────────────────┘
```

### Files
| Action | File |
|--------|------|
| **Modify** | `src/pages/CorrelationPairs.tsx` — base/quote logic + dimmed prop |
| **Modify** | `src/components/correlation/MiniChart.tsx` — dimmed styling + badge |

