import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type PreferencesMap = Record<string, any>;

interface PreferencesContextType {
  prefs: PreferencesMap;
  isLoaded: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  userId: string | null;
  getPref: <T>(key: string, defaultValue: T) => T;
  setPref: <T>(key: string, value: T) => void;
  resetAll: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const LS_CACHE_KEY = 'tradevault-preferences-cache';

function loadLocalCache(): PreferencesMap {
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveLocalCache(prefs: PreferencesMap) {
  try {
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(prefs));
  } catch {}
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<PreferencesMap>(() => loadLocalCache());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<PreferencesMap | null>(null);
  const lastWriteRef = useRef<number>(0);

  // Track auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Initial load from cloud + realtime subscription
  useEffect(() => {
    if (!userId) {
      setIsLoaded(true);
      return;
    }

    let cancelled = false;
    const localCache = loadLocalCache();

    (async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('preferences, updated_at')
          .eq('user_id', userId)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error('[Preferences] load error:', error);
        }

        if (data?.preferences && typeof data.preferences === 'object') {
          // Cloud has data — use it
          const cloudPrefs = data.preferences as PreferencesMap;
          setPrefs(cloudPrefs);
          saveLocalCache(cloudPrefs);
          setLastSyncedAt(new Date(data.updated_at));
        } else if (Object.keys(localCache).length > 0) {
          // No cloud data, but localCache exists → seed cloud
          const { error: upsertErr } = await supabase
            .from('user_preferences')
            .upsert({ user_id: userId, preferences: localCache }, { onConflict: 'user_id' });
          if (!upsertErr) {
            setLastSyncedAt(new Date());
          }
        }
      } catch (e) {
        console.error('[Preferences] load failed:', e);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();

    // Realtime subscription
    const channel = supabase
      .channel(`user_preferences:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_preferences', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newRow = payload.new as { preferences?: PreferencesMap; updated_at?: string } | null;
          if (!newRow?.preferences) return;
          // Ignore our own writes (within 2s of last local write)
          if (Date.now() - lastWriteRef.current < 2000) return;
          setPrefs(newRow.preferences);
          saveLocalCache(newRow.preferences);
          if (newRow.updated_at) setLastSyncedAt(new Date(newRow.updated_at));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Debounced cloud write
  const scheduleSync = useCallback((nextPrefs: PreferencesMap) => {
    pendingRef.current = nextPrefs;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!userId || !pendingRef.current) return;
      const payload = pendingRef.current;
      pendingRef.current = null;
      lastWriteRef.current = Date.now();
      setIsSyncing(true);
      try {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({ user_id: userId, preferences: payload }, { onConflict: 'user_id' });
        if (error) {
          console.error('[Preferences] sync error:', error);
        } else {
          setLastSyncedAt(new Date());
        }
      } catch (e) {
        console.error('[Preferences] sync failed:', e);
      } finally {
        setIsSyncing(false);
      }
    }, 600);
  }, [userId]);

  const getPref = useCallback(<T,>(key: string, defaultValue: T): T => {
    if (key in prefs) return prefs[key] as T;
    return defaultValue;
  }, [prefs]);

  const setPref = useCallback(<T,>(key: string, value: T) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value };
      saveLocalCache(next);
      scheduleSync(next);
      return next;
    });
  }, [scheduleSync]);

  const resetAll = useCallback(async () => {
    setPrefs({});
    saveLocalCache({});
    if (userId) {
      lastWriteRef.current = Date.now();
      await supabase
        .from('user_preferences')
        .upsert({ user_id: userId, preferences: {} }, { onConflict: 'user_id' });
      setLastSyncedAt(new Date());
    }
  }, [userId]);

  return (
    <PreferencesContext.Provider value={{ prefs, isLoaded, isSyncing, lastSyncedAt, userId, getPref, setPref, resetAll }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}

/**
 * Generic hook to read & write a single preference key, synced across devices.
 * Returns [value, setValue] tuple — like useState.
 */
export function useSyncedPreference<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const { getPref, setPref } = usePreferences();
  const value = getPref<T>(key, defaultValue);

  // Keep a ref to the latest value so functional updaters always see fresh state
  const valueRef = useRef(value);
  valueRef.current = value;

  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    const resolved = typeof next === 'function' ? (next as (prev: T) => T)(valueRef.current) : next;
    setPref(key, resolved);
  }, [key, setPref]);

  return [value, setValue];
}
