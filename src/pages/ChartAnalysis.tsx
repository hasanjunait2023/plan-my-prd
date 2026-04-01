import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Maximize, Minimize, ExternalLink, Search, X } from 'lucide-react';
import ChartPanel from '@/components/charts/ChartPanel';

const QUICK_PAIRS = [
  'OANDA:XAUUSD', 'FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY',
  'BINANCE:BTCUSDT', 'TVC:USOIL', 'OANDA:XAGUSD', 'FX:GBPJPY',
];

const LAYOUT_OPTIONS = [1, 2, 3, 4] as const;
type LayoutCount = typeof LAYOUT_OPTIONS[number];

const DEFAULT_TIMEFRAMES: Record<LayoutCount, string[]> = {
  1: ['60'],
  2: ['15', '60'],
  3: ['15', '60', '240'],
  4: ['15', '60', '240', 'D'],
};

function getDisplayName(symbol: string) {
  return symbol.split(':').pop() || symbol;
}

export default function ChartAnalysis() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [chartCount, setChartCount] = useState<LayoutCount>(1);
  const [symbol, setSymbol] = useState('OANDA:XAUUSD');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [panelTimeframes, setPanelTimeframes] = useState<string[]>(['60']);

  // When layout changes, set default timeframes but preserve user changes where possible
  const handleLayoutChange = useCallback((count: LayoutCount) => {
    setChartCount(count);
    setPanelTimeframes(prev => {
      const defaults = DEFAULT_TIMEFRAMES[count];
      return defaults.map((def, i) => prev[i] || def);
    });
  }, []);

  const handleTimeframeChange = useCallback((index: number, tf: string) => {
    setPanelTimeframes(prev => {
      const next = [...prev];
      next[index] = tf;
      return next;
    });
  }, []);

  const handleSearch = () => {
    if (searchInput.trim()) {
      const val = searchInput.trim().toUpperCase();
      setSymbol(val.includes(':') ? val : val);
      setSearchInput('');
      setShowSearch(false);
    }
  };

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
    chartCount === 1
      ? 'grid-cols-1 grid-rows-1'
      : chartCount === 2
        ? 'grid-cols-2 grid-rows-1'
        : chartCount === 3
          ? 'grid-cols-3 grid-rows-1'
          : 'grid-cols-2 grid-rows-2';

  return (
    <div ref={wrapperRef} className={`flex flex-col h-[calc(100vh-3.5rem)] ${isFullscreen ? 'h-screen bg-background' : ''}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/20 shrink-0">
        <div className="flex items-center gap-1">
          {/* Layout buttons */}
          {LAYOUT_OPTIONS.map(count => (
            <Button
              key={count}
              size="sm"
              variant={chartCount === count ? 'default' : 'ghost'}
              className={`h-6 w-6 p-0 text-[10px] font-bold ${chartCount === count ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
              onClick={() => handleLayoutChange(count)}
            >
              {count}
            </Button>
          ))}

          <div className="w-px h-3 bg-border/30 mx-1" />

          {/* Quick pairs */}
          <div className="flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {QUICK_PAIRS.map(pair => (
              <Button
                key={pair}
                size="sm"
                variant={symbol === pair ? 'default' : 'ghost'}
                className={`h-6 px-2 text-[10px] shrink-0 ${symbol === pair ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                onClick={() => setSymbol(pair)}
              >
                {getDisplayName(pair)}
              </Button>
            ))}
          </div>

          {/* Search */}
          {showSearch ? (
            <div className="flex items-center gap-0.5 ml-1">
              <Input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. FX:AUDUSD"
                className="h-6 w-28 text-[10px] px-1.5 bg-background/50 border-border/30"
                autoFocus
              />
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowSearch(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-1" onClick={() => setShowSearch(true)}>
              <Search className="w-3 h-3 text-muted-foreground" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <a
            href="https://www.tradingview.com/chart/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 h-6 px-2 text-[10px] rounded-md border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            TradingView
          </a>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Charts grid — fills remaining viewport */}
      <div className={`flex-1 grid gap-0.5 p-0.5 min-h-0 ${gridClass}`}>
        {Array.from({ length: chartCount }).map((_, i) => (
          <ChartPanel
            key={`panel-${i}`}
            symbol={symbol}
            interval={panelTimeframes[i] || '60'}
            onIntervalChange={(tf) => handleTimeframeChange(i, tf)}
          />
        ))}
      </div>
    </div>
  );
}
