import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFloatingWatchlist } from '@/contexts/FloatingWatchlistContext';
import {
  WATCHLIST,
  WATCHLIST_CATEGORIES,
  type WatchlistCategory,
  type WatchlistItem,
} from '@/lib/watchlistData';
import { getPairFlags } from '@/lib/pairFlags';
import { cn } from '@/lib/utils';
import { useStrengthSnapshot } from '@/hooks/useCurrencyStrengths';
import { PairStrengthBadges } from './StrengthBadge';
import { Activity } from 'lucide-react';

type TabKey = WatchlistCategory | 'ALL';

function PairRow({
  item,
  onClick,
  strengths,
}: {
  item: WatchlistItem;
  onClick: () => void;
  strengths: ReturnType<typeof useStrengthSnapshot>['data'];
}) {
  const { base, quote } = getPairFlags(item.symbol);
  const baseCur = item.symbol.slice(0, 3);
  const quoteCur = item.symbol.slice(3, 6);
  const baseEntry = strengths[baseCur];
  const quoteEntry = strengths[quoteCur];

  const baseStr = baseEntry?.strength;
  const quoteStr = quoteEntry?.strength;
  const diff = baseStr !== undefined && quoteStr !== undefined ? baseStr - quoteStr : undefined;

  const tierColor = (s?: number): string => {
    if (s === undefined) return 'hsl(0, 0%, 50%)';
    if (s >= 5) return 'hsl(142, 71%, 45%)';
    if (s >= 2) return 'hsl(160, 60%, 45%)';
    if (s > -2) return 'hsl(48, 50%, 55%)';
    if (s > -5) return 'hsl(25, 95%, 53%)';
    return 'hsl(0, 84%, 60%)';
  };
  const baseColor = tierColor(baseStr);
  const quoteColor = tierColor(quoteStr);
  const diffColor = diff === undefined ? 'hsl(0,0%,50%)' : diff > 1 ? 'hsl(142, 71%, 45%)' : diff < -1 ? 'hsl(0, 84%, 60%)' : 'hsl(48, 50%, 55%)';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left border-b border-border/30 min-h-[68px]"
    >
      {/* Flags */}
      <div className="relative w-10 h-10 shrink-0">
        <span className="absolute left-0 top-0 text-2xl">{base}</span>
        <span className="absolute right-0 bottom-0 text-2xl">{quote}</span>
      </div>
      {/* Name + tier badges */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">{item.symbol}</div>
        <div className="text-[10px] text-muted-foreground truncate mb-1">{item.name}</div>
        {(baseEntry || quoteEntry) && (
          <PairStrengthBadges
            base={baseCur}
            quote={quoteCur}
            baseTier={baseEntry?.tier}
            quoteTier={quoteEntry?.tier}
            baseStrength={baseEntry?.strength}
            quoteStrength={quoteEntry?.strength}
          />
        )}
      </div>
      {/* Right side: numeric strength values + differential */}
      <div className="text-right shrink-0 flex flex-col items-end gap-0.5 min-w-[72px]">
        {baseStr !== undefined || quoteStr !== undefined ? (
          <>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[9px] font-bold text-muted-foreground tracking-wide">{baseCur}</span>
              <span
                className="text-[15px] font-black tabular-nums tracking-tight"
                style={{ color: baseColor, textShadow: `0 0 12px ${baseColor}55` }}
              >
                {baseStr !== undefined ? (baseStr > 0 ? `+${baseStr}` : baseStr) : '—'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[9px] font-bold text-muted-foreground tracking-wide">{quoteCur}</span>
              <span
                className="text-[15px] font-black tabular-nums tracking-tight"
                style={{ color: quoteColor, textShadow: `0 0 12px ${quoteColor}55` }}
              >
                {quoteStr !== undefined ? (quoteStr > 0 ? `+${quoteStr}` : quoteStr) : '—'}
              </span>
            </div>
            {diff !== undefined && (
              <div
                className="text-[9px] font-black px-1.5 py-0.5 rounded mt-0.5 tracking-wider"
                style={{ color: diffColor, backgroundColor: `${diffColor}1a`, border: `1px solid ${diffColor}33` }}
                title="Differential (base − quote)"
              >
                Δ {diff > 0 ? '+' : ''}{diff}
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-muted-foreground">—</div>
        )}
      </div>
    </button>
  );
}

export function WatchlistPanel() {
  const isMobile = useIsMobile();
  const { watchlistOpen, closeWatchlist, openChart } = useFloatingWatchlist();
  const [tab, setTab] = useState<TabKey>('ALL');
  const [search, setSearch] = useState('');
  const snapshot = useStrengthSnapshot();
  const strengths = snapshot.data;

  // Filter items
  const items = useMemo(() => {
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

  // Group by category for "All Pair"
  const grouped = useMemo(() => {
    if (tab !== 'ALL') return null;
    const map = new Map<string, WatchlistItem[]>();
    for (const it of items) {
      if (!map.has(it.category)) map.set(it.category, []);
      map.get(it.category)!.push(it);
    }
    return Array.from(map.entries());
  }, [items, tab]);

  return (
    <Sheet open={watchlistOpen} onOpenChange={(o) => !o && closeWatchlist()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          'p-0 flex flex-col gap-0 border-border/40 bg-background',
          isMobile ? 'h-[92vh] rounded-t-2xl' : 'w-[420px] sm:max-w-[420px]'
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
          {items.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No pairs found.</div>
          )}

          {grouped ? (
            grouped.map(([cat, list]) => (
              <div key={cat}>
                <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/20">
                  {cat}
                </div>
                {list.map((item) => (
                  <PairRow key={item.symbol} item={item} strengths={strengths} onClick={() => openChart(item.symbol)} />
                ))}
              </div>
            ))
          ) : (
            items.map((item) => (
              <PairRow key={item.symbol} item={item} strengths={strengths} onClick={() => openChart(item.symbol)} />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
