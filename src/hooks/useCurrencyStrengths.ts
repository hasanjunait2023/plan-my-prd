import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  MARKET_SESSIONS,
  getSessionHours,
  isSessionActive,
  isForexClosed,
} from '@/lib/timezone';

export type StrengthTier = 'STRONG' | 'MEDIUM_STRONG' | 'NEUTRAL' | 'MEDIUM_WEAK' | 'WEAK';

export interface CurrencyStrengthEntry {
  currency: string;
  strength: number; // -7..+7
  tier: StrengthTier;
  recordedAt: string;
  timeframe: string;
}

export interface StrengthSnapshot {
  data: Record<string, CurrencyStrengthEntry>;
  timeframe: string | null;   // raw DB label (e.g. "1H", "New York", "Asian")
  sessionLabel: string | null; // friendly UI label (e.g. "London", "London/NY Overlap")
  recordedAt: string | null;
  isStale: boolean;            // true if data older than 24h
}

const MAJORS = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];

export function classifyStrength(score: number): StrengthTier {
  if (score >= 5) return 'STRONG';
  if (score >= 2) return 'MEDIUM_STRONG';
  if (score > -2) return 'NEUTRAL';
  if (score > -5) return 'MEDIUM_WEAK';
  return 'WEAK';
}

interface SessionRouting {
  dbTimeframe: string;     // primary DB label to query
  displayLabel: string;    // friendly UI label
  fallbacks: string[];     // ordered fallback DB labels
}

/**
 * Detect currently-running session (DST-aware) and map to scanner DB labels.
 * Scanner stores: London → "1H", Tokyo/Sydney → "Asian", New York → "New York".
 */
export function detectCurrentSession(now: Date = new Date()): SessionRouting {
  if (isForexClosed(now)) {
    // Weekend / holiday — try last seen of any session
    return { dbTimeframe: '1H', displayLabel: 'Market Closed', fallbacks: ['New York', 'Asian'] };
  }

  const h = now.getUTCHours();
  const m = now.getUTCMinutes();

  const active = MARKET_SESSIONS.filter((s) => {
    const hrs = getSessionHours(s, now);
    return isSessionActive(hrs.start, hrs.end, h, m);
  });

  const has = (name: string) => active.some((s) => s.name === name);
  const londonActive = has('London');
  const nyActive = has('New York');
  const tokyoActive = has('Tokyo');
  const sydneyActive = has('Sydney');

  // London + NY overlap → London momentum still primary
  if (londonActive && nyActive) {
    return {
      dbTimeframe: '1H',
      displayLabel: 'London/NY Overlap',
      fallbacks: ['New York', 'Asian'],
    };
  }
  if (londonActive) {
    return { dbTimeframe: '1H', displayLabel: 'London', fallbacks: ['New York', 'Asian'] };
  }
  if (nyActive) {
    return { dbTimeframe: 'New York', displayLabel: 'New York', fallbacks: ['1H', 'Asian'] };
  }
  if (tokyoActive || sydneyActive) {
    const label = tokyoActive && sydneyActive ? 'Tokyo/Sydney' : tokyoActive ? 'Tokyo' : 'Sydney';
    return { dbTimeframe: 'Asian', displayLabel: label, fallbacks: ['1H', 'New York'] };
  }
  // Gap (rare) — default to most recent global
  return { dbTimeframe: '1H', displayLabel: 'Off-Session', fallbacks: ['New York', 'Asian'] };
}

const TTL_MS = 60_000;
const STALE_MS = 24 * 3600_000;        // 24h hard staleness for in-session data
const WEEKEND_GRACE_MS = 7 * 24 * 3600_000; // allow up to 7d during weekend/holiday

let cache: { snapshot: StrengthSnapshot; ts: number; routingKey: string } | null = null;
const subscribers = new Set<(s: StrengthSnapshot) => void>();
let inflight: Promise<void> | null = null;

