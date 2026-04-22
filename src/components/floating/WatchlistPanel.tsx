import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Search, X, Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFloatingWatchlist } from '@/contexts/FloatingWatchlistContext';
import { useSyncedPreference } from '@/contexts/PreferencesContext';
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
import { BiasPill } from './BiasPill';
import {
  calculateBias,
  BIAS_FILTER_OPTIONS,
  type BiasQuality,
  type BiasInfo,
} from '@/lib/biasCalculator';
import { Activity } from 'lucide-react';

type TabKey = WatchlistCategory | 'ALL';
type BiasFilter = BiasQuality | 'ALL';

function PairRow({
  item,
  onClick,
  strengths,
  bias,
  diff,
}: {
  item: WatchlistItem;
  onClick: () => void;
  strengths: ReturnType<typeof useStrengthSnapshot>['data'];
  bias?: BiasInfo;
  diff?: number;
}) {
  const { base, quote } = getPairFlags(item.symbol);
  const baseCur = item.symbol.slice(0, 3);
  const quoteCur = item.symbol.slice(3, 6);
  const baseEntry = strengths[baseCur];
  const quoteEntry = strengths[quoteCur];

  const baseStr = baseEntry?.strength;
  const quoteStr = quoteEntry?.strength;

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
      {/* Name + tier badges + bias pill */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">{item.symbol}</div>
        <div className="text-[10px] text-muted-foreground truncate mb-1">{item.name}</div>
        <div className="flex items-center gap-1.5 flex-wrap">
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
          {(baseEntry && quoteEntry) && <BiasPill bias={bias} />}
        </div>
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

// Color hint for bias filter chip when active
const BIAS_CHIP_ACCENT: Record<BiasQuality | 'ALL', string> = {
  ALL: 'hsl(var(--primary))',
  HIGH_BUY: 'hsl(142, 76%, 50%)',
  MEDIUM_BUY: 'hsl(142, 60%, 55%)',
  NEUTRAL: 'hsl(48, 96%, 53%)',
  MEDIUM_SELL: 'hsl(15, 85%, 60%)',
  HIGH_SELL: 'hsl(0, 84%, 62%)',
};

const BIAS_CHIP_SHORT: Record<BiasQuality | 'ALL', string> = {
  ALL: 'All',
  HIGH_BUY: 'HQ Buy',
  MEDIUM_BUY: 'Med Buy',
  NEUTRAL: 'Neutral',
  MEDIUM_SELL: 'Med Sell',
  HIGH_SELL: 'HQ Sell',
};

export function WatchlistPanel() {
  const isMobile = useIsMobile();
  const { watchlistOpen, closeWatchlist, openChart } = useFloatingWatchlist();
  const [tab, setTab] = useState<TabKey>('ALL');
  const [search, setSearch] = useState('');
  const [biasFilter, setBiasFilter] = useSyncedPreference<BiasFilter>('watchlist.biasFilter', 'ALL');
  const snapshot = useStrengthSnapshot();
  const strengths = snapshot.data;

  // Compute bias for each item once
  type EnrichedItem = { item: WatchlistItem; diff?: number; bias?: BiasInfo };

  const enrichedAll = useMemo<EnrichedItem[]>(() => {
    return WATCHLIST.map((item) => {
      const baseCur = item.symbol.slice(0, 3);
      const quoteCur = item.symbol.slice(3, 6);
      const baseEntry = strengths[baseCur];
      const quoteEntry = strengths[quoteCur];
      if (baseEntry?.strength === undefined || quoteEntry?.strength === undefined) {
        return { item };
      }
      const diff = baseEntry.strength - quoteEntry.strength;
      return { item, diff, bias: calculateBias(diff, baseEntry.strength, quoteEntry.strength) };
    });
  }, [strengths]);

  // Filter items: category → search → bias quality
  const items = useMemo<EnrichedItem[]>(() => {
    let list = enrichedAll;
    if (tab === 'JPY') {
      list = list.filter((e) => e.item.symbol.includes('JPY'));
    } else if (tab !== 'ALL') {
      list = list.filter((e) => e.item.category === tab);
    }
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter((e) => e.item.symbol.includes(q) || e.item.name.toUpperCase().includes(q));
    }
    if (biasFilter !== 'ALL') {
      list = list.filter((e) => e.bias?.quality === biasFilter);
      // sort by |diff| descending — strongest signal first
      list = [...list].sort((a, b) => Math.abs(b.diff ?? 0) - Math.abs(a.diff ?? 0));
    }
    return list;
  }, [enrichedAll, tab, search, biasFilter]);

  // Group by category for "All Pair" — only when no bias filter (sorting would conflict)
  const grouped = useMemo(() => {
    if (tab !== 'ALL' || biasFilter !== 'ALL') return null;
    const map = new Map<string, EnrichedItem[]>();
    for (const e of items) {
      if (!map.has(e.item.category)) map.set(e.item.category, []);
      map.get(e.item.category)!.push(e);
    }
    return Array.from(map.entries());
  }, [items, tab, biasFilter]);

  const filterActive = biasFilter !== 'ALL';

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
        {(snapshot.sessionLabel || snapshot.timeframe) && (
          <div className={cn(
            "px-3 py-1.5 border-b border-border/40 flex items-center gap-2 text-[10px]",
            snapshot.isStale ? "bg-orange-500/10 text-orange-300" : "bg-muted/20 text-muted-foreground"
          )}>
            <Activity className={cn("w-3 h-3", snapshot.isStale ? "text-orange-400" : "text-primary")} />
            <span>Strength from</span>
            <span className={cn(
              "font-bold uppercase tracking-wider",
              snapshot.isStale ? "text-orange-300" : "text-primary"
            )}>
              {snapshot.sessionLabel || snapshot.timeframe}
            </span>
            {snapshot.isStale && <span className="text-[9px] font-semibold">⚠ stale</span>}
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

        {/* Category Tabs (horizontal scroll) */}
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

        {/* Bias Quality Filter */}
        <div className="px-2 border-b border-border/40 bg-muted/10">
          <div className="flex items-center gap-2 px-1 pt-2 pb-1">
            <Sparkles className="w-3 h-3 text-primary shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Quality
            </span>
            {filterActive && (
              <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                {items.length} of {enrichedAll.length}
              </span>
            )}
          </div>
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-2 pt-0.5">
            {BIAS_FILTER_OPTIONS.map((opt) => {
              const active = biasFilter === opt.value;
              const accent = BIAS_CHIP_ACCENT[opt.value];
              return (
                <button
                  key={opt.value}
                  onClick={() => setBiasFilter(opt.value as BiasFilter)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all border'
                  )}
                  style={
                    active
                      ? {
                          color: accent,
                          backgroundColor: `${accent.replace('hsl', 'hsla').replace(')', ', 0.15)')}`,
                          borderColor: `${accent.replace('hsl', 'hsla').replace(')', ', 0.4)')}`,
                          boxShadow: `0 0 8px ${accent.replace('hsl', 'hsla').replace(')', ', 0.25)')}`,
                        }
                      : undefined
                  }
                >
                  <span className={cn(!active && 'text-muted-foreground')}>
                    {BIAS_CHIP_SHORT[opt.value]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {filterActive
                ? 'No pairs match this bias quality.'
                : 'No pairs found.'}
            </div>
          )}

          {grouped ? (
            grouped.map(([cat, list]) => (
              <div key={cat}>
                <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/20">
                  {cat}
                </div>
                {list.map((e) => (
                  <PairRow
                    key={e.item.symbol}
                    item={e.item}
                    strengths={strengths}
                    bias={e.bias}
                    diff={e.diff}
                    onClick={() => openChart(e.item.symbol)}
                  />
                ))}
              </div>
            ))
          ) : (
            items.map((e) => (
              <PairRow
                key={e.item.symbol}
                item={e.item}
                strengths={strengths}
                bias={e.bias}
                diff={e.diff}
                onClick={() => openChart(e.item.symbol)}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
