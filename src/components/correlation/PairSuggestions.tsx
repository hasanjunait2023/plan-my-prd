import { CurrencyStrengthRecord, CURRENCY_FLAGS, PairSuggestion } from '@/types/correlation';
import { Maximize2, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, memo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PairWithFlags } from '@/lib/pairFlags';
import { calculateBias, BiasInfo } from '@/lib/biasCalculator';
import { ExtendedStrengthBar } from './ExtendedStrengthBar';
import { BiasFilterBar, BiasFilter, SortMode } from './BiasFilterBar';
import { useIsMobile } from '@/hooks/use-mobile';

interface PairSuggestionsProps {
  data: CurrencyStrengthRecord[];
}

interface EnrichedSuggestion extends PairSuggestion {
  bias: BiasInfo;
  baseStrength: number;
  quoteStrength: number;
  signedDiff: number;
}

function InlineChartInner({ symbol, interval }: { symbol: string; interval: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const widgetInner = document.createElement('div');
    widgetInner.className = 'tradingview-widget-container__widget';
    widgetInner.style.height = '100%';
    widgetInner.style.width = '100%';
    widgetContainer.appendChild(widgetInner);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.type = 'text/javascript';
    script.innerHTML = JSON.stringify({
      symbol,
      interval,
      theme: 'dark',
      style: '1',
      locale: 'en',
      timezone: 'Etc/UTC',
      studies: [
        { id: 'MAExp@tv-basicstudies', inputs: { length: 9 } },
        { id: 'MAExp@tv-basicstudies', inputs: { length: 15 } },
        { id: 'MAExp@tv-basicstudies', inputs: { length: 200 } },
        { id: 'RSI@tv-basicstudies' },
      ],
      hide_top_toolbar: true,
      hide_legend: false,
      hide_side_toolbar: true,
      enable_publishing: false,
      withdateranges: false,
      details: false,
      calendar: false,
      show_popup_button: false,
      save_image: false,
      allow_symbol_change: false,
      enabled_features: ['session_breaks'],
      width: '100%',
      height: '100%',
      support_host: 'https://www.tradingview.com',
    });

    widgetContainer.appendChild(script);
    containerRef.current.appendChild(widgetContainer);
  }, [symbol, interval]);

  return <div ref={containerRef} className="w-full" style={{ height: '380px' }} />;
}

const InlineChart = memo(InlineChartInner);

