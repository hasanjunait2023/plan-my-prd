

# TradingView Chart Analysis Page

## কি তৈরি হবে
একটা dedicated "Charts" page যেখানে TradingView Advanced Chart widget fullscreen-capable হবে, currency pair switcher থাকবে, এবং multiple timeframe সিলেক্ট করা যাবে।

## TradingView Account Sync সম্পর্কে
TradingView এর embed widget দিয়ে account login/sync সরাসরি সম্ভব না — TradingView কোনো public API দেয় না user account sync এর জন্য। তবে একটা workaround আছে:
- Widget এর `show_popup_button: true` enable করলে chart টা TradingView.com এ popup হিসেবে খুলবে — সেখানে তুমি logged in থাকলে তোমার saved drawings, indicators সব দেখতে পাবে।
- এছাড়া widget এ `allow_symbol_change: true` করলে TradingView এর built-in symbol search ও ব্যবহার করা যাবে।

## Features

### 1. Pair Selector (Top Bar)
- Forex majors (EURUSD, GBPUSD, USDJPY, etc.), metals (XAUUSD, XAGUSD), oil, crypto — categorized tabs/dropdown
- Custom pair input ও থাকবে
- Recently viewed pairs list

### 2. Timeframe Bar
- 1M, 3M, 5M, 15M, 30M, 1H, 4H, D, W, M — সব standard timeframe

### 3. Fullscreen Chart
- Chart প্রায় পুরো viewport নেবে (header বাদে)
- একটা Fullscreen toggle button — click করলে browser fullscreen API দিয়ে chart পুরো screen নেবে (Layout header ও hide হবে)
- EMA 9, 15, 200 + RSI default indicators থাকবে

### 4. "Open in TradingView" Button
- `show_popup_button: true` দিয়ে TradingView.com এ chart খুলবে — সেখানে তোমার TradingView account এর সব কিছু synced থাকবে

## Changes

| Action | File |
|--------|------|
| **Create** | `src/pages/ChartAnalysis.tsx` — Main page with pair selector, timeframe bar, fullscreen chart |
| **Modify** | `src/App.tsx` — `/charts` route add |
| **Modify** | `src/components/Layout.tsx` — nav এ "Charts" link add (LineChart icon) |

3টা file change। কোনো backend/database change লাগবে না।

