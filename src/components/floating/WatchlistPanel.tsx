import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Search, X, Activity } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFloatingWatchlist } from '@/contexts/FloatingWatchlistContext';
import {
  WATCHLIST,
  WATCHLIST_CATEGORIES,
  type WatchlistCategory,
  type WatchlistItem,
} from '@/lib/watchlistData';
import { cn } from '@/lib/utils';
import { useStrengthSnapshot } from '@/hooks/useCurrencyStrengths';
import { PairBiasRow } from './PairBiasRow';
import { BiasFilterBar, type BiasFilter, type SortMode } from '@/components/correlation/BiasFilterBar';
import { calculateBias } from '@/lib/biasCalculator';
import { Button } from '@/components/ui/button';

type TabKey = WatchlistCategory | 'ALL';

export function WatchlistPanel() {
  const isMobile = useIsMobile();
  const { watchlistOpen, closeWatchlist, openChart } = useFloatingWatchlist();
  const [tab, setTab] = useState<TabKey>('ALL');
  const [search, setSearch] = useState('');
  const [biasFilter, setBiasFilter] = useState<BiasFilter>('ALL');
  const [sort, setSort] = useState<SortMode>('DIFF_DESC');
  const snapshot = useStrengthSnapshot();
  const strengths = snapshot.data;

  // Step 1: tab + search filter
  const baseItems = useMemo(() => {
    let list = WATCHLIST;
    if (tab === 'JPY') {
      list = WATCHLIST.filter((w) => w.symbol.includes('JPY'));
    } else if (tab !== 'ALL') {
      list = WATCHLIST.filter((w) => w.category === tab);
    }
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter((w) => w.symbol.includes(q) || w.name.toUpperCase().includes(q));
    }
    return list;
  }, [tab, search]);

  // Step 2: enrich with bias + diff
  const enriched = useMemo(() => {
    return baseItems.map((item) => {
      const baseCur = item.symbol.slice(0, 3);
      const quoteCur = item.symbol.slice(3, 6);
      const baseStr = strengths[baseCur]?.strength;
      const quoteStr = strengths[quoteCur]?.strength;
      const diff = baseStr !== undefined && quoteStr !== undefined ? baseStr - quoteStr : undefined;
      const bias = diff !== undefined ? calculateBias(diff) : null;
      return { item, diff, bias };
    });
  }, [baseItems, strengths]);

  // Step 3: bias filter
  const filtered = useMemo(() => {
    if (biasFilter === 'ALL') return enriched;
    return enriched.filter((e) => e.bias?.quality === biasFilter);
  }, [enriched, biasFilter]);

  // Step 4: sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case 'DIFF_DESC':
        arr.sort((a, b) => (b.diff ?? -Infinity) - (a.diff ?? -Infinity));
        break;
      case 'DIFF_ASC':
        arr.sort((a, b) => (a.diff ?? Infinity) - (b.diff ?? Infinity));
        break;
      case 'PAIR_NAME':
        arr.sort((a, b) => a.item.symbol.localeCompare(b.item.symbol));
        break;
      case 'BIAS_QUALITY':
        arr.sort((a, b) => (b.bias?.rank ?? -1) - (a.bias?.rank ?? -1));
        break;
    }
    return arr;
  }, [filtered, sort]);

  // Group by category for "All Pair" — only when no bias filter / default sort
  const grouped = useMemo(() => {
    if (tab !== 'ALL' || biasFilter !== 'ALL' || sort !== 'DIFF_DESC') return null;
    const map = new Map<string, typeof sorted>();
    for (const e of sorted) {
      if (!map.has(e.item.category)) map.set(e.item.category, []);
      map.get(e.item.category)!.push(e);
    }
    return Array.from(map.entries());
  }, [sorted, tab, biasFilter, sort]);

  const totalCount = enriched.length;
  const filteredCount = sorted.length;

  return (
    <Sheet open={watchlistOpen} onOpenChange={(o) => !o && closeWatchlist()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          'p-0 flex flex-col gap-0 border-border/40 bg-background',
          isMobile ? 'h-[92vh] rounded-t-2xl' : 'w-[440px] sm:max-w-[440px]'
        )}
        style={{ zIndex: 9998 }}
      >
        <SheetHeader className="px-4 py-3 border-b border-border/40 flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-base font-bold">Watchlist</SheetTitle>
          <button
            onClick={closeWatchlist}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
            aria-label="Close watchlist"
          >
            <X className="w-4 h-4" />
          </button>
        </SheetHeader>

        {/* Strength source banner */}
        {snapshot.timeframe && (
          <div className="px-3 py-1.5 border-b border-border/40 bg-muted/20 flex items-center gap-2 text-[10px] text-muted-foreground">
            <Activity className="w-3 h-3 text-primary" />
            <span>Strength from</span>
            <span className="font-bold text-primary uppercase tracking-wider">{snapshot.timeframe}</span>
            <span className="ml-auto">
              {snapshot.recordedAt
                ? new Date(snapshot.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''}
            </span>
          </div>
        )}

        {/* Search */}
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pairs..."
              className="pl-9 h-9 bg-muted/30 border-border/40"
            />
          </div>
        </div>

        {/* Bias filter + sort */}
        <div className="px-3 pb-2">
          <BiasFilterBar
            filter={biasFilter}
            onFilterChange={setBiasFilter}
            sort={sort}
            onSortChange={setSort}
            totalCount={totalCount}
            filteredCount={filteredCount}
          />
        </div>

        {/* Tabs (horizontal scroll) */}
        <div className="px-2 border-b border-border/40">
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-2 pt-1">
            {WATCHLIST_CATEGORIES.map((cat) => {
              const active = tab === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setTab(cat.key as TabKey)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all border',
                    active
                      ? 'bg-primary/15 text-primary border-primary/30 shadow-[0_0_8px_hsla(145,63%,49%,0.2)]'
                      : 'bg-transparent text-muted-foreground border-border/40 hover:text-foreground hover:bg-muted/30'
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {sorted.length === 0 && (
            <div className="p-8 text-center space-y-3">
              <div className="text-sm text-muted-foreground">
                {biasFilter !== 'ALL' || search.trim()
                  ? 'এই filter-এ কোনো pair নেই'
                  : 'No pairs found.'}
              </div>
              {(biasFilter !== 'ALL' || search.trim()) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBiasFilter('ALL');
                    setSearch('');
                  }}
                >
                  Reset filters
                </Button>
              )}
            </div>
          )}

          {grouped ? (
            grouped.map(([cat, list]) => (
              <div key={cat}>
                <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/20">
                  {cat}
                </div>
                {list.map(({ item }) => (
                  <PairBiasRow
                    key={item.symbol}
                    item={item}
                    strengths={strengths}
                    onClick={() => openChart(item.symbol)}
                  />
                ))}
              </div>
            ))
          ) : (
            sorted.map(({ item }) => (
              <PairBiasRow
                key={item.symbol}
                item={item}
                strengths={strengths}
                onClick={() => openChart(item.symbol)}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
