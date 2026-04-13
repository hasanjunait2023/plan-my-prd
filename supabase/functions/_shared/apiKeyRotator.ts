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

/**
 * Fetch a URL using API key rotation. Replaces the API key placeholder in the URL.
 * The URL should contain the placeholder `__API_KEY__` where the key should go.
 * If no keys in pool, falls back to TWELVEDATA_API_KEY env var.
 */
export async function fetchWithRotation(
  urlTemplate: string,
  provider: string = "twelvedata",
  sb?: SupabaseClient
): Promise<Response> {
  const supabase = sb || getSupabaseAdmin();

  // Try keys from pool
  const { data: allKeys } = await supabase
    .from("api_key_pool")
    .select("id, api_key, label, calls_today, daily_limit, priority")
    .eq("provider", provider)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  const keys = (allKeys || []).filter((k: ApiKey) => k.calls_today < k.daily_limit);

  // Fallback to env var if no pool keys
  if (keys.length === 0) {
    const envKey = Deno.env.get("TWELVEDATA_API_KEY");
    if (!envKey) throw new Error("All API credits exhausted and no fallback key available");
    console.log("No pool keys available, using env fallback");
    const url = urlTemplate.replace("__API_KEY__", envKey);
    return await fetch(url);
  }

  for (const key of keys) {
    const url = urlTemplate.replace("__API_KEY__", key.api_key);
    const resp = await fetch(url);

    // Check for rate limit
    if (resp.status === 429) {
      console.log(`Key "${key.label}" (priority ${key.priority}) got 429, switching...`);
      await markKeyFailed(key.id, supabase);
      // Mark as fully used so it won't be picked again today
      await supabase
        .from("api_key_pool")
        .update({ calls_today: key.daily_limit })
        .eq("id", key.id);
      continue;
    }

    // Check for TwelveData JSON error about credits
    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const cloned = resp.clone();
      try {
        const json = await cloned.json();
        if (json.code === 429 || (json.status === "error" && json.message?.includes("API credits"))) {
          console.log(`Key "${key.label}" credits exhausted: ${json.message}`);
          await markKeyFailed(key.id, supabase);
          await supabase
            .from("api_key_pool")
            .update({ calls_today: key.daily_limit })
            .eq("id", key.id);
          continue;
        }
      } catch { /* not json, continue */ }
    }

    // Success — mark usage
    await markKeyUsed(key.id, supabase);
    return resp;
  }

  throw new Error("All API keys exhausted for today");
}
