

# Authentication — সব Route এ Login বাধ্যতামূলক

## পরিবর্তন (আগের plan থেকে)

আগের plan এ কিছু route public ছিল (Currency Strength, EMA Scanner, Charts, etc.)। এখন **সব route এই login বাধ্যতামূলক**। Login ছাড়া কিছুই access করা যাবে না। Login করার পরে shared data (currency strength, EMA, charts) সবাই একই দেখবে, আর personal data (trades, journal, analytics, psychology, settings) user-specific থাকবে।

## Architecture

```text
Login না করলে → /auth page (Login/Signup)
Login করলে → সব কিছু access:
  ├── Shared data (সবার একই): Currency Strength, EMA, Charts, Commodities, Crypto, Correlation, Trade Intelligence, MT5
  └── Personal data (user-specific): Dashboard, Journal, New Trade, Analytics, Psychology, Settings
```

## Implementation

### Step 1: DB Migration — `user_id` column যোগ

Personal tables এ `user_id uuid REFERENCES auth.users(id)` যোগ:
- `trades`, `psychology_logs`, `account_settings`, `trading_rules`

পুরাতন RLS policies drop → নতুন policies:
- Personal tables: `auth.uid() = user_id` (নিজের data only)
- Shared tables (currency_strength, ema_alignments, etc.): `auth.uid() IS NOT NULL` (logged in হলেই দেখবে)

### Step 2: Auth Page — `/auth`

- `src/pages/Auth.tsx` — Email + Password login/signup form
- Dark theme, project branding

### Step 3: Auth Hook

- `src/hooks/useAuth.ts` — `onAuthStateChange` + `getSession`, login/signup/logout functions

### Step 4: সব Route Protect করা

- `src/components/ProtectedRoute.tsx` — logged in না থাকলে `/auth` redirect
- `App.tsx` এ **সব route** (Dashboard, Journal, Strength, EMA, Charts — সব) `ProtectedRoute` দিয়ে wrap হবে
- শুধু `/auth` route unprotected থাকবে

### Step 5: Hooks Update — `user_id` filter

- `useTrades.ts`, `usePsychologyLogs.ts`, `useAccountSettings.ts`, `useTradingRules.ts` — insert এ `user_id: session.user.id` পাঠাবে

### Step 6: Layout Update

- User avatar/email দেখাবে
- Logout button functional

## Files

| Action | File |
|--------|------|
| **Migration** | `user_id` add to personal tables + RLS update (personal + shared) |
| **Create** | `src/pages/Auth.tsx` |
| **Create** | `src/hooks/useAuth.ts` |
| **Create** | `src/components/ProtectedRoute.tsx` |
| **Modify** | `src/App.tsx` — Auth route + সব route ProtectedRoute wrap |
| **Modify** | `src/hooks/useTrades.ts` — `user_id` insert |
| **Modify** | `src/hooks/usePsychologyLogs.ts` — `user_id` insert |
| **Modify** | `src/hooks/useAccountSettings.ts` — `user_id` insert |
| **Modify** | `src/hooks/useTradingRules.ts` — `user_id` insert |
| **Modify** | `src/components/Layout.tsx` — user info, logout |

