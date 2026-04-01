import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize, ExternalLink, LayoutGrid, Square, Columns } from 'lucide-react';
import ChartPanel from '@/components/charts/ChartPanel';

type LayoutMode = '1x1' | '1x2' | '2x2';

const LAYOUT_OPTIONS: { mode: LayoutMode; icon: typeof Square; label: string }[] = [
  { mode: '1x1', icon: Square, label: 'Single' },
  { mode: '1x2', icon: Columns, label: 'Split' },
  { mode: '2x2', icon: LayoutGrid, label: 'Quad' },
];

const DEFAULT_SYMBOLS = [
  'OANDA:XAUUSD',
  'FX:EURUSD',
  'FX:GBPUSD',
  'BINANCE:BTCUSDT',
];

export default function ChartAnalysis() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<LayoutMode>('1x1');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const chartCount = layout === '1x1' ? 1 : layout === '1x2' ? 2 : 4;

  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const gridClass =
    layout === '1x1'
      ? 'grid-cols-1 grid-rows-1'
      : layout === '1x2'
        ? 'grid-cols-2 grid-rows-1'
        : 'grid-cols-2 grid-rows-2';

  return (
    <div ref={wrapperRef} className={`flex flex-col h-full ${isFullscreen ? 'bg-background' : ''}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/20">
        <div className="flex items-center gap-1">
          {LAYOUT_OPTIONS.map(({ mode, icon: Icon, label }) => (
            <Button
              key={mode}
              size="sm"
              variant={layout === mode ? 'default' : 'ghost'}
              className={`h-7 px-2.5 text-xs gap-1.5 ${layout === mode ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
              onClick={() => setLayout(mode)}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <a
            href="https://www.tradingview.com/chart/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs rounded-md border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open TradingView
          </a>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Charts grid */}
      <div className={`flex-1 grid gap-1 p-1 min-h-0 ${gridClass}`}>
        {Array.from({ length: chartCount }).map((_, i) => (
          <ChartPanel
            key={`${layout}-${i}`}
            defaultSymbol={DEFAULT_SYMBOLS[i] || DEFAULT_SYMBOLS[0]}
            defaultInterval="60"
            compact={layout !== '1x1'}
          />
        ))}
      </div>
    </div>
  );
}
