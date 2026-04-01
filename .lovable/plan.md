

# Currency Pair Flags — Trading Environment Enhancement Plan

## কি করতে হবে
সব জায়গায় যেখানে currency pair (e.g., EURUSD, GBPJPY) দেখায়, সেখানে pair এর দুই currency র flag emoji যোগ করা। যেমন: `🇪🇺🇺🇸 EURUSD`। এটা পুরো app এ trading terminal এর feel আনবে।

## Helper Utility
**New: `src/lib/pairFlags.ts`**

`CURRENCY_FLAGS` map already আছে `src/types/correlation.ts` এ। একটা helper function বানাবো:

```typescript
export function getPairFlags(pair: string): { base: string; quote: string } 
// "EURUSD" → { base: "🇪🇺", quote: "🇺🇸" }
// "GBPJPY" → { base: "🇬🇧", quote: "🇯🇵" }
```

এবং একটা reusable component:
```typescript
export function PairWithFlags({ pair }: { pair: string })
// Renders: 🇪🇺🇺🇸 EURUSD
```

## যেসব জায়গায় Flag যোগ হবে

| File | Location |
|------|----------|
| `TradeCard.tsx` | Journal card — pair name এর আগে |
| `TradeDocument.tsx` | Export document — pair heading এ |
| `Index.tsx` (Dashboard) | Last trade display, recent trades list |
| `NewTrade.tsx` | Pair dropdown options এ |
| `ConfluenceCard.tsx` | Pair name এর আগে |
| `AdrGauge.tsx` | Pair name এর আগে |
| `AlignmentCard.tsx` | EMA scan pair display |
| `EmaScanner.tsx` | Pair grouping headers |
| `TradeIntelligence.tsx` | Top setups badges |
| `Layout.tsx` | Notification items এ pair name |

## Technical Details

- `CURRENCY_FLAGS` map কে `correlation.ts` থেকে re-export বা `pairFlags.ts` এ move করা
- Pair parsing: প্রথম 3 char = base currency, শেষ 3 char = quote currency
- XAU, XAG এর জন্য custom flags: `🥇` (Gold), `🥈` (Silver)
- Unknown currency fallback: empty string (no flag)
- মোট ~11টা file modify হবে, 1টা নতুন file

