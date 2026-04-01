# MetaApi দিয়ে MT5 Integration

## Overview
MetaApi REST API ব্যবহার করে তোমার Exness MT5 account এর data (balance, equity, trade history, open positions) auto-sync করবো। কোনো EA install লাগবে না।

## Steps

### 1. Secrets যোগ করা
- `METAAPI_TOKEN` — তোমার MetaApi API token
- `METAAPI_ACCOUNT_ID` — `f25644b9-1732-413d-9c64-c3dcd66259cc`

### 2. Database Tables (Migration)

**`mt5_account_info`** — Account balance, equity, margin, sync status
| Column | Type |
|--------|------|
| id | uuid PK |
| account_id | text |
| balance | numeric |
| equity | numeric |
| margin | numeric |
| free_margin | numeric |
| leverage | integer |
| server | text |
| synced_at | timestamptz |

**`mt5_trades`** — Trade history from MT5
| Column | Type |
|--------|------|
| id | uuid PK |
| ticket | text (unique) |
| pair | text |
| direction | text (BUY/SELL) |
| entry_price | numeric |
| exit_price | numeric |
| sl | numeric |
| tp | numeric |
| lot_size | numeric |
| pnl | numeric |
| pips | numeric |
| commission | numeric |
| swap | numeric |
| open_time | timestamptz |
| close_time | timestamptz |
| imported_to_journal | boolean (default false) |

RLS: Public read, service_role insert/update/delete।

### 3. Edge Function — `mt5-sync`
- MetaApi REST API call করে:
  - `GET /accounts/{accountId}/account-information` → balance, equity, margin
  - `GET /accounts/{accountId}/history-deals` → closed trades
  - `GET /accounts/{accountId}/positions` → open positions
- Data upsert করবে Supabase tables এ
- CORS headers সহ

### 4. Frontend — `MT5Connection.tsx` Page
- **Account Status Card** — Balance, Equity, Margin, Free Margin, last sync time
- **Open Positions List** — বর্তমান open trades
- **Trade History List** — closed trades with "Import to Journal" button
- **Sync Now Button** — manual sync trigger

### 5. Components
- `src/components/mt5/AccountCard.tsx` — balance/equity display
- `src/components/mt5/TradesList.tsx` — trade history + open positions
- `src/components/mt5/ConnectionStatus.tsx` — sync status indicator

### 6. Route ও Navigation
- `/mt5` route যোগ in `App.tsx`
- Layout nav এ MT5 link যোগ

## Files

| Action | File |
|--------|------|
| **Secret** | `METAAPI_TOKEN`, `METAAPI_ACCOUNT_ID` |
| **Migration** | `mt5_account_info` ও `mt5_trades` tables |
| **Create** | `supabase/functions/mt5-sync/index.ts` |
| **Create** | `src/pages/MT5Connection.tsx` |
| **Create** | `src/components/mt5/AccountCard.tsx` |
| **Create** | `src/components/mt5/TradesList.tsx` |
| **Create** | `src/components/mt5/ConnectionStatus.tsx` |
| **Modify** | `src/App.tsx` — route |
| **Modify** | `src/components/Layout.tsx` — nav link |
