

# Mock Data Remove ও Real Data Ready করার Plan

## বর্তমান অবস্থা

সবকিছু `src/data/mockData.ts` এর hardcoded data থেকে আসছে। Database এ trades, psychology, settings এর কোনো table নেই। তাই শুধু mock data মুছলেই হবে না — real data save/load এর জন্য **Supabase tables** ও তৈরি করতে হবে।

## কি কি করবো

### 1. Supabase Tables তৈরি (Migration)

| Table | Purpose |
|-------|---------|
| `trades` | সকল trade data — pair, direction, entry/exit, P&L, SMC tags, psychology, notes, screenshots |
| `psychology_logs` | Daily psychology journal — mental state, sleep, emotions, reflection |
| `account_settings` | Starting balance, currency, risk limits, max trades |
| `trading_rules` | Custom trading rules list |

### 2. Mock Data Empty করা

`mockData.ts` থেকে fake trades, psychology logs, daily PnL, account settings, rules সব **empty array/default values** দিয়ে replace হবে। শুধু `smcTagOptions`, `mistakeOptions`, `pairOptions`, `strategyOptions` থাকবে (এগুলো dropdown options, data না)।

### 3. Pages Update — Supabase থেকে Data Load/Save

| Page | পরিবর্তন |
|------|----------|
| **Index.tsx** (Dashboard) | Supabase থেকে trades, dailyPnL, psychLogs, settings fetch |
| **TradeJournal.tsx** | Supabase থেকে trades fetch |
| **Analytics.tsx** | Supabase থেকে trades ও dailyPnL fetch |
| **Psychology.tsx** | Supabase থেকে psychology_logs fetch, নতুন log save |
| **Settings.tsx** | Supabase থেকে settings ও rules load/save |
| **NewTrade.tsx** | Trade save করবে Supabase `trades` table এ (এখন কোথাও save হয় না) |

### 4. Empty State UI

Data না থাকলে প্রতিটা page এ সুন্দর empty state message দেখাবে — "No trades yet. Add your first trade!" ইত্যাদি।

## Files

| Action | File |
|--------|------|
| **Migration** | `trades`, `psychology_logs`, `account_settings`, `trading_rules` tables create with RLS |
| **Modify** | `src/data/mockData.ts` — empty arrays, শুধু dropdown options রাখবে |
| **Modify** | `src/pages/Index.tsx` — Supabase fetch |
| **Modify** | `src/pages/TradeJournal.tsx` — Supabase fetch |
| **Modify** | `src/pages/Analytics.tsx` — Supabase fetch |
| **Modify** | `src/pages/Psychology.tsx` — Supabase fetch + save |
| **Modify** | `src/pages/Settings.tsx` — Supabase load/save |
| **Modify** | `src/pages/NewTrade.tsx` — Supabase এ trade save |
| **Create** | `src/hooks/useTrades.ts` — shared hook for trades CRUD |
| **Create** | `src/hooks/useAccountSettings.ts` — settings load/save hook |

