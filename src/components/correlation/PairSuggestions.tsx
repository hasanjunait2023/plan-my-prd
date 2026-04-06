import { CurrencyStrengthRecord, CURRENCY_FLAGS, generatePairSuggestions } from '@/types/correlation';
import { ArrowUpRight, ArrowDownRight, Maximize2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PairWithFlags } from '@/lib/pairFlags';

interface PairSuggestionsProps {
  data: CurrencyStrengthRecord[];
}

function InlineChart({ symbol, interval }: { symbol: string; interval: string }) {
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
        { id: "MAExp@tv-basicstudies", inputs: { length: 9 } },
        { id: "MAExp@tv-basicstudies", inputs: { length: 15 } },
        { id: "MAExp@tv-basicstudies", inputs: { length: 200 } },
        { id: "RSI@tv-basicstudies" },
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
      disabled_features: [],
      enabled_features: ["session_breaks"],
      width: '100%',
      height: '100%',
      support_host: 'https://www.tradingview.com',
    });

    widgetContainer.appendChild(script);
    containerRef.current.appendChild(widgetContainer);
  }, [symbol, interval]);

  return <div ref={containerRef} className="w-full" style={{ height: '380px' }} />;
}

function SuggestionCard({
  pair,
  flag,
  gap,
  direction,
  symbol,
}: {
  pair: string;
  flag: string;
  gap: number;
  direction: 'BUY' | 'SELL';
  symbol: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isBuy = direction === 'BUY';
  const color = isBuy ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)';
  const bgColor = isBuy ? 'hsla(142, 71%, 45%, 0.12)' : 'hsla(0, 84%, 60%, 0.12)';
  const shadow = isBuy ? '0 0 8px hsla(142, 71%, 45%, 0.08)' : '0 0 8px hsla(0, 84%, 60%, 0.08)';
  const hoverBorder = isBuy ? 'hover:border-emerald-500/20' : 'hover:border-red-500/20';
  const hoverBg = isBuy ? 'hover:bg-emerald-500/5' : 'hover:bg-red-500/5';

  return (
    <>
      <div className={`rounded-lg bg-card/60 border border-border/20 overflow-hidden transition-all ${hoverBorder} ${hoverBg}`}>
        {/* Header row */}
        <div className="flex items-center justify-between py-2 px-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{flag}</span>
            <span className="font-bold text-foreground text-sm tracking-wide">{pair}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
              Gap {gap}
            </span>
            <span
              className="text-[10px] font-extrabold px-2.5 py-1 rounded-md"
              style={{ color, backgroundColor: bgColor, boxShadow: shadow }}
            >
              {direction}
            </span>
            <button
              onClick={() => setExpanded(true)}
              className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {/* Inline chart */}
        <InlineChart symbol={symbol} interval="60" />
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 border-border/30 bg-card">
          <div className="px-4 py-3 border-b border-border/20">
            <PairWithFlags pair={pair} className="text-base font-semibold text-foreground" />
          </div>
          <div className="flex-1 min-h-0" style={{ height: 'calc(90vh - 52px)' }}>
            <InlineChart symbol={symbol} interval="60" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PairSuggestions({ data }: PairSuggestionsProps) {
  const suggestions = generatePairSuggestions(data);
  if (!suggestions.length) return null;

  const buys = suggestions.filter(s => s.direction === 'BUY').slice(0, 3);
  const sells = suggestions.filter(s => s.direction === 'SELL').slice(0, 3);

  const toSymbol = (pair: string) => 'FX:' + pair.replace('/', '');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* BUY Suggestions */}
      <div className="relative overflow-hidden rounded-xl border border-border/30 bg-gradient-to-br from-emerald-500/5 to-transparent p-5 shadow-[inset_0_1px_0_0_hsla(142,71%,45%,0.08)]">
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-10 bg-emerald-500" />
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2 relative z-10">
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
            <ArrowUpRight className="w-3.5 h-3.5" style={{ color: 'hsl(142, 71%, 45%)' }} />
          </div>
          <span className="uppercase tracking-widest text-[11px]">BUY Signals</span>
        </h3>
        <div className="space-y-3 relative z-10">
          {buys.map((s, i) => (
            <SuggestionCard
              key={i}
              pair={s.pair}
              flag={CURRENCY_FLAGS[s.strongCurrency]}
              gap={s.strengthDiff}
              direction="BUY"
              symbol={toSymbol(s.pair)}
            />
          ))}
        </div>
      </div>

      {/* SELL Suggestions */}
      <div className="relative overflow-hidden rounded-xl border border-border/30 bg-gradient-to-br from-red-500/5 to-transparent p-5 shadow-[inset_0_1px_0_0_hsla(0,84%,60%,0.08)]">
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-10 bg-red-500" />
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2 relative z-10">
          <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center">
            <ArrowDownRight className="w-3.5 h-3.5" style={{ color: 'hsl(0, 84%, 60%)' }} />
          </div>
          <span className="uppercase tracking-widest text-[11px]">SELL Signals</span>
        </h3>
        <div className="space-y-3 relative z-10">
          {sells.map((s, i) => (
            <SuggestionCard
              key={i}
              pair={s.pair}
              flag={CURRENCY_FLAGS[s.weakCurrency]}
              gap={Math.abs(s.strengthDiff)}
              direction="SELL"
              symbol={toSymbol(s.pair)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
