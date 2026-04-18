import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { findWatchlistItem, type WatchlistItem } from '@/lib/watchlistData';
import { useSyncedPreference } from './PreferencesContext';

interface FloatingWatchlistContextValue {
  watchlistOpen: boolean;
  chartItem: WatchlistItem | null;
  lastPair: string | null;
  openWatchlist: () => void;
  closeWatchlist: () => void;
  openChart: (symbol: string) => void;
  closeChart: () => void;
  closeAll: () => void;
}

const Ctx = createContext<FloatingWatchlistContextValue | null>(null);

export function FloatingWatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [chartItem, setChartItem] = useState<WatchlistItem | null>(null);
  // Last opened pair — synced across devices so user can resume on another device
  const [lastPair, setLastPair] = useSyncedPreference<string | null>('watchlist.lastPair', null);

  const openWatchlist = useCallback(() => setWatchlistOpen(true), []);
  const closeWatchlist = useCallback(() => setWatchlistOpen(false), []);

  const openChart = useCallback((symbol: string) => {
    const item = findWatchlistItem(symbol);
    if (item) {
      setChartItem(item);
      setLastPair(symbol);
      setWatchlistOpen(false);
    }
  }, [setLastPair]);

  const closeChart = useCallback(() => setChartItem(null), []);
  const closeAll = useCallback(() => {
    setChartItem(null);
    setWatchlistOpen(false);
  }, []);

  return (
    <Ctx.Provider
      value={{ watchlistOpen, chartItem, lastPair, openWatchlist, closeWatchlist, openChart, closeChart, closeAll }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useFloatingWatchlist() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFloatingWatchlist must be used inside FloatingWatchlistProvider');
  return ctx;
}