async function fetchLatestForTimeframe(tf: string) {
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
    const totalAbs = rows.reduce((sum, r) => sum + Math.abs(Number(r.strength) || 0), 0);
    if (totalAbs === 0) {
      console.warn(`[useCurrencyStrengths] Skipping zeroed snapshot for ${tf} @ ${stamp}`);
      continue;
    }
    return { rows, recordedAt: stamp };
  }
  return null;
}

function rowsToMap(rows: Array<{ currency: string; strength: number; recorded_at: string; timeframe: string }>) {
  const map: Record<string, CurrencyStrengthEntry> = {};
  for (const row of rows) {
    if (!MAJORS.includes(row.currency)) continue;
    map[row.currency] = {
      currency: row.currency,
      strength: row.strength,
      tier: classifyStrength(row.strength),
      recordedAt: row.recorded_at,
      timeframe: row.timeframe,
    };
  }
  return map;
}

async function fetchSnapshot(): Promise<StrengthSnapshot> {
  const now = new Date();
  const routing = detectCurrentSession(now);
  const marketClosed = isForexClosed(now);
  const maxAge = marketClosed ? WEEKEND_GRACE_MS : STALE_MS;

  // Try primary first, then fallbacks — only accept if within staleness window
  const chain = [routing.dbTimeframe, ...routing.fallbacks];
  const tried = new Set<string>();

  let bestStale: { snapshot: StrengthSnapshot } | null = null;

  for (const tf of chain) {
    if (tried.has(tf)) continue;
    tried.add(tf);
    const result = await fetchLatestForTimeframe(tf);
    if (!result || result.rows.length === 0) continue;

    const ageMs = Date.now() - new Date(result.recordedAt).getTime();
    const map = rowsToMap(result.rows);
    if (Object.keys(map).length === 0) continue;

    const isPrimary = tf === routing.dbTimeframe;
    const snap: StrengthSnapshot = {
      data: map,
      timeframe: tf,
      sessionLabel: isPrimary ? routing.displayLabel : `${routing.displayLabel} (last seen: ${tf})`,
      recordedAt: result.recordedAt,
      isStale: ageMs > STALE_MS,
    };

    if (ageMs <= maxAge) {
      return snap;
    }
    // Outside grace window — keep as last resort
    if (!bestStale) bestStale = { snapshot: { ...snap, isStale: true } };
  }

  if (bestStale) return bestStale.snapshot;
  return { data: {}, timeframe: null, sessionLabel: routing.displayLabel, recordedAt: null, isStale: false };
}

async function refresh() {
  if (inflight) return inflight;
  inflight = (async () => {
    const snap = await fetchSnapshot();
    const routing = detectCurrentSession();
    cache = { snapshot: snap, ts: Date.now(), routingKey: routing.dbTimeframe };
    subscribers.forEach((cb) => cb(snap));
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

const EMPTY: StrengthSnapshot = {
  data: {},
  timeframe: null,
  sessionLabel: null,
  recordedAt: null,
  isStale: false,
};

/**
 * Returns latest strength snapshot — prefers data from the currently-running session.
 * Cached for 60s, invalidated automatically when session boundary crosses.
 */
export function useStrengthSnapshot(): StrengthSnapshot {
  const [snap, setSnap] = useState<StrengthSnapshot>(cache?.snapshot || EMPTY);
  const sessionCheckRef = useRef<number | null>(null);

  useEffect(() => {
    const cb = (s: StrengthSnapshot) => setSnap(s);
    subscribers.add(cb);

    const ensureFresh = () => {
      const routing = detectCurrentSession();
      const sessionChanged = cache && cache.routingKey !== routing.dbTimeframe;
      const expired = !cache || Date.now() - cache.ts > TTL_MS;
      if (sessionChanged || expired) {
        refresh();
      } else {
        setSnap(cache!.snapshot);
      }
    };

    ensureFresh();

    // Re-check every minute for session boundary crossings
    sessionCheckRef.current = window.setInterval(ensureFresh, 60_000);

    const onVis = () => {
      if (document.visibilityState === 'visible') ensureFresh();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      subscribers.delete(cb);
      if (sessionCheckRef.current) clearInterval(sessionCheckRef.current);
      document.removeEventListener('visibilitychange', onVis);
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
