

## User Goal
যেকোনো user যেই device থেকেই login করুক — তার সব **personalization settings** (nav config, theme, notification preferences, watchlist, layout choices ইত্যাদি) সব device-এ **same** থাকবে। এখন এগুলো `localStorage`-এ আছে, যেটা device-specific। এটা **cloud-synced** করতে হবে।

## Current State Analysis

`localStorage` use করা key গুলো (device-locked, sync হয় না):
- `tradevault-nav-config` — navbar primary items + max counts
- `fab-position` — floating button position
- Theme (ThemeContext)
- Watchlist data (`src/lib/watchlistData.ts`)
- Notification preferences (push subscription, telegram toggles)
- Various dialog states, last-opened pairs, filter selections

ইতিমধ্যে cloud-synced (Supabase-এ): trades, habits, mind thoughts, psychology logs, trading rules, account settings।

## Solution: `user_preferences` Table + Generic Sync Hook

একটা single JSON-based table বানাবো যেটা সব kind-এর preference store করবে — future-proof, কোনো নতুন setting add করতে migration লাগবে না।

### Architecture

```text
┌─────────────────────────────────────────────────┐
│  Device A (Mobile)   ←→   Supabase   ←→   Device B (Desktop)
│                                                 │
│  useSyncedPreference('nav-config', default)    │
│         ↓                                       │
│  localStorage (instant cache)                   │
│         ↓                                       │
│  user_preferences table (source of truth)       │
│         ↓                                       │
│  Realtime subscription → other devices update   │
└─────────────────────────────────────────────────┘
```

### Database Schema

```sql
CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_preferences;
ALTER TABLE public.user_preferences REPLICA IDENTITY FULL;
```

`preferences` JSON structure example:
```json
{
  "nav": { "primaryUrls": [...], "maxMobile": 5, "maxDesktop": 6 },
  "theme": "dark",
  "fab": { "position": { "x": 320, "y": 600 } },
  "watchlist": { "pairs": [...] },
  "notifications": { "telegramSession": true, "pushEnabled": false },
  "filters": { "lastTimeframe": "H1" }
}
```

### Core Hook: `useSyncedPreference`

```text
useSyncedPreference<T>(key: string, defaultValue: T)
  → returns [value, setValue]
  
- On mount: read localStorage instantly (no flash) → fetch from Supabase → reconcile
- On setValue: update local state + localStorage + debounced upsert to Supabase
- Realtime: listen to user_preferences changes → update if other device wrote newer value
- Conflict resolution: last-write-wins by updated_at timestamp
- Offline support: queue writes, flush on reconnect
```

## Implementation Steps

### 1. Database
- Migration: create `user_preferences` table, RLS policy, realtime enable

### 2. Core sync infrastructure
- `src/hooks/useSyncedPreference.ts` — generic hook (localStorage cache + Supabase sync + realtime)
- `src/contexts/PreferencesContext.tsx` — single shared subscription per user (avoid N realtime channels), exposes get/set for any key
- One-time **migration utility**: on first login after this update, read existing `localStorage` keys → upload to Supabase → mark migrated

### 3. Refactor existing localStorage usages
| File | Key | Status |
|------|-----|--------|
| `useNavConfig.ts` | `tradevault-nav-config` | migrate to `nav` |
| `FloatingAssistiveButton.tsx` | `fab-position` | migrate to `fab.position` |
| `ThemeContext.tsx` | theme key | migrate to `theme` |
| `watchlistData.ts` | watchlist | migrate to `watchlist` |
| Notification toggles in Settings | various | migrate to `notifications.*` |

Each file: replace `useState(loadFromLS)` + `localStorage.setItem` with `useSyncedPreference('xxx', default)`.

### 4. Settings page indicator
- Settings page-এ ছোট indicator: "✓ Synced across devices" + last-sync timestamp
- "Reset all preferences" button (clears both cloud + local)

### 5. Edge cases handled
- **Anonymous users**: fallback to localStorage-only (no sync)
- **First device after migration**: localStorage seeds cloud
- **Conflicting writes** (mobile + desktop simultaneously): last-write-wins, realtime updates loser
- **Offline**: writes queued in localStorage, sync on reconnect
- **No flash**: localStorage read first (synchronous), cloud reconcile after

## What's NOT included (per-device intentionally)

কিছু জিনিস device-specific থাকা উচিত — sync করবো না:
- Push notification subscription endpoint (each device has unique browser endpoint)
- "Install PWA" prompt dismissal
- Service worker version

## Files to Create/Modify

**New:**
- `supabase/migrations/<timestamp>_user_preferences.sql`
- `src/hooks/useSyncedPreference.ts`
- `src/contexts/PreferencesContext.tsx`
- `src/lib/preferencesMigration.ts`

**Modified (replace localStorage with synced hook):**
- `src/hooks/useNavConfig.ts`
- `src/components/floating/FloatingAssistiveButton.tsx`
- `src/contexts/ThemeContext.tsx`
- `src/lib/watchlistData.ts`
- `src/pages/Settings.tsx` (add sync indicator + use synced notification toggles)
- `src/App.tsx` (wrap with `PreferencesProvider`)

## Result

Mobile-এ navbar reorder করলে → 1-2 second-এর মধ্যে desktop-এও same order দেখাবে। Theme switch → instant sync। Watchlist add → both devices update। সব personalization truly **account-bound**, device-bound না।