function LazyInlineChart({
  symbol,
  interval,
  enabled,
  pausedTitle,
  compactWhenDisabled = false,
}: {
  symbol: string;
  interval: string;
  enabled: boolean;
  pausedTitle: string;
  compactWhenDisabled?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(false);
      return;
    }

    const node = hostRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        rootMargin: '280px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  const showChart = enabled && isVisible;
  const isCompactPlaceholder = !enabled && compactWhenDisabled;
  const boxHeight = showChart ? '380px' : isCompactPlaceholder ? '76px' : '380px';

  return (
    <div ref={hostRef} className="w-full" style={{ minHeight: boxHeight }}>
      {showChart ? (
        <InlineChart symbol={symbol} interval={interval} />
      ) : (
        <div
          className="flex items-center justify-center border-t border-border/20 bg-gradient-to-b from-muted/10 to-card/20 px-4 text-center"
          style={{ height: boxHeight }}
        >
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-foreground/85">
              {enabled ? 'Chart loads when visible' : pausedTitle}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {enabled
                ? 'This keeps the page stable and avoids heavy auto-refresh behaviour.'
                : 'Use the expand button for the full live chart.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const SuggestionCard = memo(function SuggestionCard({ s }: { s: EnrichedSuggestion }) {
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();
  const { bias } = s;
  const symbol = 'FX:' + s.pair.replace('/', '');
  const [base, quote] = s.pair.split('/');
  const inlineChartsEnabled = !expanded && !isMobile;
  const pausedTitle = isMobile
    ? 'Live chart opens in fullscreen on mobile'
    : 'Inline chart paused while fullscreen is open';

  return (
    <>
      <div
        className="rounded-xl border bg-card/60 overflow-hidden transition-all hover:bg-card/80"
        style={{ borderColor: bias.borderColor }}
      >
        {/* Header: pair + bias badge + expand */}
        <div className="flex items-center justify-between py-2.5 px-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg flex-shrink-0">{CURRENCY_FLAGS[base]}{CURRENCY_FLAGS[quote]}</span>
            <span className="font-bold text-foreground text-sm tracking-wide truncate">{s.pair}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-wider whitespace-nowrap"
              style={{
                color: bias.color,
                backgroundColor: bias.bgColor,
                boxShadow: `0 0 8px ${bias.bgColor}`,
              }}
            >
              {bias.shortLabel}
            </span>
            <button
              onClick={() => setExpanded(true)}
              className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Expand chart"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Extended strength bars: base + quote with full labels */}
        <div className="px-3 pb-2.5 space-y-2 border-b border-border/20">
          <ExtendedStrengthBar currency={base} strength={s.baseStrength} />
          <ExtendedStrengthBar currency={quote} strength={s.quoteStrength} />
          {/* Differential summary */}
          <div className="flex items-center justify-between pt-1 text-[10px]">
            <span className="text-muted-foreground">Differential</span>
            <span
              className="font-mono font-bold tabular-nums"
              style={{ color: bias.color }}
            >
              {s.signedDiff > 0 ? '+' : ''}{s.signedDiff.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Inline chart */}
        <LazyInlineChart
          symbol={symbol}
          interval="60"
          enabled={inlineChartsEnabled}
          pausedTitle={pausedTitle}
          compactWhenDisabled={isMobile}
        />
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 border-border/30 bg-card">
          <div className="px-4 py-3 border-b border-border/20 flex items-center gap-3">
            <PairWithFlags pair={s.pair} className="text-base font-semibold text-foreground" />
            <span
              className="text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-wider"
              style={{ color: bias.color, backgroundColor: bias.bgColor }}
            >
              {bias.label}
            </span>
          </div>
          <div className="flex-1 min-h-0" style={{ height: 'calc(90vh - 52px)' }}>
            <InlineChart symbol={symbol} interval="60" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

export function PairSuggestions({ data }: PairSuggestionsProps) {
  const [filter, setFilter] = useState<BiasFilter>('ALL');
  const [sort, setSort] = useState<SortMode>('DIFF_DESC');

  // Build full enriched list (include NEUTRAL too — bypass generatePairSuggestions threshold)
  const allEnriched = useMemo<EnrichedSuggestion[]>(() => {
    if (data.length < 2) return [];
    const strengthMap = new Map<string, number>();
    for (const d of data) strengthMap.set(d.currency, d.strength);

    const TRADEABLE = [
      'EUR/USD','EUR/GBP','EUR/JPY','EUR/AUD','EUR/NZD','EUR/CAD','EUR/CHF',
      'GBP/USD','GBP/JPY','GBP/AUD','GBP/NZD','GBP/CAD','GBP/CHF',
      'AUD/USD','AUD/JPY','AUD/NZD','AUD/CAD','AUD/CHF',
      'NZD/USD','NZD/JPY','NZD/CAD','NZD/CHF',
      'USD/JPY','USD/CAD','USD/CHF',
      'CAD/JPY','CAD/CHF','CHF/JPY',
    ];

    const list: EnrichedSuggestion[] = [];
    for (const pair of TRADEABLE) {
      const [base, quote] = pair.split('/');
      const bs = strengthMap.get(base);
      const qs = strengthMap.get(quote);
      if (bs === undefined || qs === undefined) continue;
      const diff = bs - qs;
      const bias = calculateBias(diff);
      list.push({
        pair,
        direction: diff >= 0 ? 'BUY' : 'SELL',
        strongCurrency: diff >= 0 ? base : quote,
        weakCurrency: diff >= 0 ? quote : base,
        strengthDiff: Math.abs(diff),
        signedDiff: diff,
        baseStrength: bs,
        quoteStrength: qs,
        bias,
      });
    }
    return list;
  }, [data]);

  const filtered = useMemo(() => {
    let arr = allEnriched;
    if (filter !== 'ALL') {
      arr = arr.filter(s => s.bias.quality === filter);
    }
    const sorted = [...arr];
    switch (sort) {
      case 'DIFF_DESC':
        sorted.sort((a, b) => b.strengthDiff - a.strengthDiff);
        break;
      case 'DIFF_ASC':
        sorted.sort((a, b) => a.strengthDiff - b.strengthDiff);
        break;
      case 'PAIR_NAME':
        sorted.sort((a, b) => a.pair.localeCompare(b.pair));
        break;
      case 'BIAS_QUALITY':
        sorted.sort((a, b) => b.bias.rank - a.bias.rank || b.strengthDiff - a.strengthDiff);
        break;
    }
    return sorted;
  }, [allEnriched, filter, sort]);

  if (!allEnriched.length) return null;

  return (
    <div className="space-y-4">
      {/* Filter & sort controls */}
      <div className="rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm p-3">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-foreground">
            Pair Suggestions
          </span>
        </div>
        <BiasFilterBar
          filter={filter}
          onFilterChange={setFilter}
          sort={sort}
          onSortChange={setSort}
          totalCount={allEnriched.length}
          filteredCount={filtered.length}
        />
      </div>

      {/* Results grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-border/40 bg-card/20">
          <p className="text-sm text-muted-foreground">
            এই filter এ কোনো pair নেই।
          </p>
          <button
            onClick={() => setFilter('ALL')}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Reset filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(s => (
            <SuggestionCard key={s.pair} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}
