

## Plan: Telegram Alert Message — 12-Hour Time + Bold Highlights

### পরিবর্তন

**File: `supabase/functions/price-spike-detector/index.ts`** — শুধু message formatting functions update

#### 1. `getBdTime()` → 12-hour format
```typescript
// আগে: 14:32 (24hr)
// এখন: 02:32 PM (12hr)
function getBdTime(): string {
  return new Date().toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,  // ← change
  }).toUpperCase(); // "02:32 PM"
}
```

#### 2. Highlights — Telegram Markdown bold (`*...*`)

Telegram `parse_mode: Markdown` ব্যবহার করে তিনটা জিনিস bold করা হবে:

| Element | আগে | এখন |
|---------|------|------|
| Pair name | `EUR/USD` | `*EUR/USD*` |
| Direction | `BULLISH` | `*🟢 BULLISH ▲*` / `*🔴 BEARISH ▼*` |
| Time | `⏰ 🇧🇩 14:32 BST` | `⏰ 🇧🇩 *02:32 PM* BST` |

#### 3. Updated Message Examples

**Single Spike:**
```text
🔴🔴🔴 CRITICAL SPIKE 🔴🔴🔴

📊 *BTC/USD* — +0.45% move!
📈 71,500 → 71,822 (+322 pips)
⚡ *🟢 BULLISH ▲ — Price বেড়েছে*

⏰ 🇧🇩 *02:32 PM* BST

⚠️ EXTREME volatility detected!
```

**Grouped Multi-Pair:**
```text
🔴🔴🔴 CRITICAL MULTI-PAIR SPIKE 🔴🔴🔴

⚡ 3 pairs moving together!
*🔴 BEARISH ▼ — Price কমেছে*

📊 Major Pairs:
  📉 *EUR/USD* -0.18% | 1.0850 → 1.0830
  📉 *GBP/USD* -0.22% | 1.2650 → 1.2622

📋 Also moving:
  EUR/GBP -0.12%

⏰ 🇧🇩 *07:45 PM* BST
```

#### 4. Telegram send call — `parse_mode` যোগ
Telegram message send করার সময় `parse_mode: "Markdown"` parameter যোগ করতে হবে যাতে bold formatting কাজ করে।

### Changes Summary
- `getBdTime()` → `hour12: true`
- `buildSingleMessage()` → pair, direction, time bold
- `buildGroupedMessage()` → pair, direction header, time bold  
- Telegram API call → `parse_mode: "Markdown"` যোগ
- Deploy edge function

