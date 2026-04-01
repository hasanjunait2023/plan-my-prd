
# MetaApi.cloud দিয়ে MT5 Integration

## Approach

হ্যাঁ, আরেকটা way আছে — **MetaApi.cloud** নামে একটা third-party service আছে যেটা MT5 এর জন্য REST API provide করে। তুমি শুধু MT5 login, password, আর broker server name দিবে — বাকি সব MetaApi handle করবে। কোনো EA install করা লাগবে না।

```text
┌─────────────────┐     REST API      ┌──────────────┐     HTTP      ┌─────────────┐
│  MetaApi Cloud  │ ←───────────────→ │  Edge Func   │ ←──────────→ │  Web App    │
│ (connects MT5)  │   trade data      │  (Supabase)  │              │ Fx Junait   │
└─────────────────┘                   └──────────────┘              └─────────────┘
```

## কি কি পাবে

| Feature | Detail |
|---------|--------|
| **Account Info** | Balance, Equity, Margin, Free Margin — real-time |
| **Trade History** | সব closed trades auto fetch — pair, lot, P&L, entry/exit |
| **Open Positions** | বর্তমান open trades live দেখা যাবে |
| **Auto Journal Import** | MT5 trade → Journal এ one-click import |

## Setup যা লাগবে (তোমাকে করতে হবে)

1. **MetaApi.cloud এ free account** খুলতে হবে → [metaapi.cloud](https://metaapi.cloud)
2. MetaApi dashboard থেকে **API Token** copy করতে হবে
3. MetaApi dashboard এ তোমার Exness MT5 account add করতে হবে:
   - MT5 Login number
   - MT5 Password (investor password দিলেও চলবে — read-only access)
   - Broker server name (e.g., `Exness-MT5Real`)
4. MetaApi থেকে **Account ID** পাবে — সেটাও দিতে হবে

> **Note**: MetaApi free tier এ 1টা account connect করা যায়। Paid plan এ unlimited।

## Implementation Steps

### 1. Secrets যোগ করা
- `METAAPI_TOKEN` — MetaApi API token
- `METAAPI_ACCOUNT_ID` — connected MT5 account ID

### 2. Edge Function — `mt5-sync`
- MetaApi REST API call করে account info + trade history fetch করবে
- Data Supabase table এ save করবে
- Endpoint: `GET https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/{accountId}/...`

### 3. Database Tables
- `mt5_account_info` — balance, equity, margin, last_synced
- `mt5_trades` — ticket, pair, direction, lot, entry/exit price, pnl, open/close time

### 4. Frontend — MT5 Connection Page
- Account status card (connected/disconnected, last sync time)
- Balance/Equity/Margin display
- Trade history list with "Import to Journal" button
- Manual "Sync Now" button

### 5. Navigation ও Route যোগ

## Files

| Action | File |
|--------|------|
| **Migration** | `mt5_account_info` ও `mt5_trades` tables |
| **Create** | `supabase/functions/mt5-sync/index.ts` |
| **Create** | `src/pages/MT5Connection.tsx` |
| **Create** | `src/components/mt5/AccountCard.tsx` |
| **Create** | `src/components/mt5/TradesList.tsx` |
| **Modify** | `src/App.tsx` — route যোগ |
| **Modify** | `src/components/Layout.tsx` — nav link যোগ |

## Important
- MetaApi **paid service** — free tier limited (1 account, limited requests)
- Investor password দিলে **read-only** access হবে (safer — trade execute করতে পারবে না)
- Master password দিলে trade execute ও করা যাবে (future feature)
- PC তে MT5 open না থাকলেও কাজ করবে — MetaApi cloud এ terminal চালায়
