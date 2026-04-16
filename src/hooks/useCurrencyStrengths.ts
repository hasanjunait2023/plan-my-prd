import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type StrengthTier = 'STRONG' | 'MEDIUM_STRONG' | 'NEUTRAL' | 'MEDIUM_WEAK' | 'WEAK';

export interface CurrencyStrengthEntry {
  currency: string;
  strength: number; // -7..+7
  tier: StrengthTier;
  recordedAt: string;
}

const MAJORS = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];

export function classifyStrength(score: number): StrengthTier {
  if (score >= 5) return 'STRONG';
  if (score >= 2) return 'MEDIUM_STRONG';
  if (score > -2) return 'NEUTRAL';
  if (score > -5) return 'MEDIUM_WEAK';
  return 'WEAK';
}

let cache: { data: Record<string, CurrencyStrengthEntry>; ts: number } | null = null;
const TTL = 60_000; // 1 min cache
const subscribers = new Set<(d: Record<string, CurrencyStrengthEntry>) => void>();

async function fetchLatestStrength(): Promise<Record<string, CurrencyStrengthEntry>> {
  // Get the most recent batch
  const { data: latest } = await supabase
    .from('currency_strength')
    .select('recorded_at')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) return {};

  const { data } = await supabase
    .from('currency_strength')
    .select('currency, strength, recorded_at')
    .eq('recorded_at', latest.recorded_at);

  const map: Record<string, CurrencyStrengthEntry> = {};
  for (const row of data || []) {
    if (!MAJORS.includes(row.currency)) continue;
    map[row.currency] = {
      currency: row.currency,
      strength: row.strength,
      tier: classifyStrength(row.strength),
      recordedAt: row.recorded_at,
    };
  }
  return map;
}

async function refresh() {
  const data = await fetchLatestStrength();
  cache = { data, ts: Date.now() };
  subscribers.forEach((cb) => cb(data));
}

/**
 * Returns a map of currency -> strength entry (latest snapshot, all 8 majors).
 * Cached for 60s, shared across components.
 */
export function useCurrencyStrengths() {
  const [strengths, setStrengths] = useState<Record<string, CurrencyStrengthEntry>>(
    cache?.data || {}
  );

  useEffect(() => {
    const cb = (d: Record<string, CurrencyStrengthEntry>) => setStrengths(d);
    subscribers.add(cb);

    // Initial fetch if no cache or stale
    if (!cache || Date.now() - cache.ts > TTL) {
      refresh();
    } else {
      setStrengths(cache.data);
    }

    return () => {
      subscribers.delete(cb);
    };
  }, []);

  return strengths;
}

/**
 * Get strength for a single currency (synchronous from cache; returns undefined if not loaded).
 */
export function useCurrencyStrength(currency: string): CurrencyStrengthEntry | undefined {
  const all = useCurrencyStrengths();
  return all[currency];
}
