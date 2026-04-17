import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

interface ApiKey {
  id: string;
  api_key: string;
  label: string;
  calls_today: number;
  daily_limit: number;
  priority: number;
}

function getSupabaseAdmin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

export async function getNextKey(provider: string, sb?: SupabaseClient): Promise<ApiKey | null> {
  const supabase = sb || getSupabaseAdmin();
  const { data, error } = await supabase
    .from("api_key_pool")
    .select("id, api_key, label, calls_today, daily_limit, priority")
    .eq("provider", provider)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (error || !data || data.length === 0) return null;

  // Find first key with remaining credits
  for (const key of data) {
    if (key.calls_today < key.daily_limit) return key;
  }
  return null; // All exhausted
}

export async function markKeyUsed(keyId: string, sb?: SupabaseClient): Promise<void> {
  const supabase = sb || getSupabaseAdmin();
  // Increment calls_today by 1 via rpc or direct update
  const { data } = await supabase
    .from("api_key_pool")
    .select("calls_today")
    .eq("id", keyId)
    .single();

  if (data) {
    await supabase
      .from("api_key_pool")
      .update({ calls_today: data.calls_today + 1, last_used_at: new Date().toISOString() })
      .eq("id", keyId);
  }
}

export async function markKeyFailed(keyId: string, sb?: SupabaseClient): Promise<void> {
  const supabase = sb || getSupabaseAdmin();
  await supabase
    .from("api_key_pool")
    .update({ last_error_at: new Date().toISOString() })
    .eq("id", keyId);
}

// Track per-minute exhaustion in-memory per function instance
const perMinuteExhausted = new Map<string, number>(); // keyId -> timestamp ms

/**
 * Internal: try the keys once. Returns Response on success, or null when all keys
 * are temporarily blocked by per-minute limits (so caller can wait + retry).
 * Throws only on hard daily exhaustion with no fallback.
 */
async function tryKeysOnce(
  urlTemplate: string,
  provider: string,
  supabase: SupabaseClient
): Promise<Response | null> {
  const { data: allKeys } = await supabase
    .from("api_key_pool")
    .select("id, api_key, label, calls_today, daily_limit, priority")
    .eq("provider", provider)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  const now = Date.now();
  // Filter out daily-exhausted keys AND keys we know hit per-minute limit < 65s ago
  const keys = (allKeys || []).filter((k: ApiKey) => {
    if (k.calls_today >= k.daily_limit) return false;
    const blockedUntil = perMinuteExhausted.get(k.id);
    if (blockedUntil && now - blockedUntil < 65_000) return false;
    return true;
  });

  if (keys.length === 0) return null; // signal caller to wait

  for (const key of keys) {
    const url = urlTemplate.replace("__API_KEY__", key.api_key);
    const resp = await fetch(url);

    if (resp.status === 429) {
      console.log(`Key "${key.label}" got 429, marking per-minute exhausted`);
      perMinuteExhausted.set(key.id, Date.now());
      await markKeyFailed(key.id, supabase);
      continue;
    }

    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const cloned = resp.clone();
      try {
        const json = await cloned.json();
        if (json.code === 429 || (json.status === "error" && json.message?.includes("API credits"))) {
          const isPerMinute = json.message?.includes("current minute");
          const isPerDay = json.message?.includes("for the day");

          if (isPerDay) {
            console.log(`Key "${key.label}" DAILY exhausted: ${json.message}`);
            await markKeyFailed(key.id, supabase);
            await supabase.from("api_key_pool").update({ calls_today: key.daily_limit }).eq("id", key.id);
          } else if (isPerMinute) {
            console.log(`Key "${key.label}" per-minute limit, will retry in 60s`);
            perMinuteExhausted.set(key.id, Date.now());
            await markKeyFailed(key.id, supabase);
          } else {
            console.log(`Key "${key.label}" unknown credit error, treating as daily: ${json.message}`);
            await markKeyFailed(key.id, supabase);
            await supabase.from("api_key_pool").update({ calls_today: key.daily_limit }).eq("id", key.id);
          }
          continue;
        }
      } catch { /* not json */ }
    }

    await markKeyUsed(key.id, supabase);
    return resp;
  }

  return null; // every key failed — let caller retry
}

/**
 * Fetch a URL using API key rotation, with automatic wait+retry when ALL keys
 * are temporarily blocked by per-minute rate limits.
 * - URL must contain `__API_KEY__` placeholder.
 * - Falls back to TWELVEDATA_API_KEY env var if no pool keys exist at all.
 */
export async function fetchWithRotation(
  urlTemplate: string,
  provider: string = "twelvedata",
  sb?: SupabaseClient,
  options: { maxWaitMs?: number; waitChunkMs?: number } = {}
): Promise<Response> {
  const supabase = sb || getSupabaseAdmin();
  const maxWaitMs = options.maxWaitMs ?? 75_000; // up to ~75s of waiting in total
  const waitChunkMs = options.waitChunkMs ?? 15_000;

  // First try
  let resp = await tryKeysOnce(urlTemplate, provider, supabase);
  if (resp) return resp;

  // Check if there are ANY pool keys at all (with daily quota left)
  const { data: anyKeys } = await supabase
    .from("api_key_pool")
    .select("id, calls_today, daily_limit")
    .eq("provider", provider)
    .eq("is_active", true);
  const anyDailyLeft = (anyKeys || []).some((k: any) => k.calls_today < k.daily_limit);

  if (!anyDailyLeft) {
    // No daily quota anywhere — try env fallback
    const envKey = Deno.env.get("TWELVEDATA_API_KEY");
    if (envKey) {
      console.log("All pool keys daily-exhausted, using env fallback");
      return await fetch(urlTemplate.replace("__API_KEY__", envKey));
    }
    return new Response(
      JSON.stringify({ error: "SERVICE_UNAVAILABLE", fallback: true, message: "All API keys daily-exhausted" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // We have daily quota — keys are just per-minute blocked. Wait and retry.
  let waited = 0;
  while (waited < maxWaitMs) {
    const sleep = Math.min(waitChunkMs, maxWaitMs - waited);
    console.log(`All keys per-minute blocked, waiting ${sleep}ms before retry...`);
    await new Promise(r => setTimeout(r, sleep));
    waited += sleep;

    resp = await tryKeysOnce(urlTemplate, provider, supabase);
    if (resp) return resp;
  }

  // Final fallback after waiting
  const envKey = Deno.env.get("TWELVEDATA_API_KEY");
  if (envKey) {
    console.log("Wait timeout, using env fallback");
    return await fetch(urlTemplate.replace("__API_KEY__", envKey));
  }

  return new Response(
    JSON.stringify({
      error: "SERVICE_UNAVAILABLE",
      fallback: true,
      message: "All API keys per-minute blocked after wait, no env fallback"
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
