import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { findWatchlistItem, type WatchlistItem } from '@/lib/watchlistData';

interface FloatingWatchlistContextValue {
  watchlistOpen: boolean;
  chartItem: WatchlistItem | null;
  openWatchlist: () => void;
  closeWatchlist: () => void;
  openChart: (symbol: string) => void;
  closeChart: () => void;
  closeAll: () => void;
}

const Ctx = createContext<FloatingWatchlistContextValue | null>(null);

const LAST_PAIR_KEY = 'fw-last-pair';

export function FloatingWatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [chartItem, setChartItem] = useState<WatchlistItem | null>(null);

  const openWatchlist = useCallback(() => setWatchlistOpen(true), []);
  const closeWatchlist = useCallback(() => setWatchlistOpen(false), []);

  const openChart = useCallback((symbol: string) => {
    const item = findWatchlistItem(symbol);
    if (item) {
      setChartItem(item);
      try { localStorage.setItem(LAST_PAIR_KEY, symbol); } catch {}
      setWatchlistOpen(false);
    }
  }, []);

  const closeChart = useCallback(() => setChartItem(null), []);
  const closeAll = useCallback(() => {
    setChartItem(null);
    setWatchlistOpen(false);
  }, []);

  return (
    <Ctx.Provider
      value={{ watchlistOpen, chartItem, openWatchlist, closeWatchlist, openChart, closeChart, closeAll }}
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
