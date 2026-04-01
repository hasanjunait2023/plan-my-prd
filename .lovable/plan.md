

# Session Panel — সব pages এ যোগ + Premium Look

## কি করতে হবে
SessionPanel component টা এখন শুধু Correlation, Commodities, Crypto তে আছে। এটা **Dashboard (Index), New Trade, Currency Strength** pages এও top এ যোগ করতে হবে। সাথে design টা আরো premium করতে হবে (reference image অনুযায়ী)।

## Premium Design Changes — `SessionPanel.tsx`

- Outer container: stronger glass effect — `bg-card/80 backdrop-blur-xl`, subtle gradient border (`bg-gradient-to-r` wrapper technique), `shadow-lg`
- Active session cards: stronger glow — `shadow-[0_0_12px_rgba(color,0.15)]`, slightly larger padding
- "MARKET SESSIONS" header: bolder, letter-spacing wider
- UTC clock: slightly bigger font, `font-semibold`
- Progress bar: height `h-1.5` (thicker), smooth gradient
- Overlap text: slightly more prominent styling

## Pages এ যোগ করা

| File | Change |
|------|--------|
| **Modify** `src/components/correlation/SessionPanel.tsx` | Premium styling upgrade |
| **Modify** `src/pages/Index.tsx` | Import + `<SessionPanel />` header এর পরে যোগ |
| **Modify** `src/pages/NewTrade.tsx` | Import + `<SessionPanel />` top এ যোগ |
| **Modify** `src/pages/CurrencyStrength.tsx` | Import + `<SessionPanel />` header এর পরে যোগ |

মোট 4টা file change। Correlation, Commodities, Crypto তে already আছে — সেগুলো automatically premium style পাবে।

