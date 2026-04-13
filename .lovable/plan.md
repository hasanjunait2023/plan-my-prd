

## Plan: Multi-API Key Rotation System — TwelveData Credit শেষ হলে Auto-Switch

### সমস্যা
TwelveData free plan এ দৈনিক 800 credit limit আছে। একটা key দিয়ে সব edge function চালালে credit দ্রুত শেষ হয়ে 429 error আসে।

### সমাধান
একটা shared utility module বানাবো যেখানে 3-4টা API key store থাকবে। কোনো key 429 দিলে automatically পরের key তে switch করবে।

### Architecture

```text
Edge Function call
      │
      ▼
getApiKey() ← Supabase table: api_key_pool
      │
      ├─ Key #1 (active, 750/800 used) → try this first
      │     ↓ 429 error?
      ├─ Key #2 (standby, 0/800 used) → switch to this
      │     ↓ 429 error?
      ├─ Key #3 (standby, 0/800 used) → switch to this
      │     ↓ 429 error?
      └─ All exhausted → return error "All API credits used"
```

### যা যা করা হবে

**1. Database table: `api_key_pool`**
- `id`, `provider` (e.g. "twelvedata"), `api_key` (encrypted text), `label` (e.g. "Key 1 - Free"), `is_active` (bool), `calls_today` (int), `daily_limit` (int), `last_used_at`, `last_error_at`, `priority` (int — lower = try first), `created_at`
- RLS: service_role only (keys are secrets)
- Daily reset: `calls_today` কে midnight UTC তে 0 করবে একটা cron job দিয়ে

**2. Shared utility: `supabase/functions/_shared/apiKeyRotator.ts`**
- `getNextKey(provider: string, supabase)` — priority order এ key নেবে, `calls_today < daily_limit` এবং `is_active = true` চেক করবে
- `markKeyUsed(keyId, supabase)` — `calls_today++` করবে
- `markKeyFailed(keyId, supabase)` — `last_error_at` set করবে, temporarily skip করবে
- `fetchWithRotation(url, provider, supabase)` — auto-retry with next key on 429

**3. সব edge function update করবো** — 6টা function এ `TWELVEDATA_API_KEY` এর বদলে `fetchWithRotation()` ব্যবহার করবে:
- `fetch-adr`
- `supply-demand-zones`
- `scan-ema-alignment`
- `price-spike-detector`
- `volume-spike-scanner`
- `ny-session-breaks`

**4. Cron job: daily credit reset**
- প্রতিদিন UTC 00:00 তে `UPDATE api_key_pool SET calls_today = 0`

**5. UI: Settings পেজে API Key Management section**
- Key যোগ/বাদ দেওয়া যাবে
- প্রতিটা key এর usage দেখাবে (calls_today / daily_limit)
- কোন key active, কোনটা exhausted — status দেখাবে

### কিভাবে Key যোগ করবে
তুমি TwelveData তে 3-4টা free account বানাবে, প্রতিটা থেকে API key নেবে, Settings পেজ থেকে add করবে। System automatically rotate করবে।

### Files

| File | Action |
|------|--------|
| Migration SQL | Create `api_key_pool` table + cron job |
| `supabase/functions/_shared/apiKeyRotator.ts` | Create — shared rotation logic |
| 6 edge functions | Edit — use `fetchWithRotation()` |
| `src/pages/Settings.tsx` | Edit — API Key management UI section |
| Edge function: `manage-api-keys` | Create — CRUD for keys (insert/update/delete) |

