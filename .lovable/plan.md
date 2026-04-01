

# Telegram Trading Alerts — Deep Analysis ও Plan

## তোমার System এ কি কি আছে এখন

তোমার TradeVault Pro তে এখন এই data sources live আছে:

1. **Confluence Scores** — প্রতিটা pair এর grade (A+, A, B, C, D), direction (BUY/SELL), strength difference, EMA score, active session
2. **EMA Scanner** — 9/15/200 EMA alignment scan, bullish/bearish/mixed status per pair per timeframe
3. **Currency Strength** — প্রতিটা currency এর real-time strength score ও trend
4. **ADR Data** — Average Daily Range ও কতটুকু used হয়েছে
5. **MT5 Trades** — তোমার real MT5 account এর open/closed trades
6. **Risk Settings** — max risk %, daily loss limit, max trades per day, personal rules

## কিভাবে Telegram Alerts তোমাকে সাহায্য করবে

### 🔥 Alert Type 1: **High-Grade Confluence Alert**
যখন কোনো pair **A+ বা A grade** পায় — মানে EMA aligned, currency strength strong, session active — তখন সাথে সাথে Telegram এ message আসবে:

```
🟢 A+ SETUP: EUR/USD — BUY
Strength Diff: 4.2 | EMA: 3/3 ✓ | Session: London
ADR Used: 35% (room to move)
```

**কেন দরকার:** তুমি হয়তো chart এর সামনে নেই, কিন্তু A+ setup miss হবে না।

### 📊 Alert Type 2: **EMA Alignment Shift**
যখন কোনো pair এর EMA alignment change হয় (mixed → bullish, বা bullish → bearish):

```
⚡ EMA SHIFT: GBP/USD
15M: Bullish ✓ | 1H: Bullish ✓ | 4H: Turning Bullish ↑
Multi-TF alignment detected!
```

**কেন দরকার:** Multi-timeframe alignment rare এবং high-probability — এটা জানলে তুমি সঠিক সময়ে chart দেখতে পারবে।

### ⚠️ Alert Type 3: **Risk Breach Warning**
যখন তোমার daily loss limit এর কাছে আসছো, বা max trades per day cross করছো:

```
🔴 RISK ALERT: Daily loss -$420 / $500 limit (84%)
Trades today: 4/5
⛔ Consider stopping for the day.
```

**কেন দরকার:** Revenge trading আটকাবে। Emotional state এ থাকলেও phone এ warning আসলে সচেতন হবে।

### 🕐 Alert Type 4: **Session Open Reminder**
London Open (14:00 BDT), NY Open (19:30 BDT) এর 5 মিনিট আগে:

```
🕐 London Session opens in 5 min
Top setups: EUR/USD (A+), GBP/USD (A)
Check your charts!
```

**কেন দরকার:** Session timing miss হবে না, আর সাথে best setups ও জানাবে।

### 📈 Alert Type 5: **MT5 Trade Update**
তোমার MT5 তে trade open/close হলে:

```
✅ Trade Closed: EUR/USD LONG
P/L: +$225 (+45 pips)
Daily P/L: +$395
```

---

## Technical Implementation

### Architecture

```text
┌─────────────────┐     pg_cron (every 1-5 min)     ┌──────────────────────┐
│  Supabase DB    │ ──────────────────────────────►  │ Edge Function:       │
│  confluence_scores│                                 │ telegram-trade-alerts│
│  ema_alignments  │                                  │                      │
│  adr_data        │  ◄── checks data, compares ──►  │ Sends Telegram msg   │
│  mt5_trades      │      with last_alert_state       │ via connector gateway│
│  settings        │                                  └──────────────────────┘
└─────────────────┘
```

### Step 1: Telegram Bot Setup
- Telegram connector ব্যবহার করবো (already available)
- তোমাকে BotFather এ গিয়ে একটা bot create করতে হবে
- তারপর bot কে message পাঠালে chat_id পাবো

### Step 2: Database — `alert_settings` ও `alert_log` tables
- **alert_settings**: কোন alerts চালু, Telegram chat_id, thresholds (min grade, risk % warning level)
- **alert_log**: কোন alert কখন পাঠানো হয়েছে (duplicate prevention)

### Step 3: Edge Function — `telegram-trade-alerts`
- Confluence scores চেক করবে → A+/A হলে alert
- EMA alignment change detect করবে
- MT5 trade changes detect করবে
- Risk limits চেক করবে
- Session timing চেক করবে
- সব condition match হলে Telegram connector gateway দিয়ে message পাঠাবে

### Step 4: pg_cron Schedule
- Confluence/EMA alerts: প্রতি 2 মিনিটে
- Risk alerts: প্রতি 1 মিনিটে
- Session reminders: প্রতি 1 মিনিটে (session time এর কাছে)

### Step 5: Settings UI
- Settings page এ "Notifications" section যোগ হবে
- Toggle: কোন কোন alert চালু/বন্ধ
- Telegram chat ID input
- Min confluence grade selector (A+ only / A and above / B and above)
- "Send Test Message" button

## Files

| Action | File |
|--------|------|
| **Migration** | `alert_settings` ও `alert_log` tables create |
| **Create** | `supabase/functions/telegram-trade-alerts/index.ts` |
| **Modify** | `src/pages/Settings.tsx` — Notification settings section যোগ |
| **pg_cron** | Schedule the edge function every 1-2 min |

## Prerequisites
1. Telegram connector connect করতে হবে
2. BotFather এ bot create করে, bot কে একটা message পাঠাতে হবে chat_id পেতে

