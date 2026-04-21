

# Strict Major-Currency Bias Logic

## নতুন নিয়ম

একটা pair-এ true BUY/SELL bias তখনই হবে যখন **একটা currency STRONG (বা Medium-Strong)** এবং **অন্যটা NEUTRAL / Mid-Weak / Weak**। দুটোই strong বা দুটোই weak হলে → Neutral।

### Direction rule (base − quote logic অনুযায়ী)

- **HQ BUY**: base = STRONG (≥ +5)  AND  quote ∈ {NEUTRAL, MID_WEAK, WEAK}  (quote < +2)
- **MED BUY**: base = MEDIUM_STRONG (+2 to +4)  AND  quote ∈ {NEUTRAL, MID_WEAK, WEAK}  (quote < +2)
  - OR base ∈ {NEUTRAL...} AND quote = WEAK (≤ −5) — mirror case where weak quote drives buy
- **HQ SELL**: quote = STRONG (≥ +5)  AND  base ∈ {NEUTRAL, MID_WEAK, WEAK}
- **MED SELL**: quote = MEDIUM_STRONG  AND  base ∈ {NEUTRAL, MID_WEAK, WEAK}
  - OR quote ∈ {NEUTRAL...} AND base = WEAK (≤ −5)
- **NEUTRAL**: সব বাকি ক্ষেত্রে — যেমন দুটোই strong, দুটোই weak, দুটোই neutral, বা শুধু differential আছে কিন্তু কেউই strong/weak না।

### উদাহরণ

| Base | Quote | পুরাতন | নতুন |
|------|-------|--------|------|
| EUR +6 | USD −4 | HQ BUY | **HQ BUY** ✓ (strong vs weak) |
| NZD −1 | USD −3 | MED BUY (downgrade Neutral) | **NEUTRAL** ✓ (কেউ strong না) |
| GBP +3 | JPY −1 | MED BUY | **MED BUY** ✓ (mid-strong vs neutral) |
| AUD +5 | NZD +4 | NEUTRAL (same sign) | **NEUTRAL** ✓ (দুটোই strong) |
| CHF +2 | CAD +1 | MED BUY | **NEUTRAL** ✗→✓ (quote neutral না, +1 ও weak না) |
| EUR +1 | JPY −6 | HQ BUY | **MED BUY** ✓ (weak quote drives, base শুধু neutral) |

## Files Changed

**`src/lib/biasCalculator.ts`** — `calculateBias()` সম্পূর্ণ rewrite:
- Differential-based gating বাদ; এর পরিবর্তে base/quote-এর tier দেখে decision হবে।
- Helper: `tierOf(strength)` reuse করবে existing thresholds (≥5 STRONG, ≥2 MED_STRONG, >−2 NEUTRAL, >−5 MID_WEAK, else WEAK)।
- Decision matrix:
  1. If base STRONG and quote ≤ NEUTRAL (i.e. quote < +2) → **HQ BUY**
  2. Else if quote STRONG and base ≤ NEUTRAL → **HQ SELL**
  3. Else if base MED_STRONG and quote ≤ NEUTRAL → **MED BUY**
  4. Else if quote MED_STRONG and base ≤ NEUTRAL → **MED SELL**
  5. Else if quote WEAK (≤ −5) and base ≥ NEUTRAL (>−2) → **MED BUY** (weak-quote driver)
  6. Else if base WEAK and quote ≥ NEUTRAL → **MED SELL**
  7. Else → **NEUTRAL**
- `diff` parameter signature backwards-compatible রাখা হবে কিন্তু internally আর ব্যবহার হবে না (only for sorting elsewhere)।
- যদি `baseStrength` / `quoteStrength` undefined হয় (non-forex pair), পুরাতন diff-only fallback রাখব যাতে existing callers ভাঙে না।

**`src/components/floating/WatchlistPanel.tsx`** — কোনো বদল লাগবে না; ইতিমধ্যে base/quote strength pass করছে।

## Out of Scope

- Strength threshold (5 / 2 / −2 / −5) পরিবর্তন
- UI label / color change
- Sort logic পরিবর্তন (এখনও |diff| descending)

