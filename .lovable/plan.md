

## Plan: সব Chart এ Period Separator যোগ করা

### বর্তমান অবস্থা
4টা file এ TradingView chart আছে। 2টাতে `session_breaks` আছে, 2টাতে নেই:

| File | Period Separator |
|------|-----------------|
| `MiniChart.tsx` | ✅ আছে |
| `TradingViewChart.tsx` | ✅ আছে |
| `TradingViewWidget.tsx` | ❌ নেই |
| `PairSuggestions.tsx` | ❌ নেই |

### কি করা হবে
বাকি 2টা file এ `enabled_features: ["session_breaks"]` যোগ করা — এটাই TradingView এর period separator (দিন/সপ্তাহ/মাস এর vertical line)।

### Changes

| File | Change |
|------|--------|
| `src/components/charts/TradingViewWidget.tsx` | Config এ `disabled_features: [], enabled_features: ["session_breaks"]` যোগ |
| `src/components/correlation/PairSuggestions.tsx` | Config এ `disabled_features: [], enabled_features: ["session_breaks"]` যোগ |

খুবই ছোট change — দুটো file এ একটা করে line যোগ করলেই হবে।

