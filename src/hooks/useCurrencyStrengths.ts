import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type StrengthTier = 'STRONG' | 'MEDIUM_STRONG' | 'NEUTRAL' | 'MEDIUM_WEAK' | 'WEAK';

export interface CurrencyStrengthEntry {
  currency: string;
  strength: number; // -7..+7
  tier: StrengthTier;
  recordedAt: string;
  timeframe: string; // session/timeframe label (e.g. "New York", "London", "1H")
}

export interface StrengthSnapshot {
  data: Record<string, CurrencyStrengthEntry>;
  timeframe: string | null; // which session/timeframe the data came from
  recordedAt: string | null;
}

const MAJORS = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];

export function classifyStrength(score: number): StrengthTier {
  if (score >= 5) return 'STRONG';
  if (score >= 2) return 'MEDIUM_STRONG';
  if (score > -2) return 'NEUTRAL';
  if (score > -5) return 'MEDIUM_WEAK';
  return 'WEAK';
}

/**
 * Detect current trading session by UTC hour.
 * Matches the priority order used in app.
 */
export function detectCurrentSession(): string {
  const h = new Date().getUTCHours();
  if (h >= 15 && h < 17) return 'London Close';
  if (h >= 13 && h < 22) return 'New York';
  if (h >= 7 && h < 16) return 'London';
  return 'Asian';
}

let cache: { snapshot: StrengthSnapshot; ts: number } | null = null;
const TTL = 60_000; // 1 min cache
const subscribers = new Set<(s: StrengthSnapshot) => void>();

async function fetchLatestForTimeframe(tf: string) {
  // Pull the last few snapshots so we can skip any "all-zero" corrupted batch
  // and fall back to the most recent valid one.
  const { data: recent } = await supabase
    .from('currency_strength')
    .select('recorded_at')
    .eq('timeframe', tf)
    .order('recorded_at', { ascending: false })
    .limit(10);
  if (!recent || recent.length === 0) return null;

  const seen = new Set<string>();
  const uniqueStamps = recent
    .map((r) => r.recorded_at as string)
    .filter((ts) => (seen.has(ts) ? false : (seen.add(ts), true)));

  for (const stamp of uniqueStamps) {
    const { data } = await supabase
      .from('currency_strength')
      .select('currency, strength, recorded_at, timeframe')
      .eq('timeframe', tf)
      .eq('recorded_at', stamp);
    const rows = data || [];
    if (rows.length === 0) continue;
    // Reject corrupted batches where every strength is 0.
    const totalAbs = rows.reduce((sum, r) => sum + Math.abs(Number(r.strength) || 0), 0);
    if (totalAbs === 0) {
      console.warn(`[useCurrencyStrengths] Skipping zeroed snapshot for ${tf} @ ${stamp}`);
      continue;
    }
    return { rows, recordedAt: stamp };
  }
  return null;
}

async function fetchSnapshot(): Promise<StrengthSnapshot> {
  const currentSession = detectCurrentSession();
  // Try current session first, then fallback chain
  const fallback = [currentSession, 'New York', 'London', '1H', 'Asian', 'London Close'];
  const tried = new Set<string>();

  for (const tf of fallback) {
    if (tried.has(tf)) continue;
    tried.add(tf);
    const result = await fetchLatestForTimeframe(tf);
    if (!result || result.rows.length === 0) continue;
    // Only accept if recent (within 24h) for current session; otherwise still ok as fallback
    const ageMs = Date.now() - new Date(result.recordedAt).getTime();
    const isCurrent = tf === currentSession;
    if (isCurrent && ageMs > 24 * 3600_000) continue; // current session but stale, try fallback
    const map: Record<string, CurrencyStrengthEntry> = {};
    for (const row of result.rows) {
      if (!MAJORS.includes(row.currency)) continue;
      map[row.currency] = {
        currency: row.currency,
        strength: row.strength,
        tier: classifyStrength(row.strength),
        recordedAt: row.recorded_at,
        timeframe: row.timeframe,
      };
    }
    if (Object.keys(map).length > 0) {
      return { data: map, timeframe: tf, recordedAt: result.recordedAt };
    }
  }
  return { data: {}, timeframe: null, recordedAt: null };
}

async function refresh() {
  const snap = await fetchSnapshot();
  cache = { snapshot: snap, ts: Date.now() };
  subscribers.forEach((cb) => cb(snap));
}

const EMPTY: StrengthSnapshot = { data: {}, timeframe: null, recordedAt: null };

/**
 * Returns latest strength snapshot — prefers data from the currently-running session.
 * Cached for 60s, shared across components.
 */
export function useStrengthSnapshot(): StrengthSnapshot {
  const [snap, setSnap] = useState<StrengthSnapshot>(cache?.snapshot || EMPTY);

  useEffect(() => {
    const cb = (s: StrengthSnapshot) => setSnap(s);
    subscribers.add(cb);
    if (!cache || Date.now() - cache.ts > TTL) {
      refresh();
    } else {
      setSnap(cache.snapshot);
    }
    return () => {
      subscribers.delete(cb);
    };
  }, []);

  return snap;
}

/** Backwards-compatible: just the map of currency -> entry. */
export function useCurrencyStrengths(): Record<string, CurrencyStrengthEntry> {
  return useStrengthSnapshot().data;
}

export function useCurrencyStrength(currency: string): CurrencyStrengthEntry | undefined {
  const all = useCurrencyStrengths();
  return all[currency];
}
