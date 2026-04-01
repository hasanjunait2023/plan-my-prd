

# MetaApi MT5 Integration — Implementation Plan

## তোমাকে যা করতে হবে (Prerequisites)

তোমার MetaApi Account ID পেয়ে গেছি: `f25644b9-1732-413d-9c64-c3dcd66259cc`

**2টা secret Supabase dashboard এ add করতে হবে:**
1. `METAAPI_TOKEN` — তুমি যে JWT token দিয়েছো সেটা
2. `METAAPI_ACCOUNT_ID` — `f25644b9-1732-413d-9c64-c3dcd66259cc`

[Secrets যোগ করো এখানে →](https://supabase.com/dashboard/project/ejtnvpmshcqydndxxonq/settings/functions)

## Implementation

### Step 1: Database Migration
2টা table তৈরি:

**`mt5_account_info`** — balance, equity, margin, free_margin, leverage, server, broker, currency, synced_at
- `account_id` column এ UNIQUE constraint — upsert এর জন্য
- RLS: public read, service_role insert/update/delete

**`mt5_trades`** — ticket (unique), pair, direction, entry/exit price, sl, tp, lot_size, pnl, commission, swap, open/close time, imported_to_journal flag
- RLS: public read, service_role insert/update/delete, anon/authenticated update (for import flag)

### Step 2: Edge Function — `mt5-sync`
MetaApi REST API endpoints:
- `GET /users/current/accounts/{id}/account-information` → account data
- `GET /users/current/accounts/{id}/history-deals/time/{start}/{end}` → closed trades
- `GET /users/current/accounts/{id}/positions` → open positions

POST body দিয়ে action control: `full`, `account`, `history`, `positions`।
Base URL: `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai`

### Step 3: Frontend Components

**`src/components/mt5/AccountCard.tsx`**
- Balance, Equity, Margin, Free Margin cards (4-col grid)
- Server name, broker, leverage info
- Last sync timestamp

**`src/components/mt5/TradesList.tsx`**
- Closed trades table: pair, direction, lot, P&L, entry/exit, time
- "Import to Journal" button per trade
- Open positions section with live data

**`src/components/mt5/ConnectionStatus.tsx`**
- Connected/disconnected badge
- Last sync time (relative)

**`src/pages/MT5Connection.tsx`**
- "Sync Now" button → calls edge function
- AccountCard, ConnectionStatus, TradesList render
- Loading states

### Step 4: Route ও Navigation
- `App.tsx`: `/mt5` route → `MT5Connection`
- `Layout.tsx`: nav items এ MT5 link (icon: `Cable` or `Link2`)

## Files Summary

| Action | File |
|--------|------|
| **Migration** | `mt5_account_info` ও `mt5_trades` tables |
| **Create** | `supabase/functions/mt5-sync/index.ts` |
| **Create** | `src/pages/MT5Connection.tsx` |
| **Create** | `src/components/mt5/AccountCard.tsx` |
| **Create** | `src/components/mt5/TradesList.tsx` |
| **Create** | `src/components/mt5/ConnectionStatus.tsx` |
| **Modify** | `src/App.tsx` — route add |
| **Modify** | `src/components/Layout.tsx` — nav link add |

