import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Maximize, Minimize, ExternalLink, Search, Clock, Star } from 'lucide-react';

const PAIR_CATEGORIES = {
  'Forex Majors': [
    'FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY', 'FX:USDCHF', 'FX:AUDUSD', 'FX:USDCAD', 'FX:NZDUSD',
  ],
  'Forex Minors': [
    'FX:EURGBP', 'FX:EURJPY', 'FX:GBPJPY', 'FX:AUDJPY', 'FX:EURAUD', 'FX:GBPAUD', 'FX:EURNZD', 'FX:GBPNZD',
  ],
  'Metals': [
    'OANDA:XAUUSD', 'OANDA:XAGUSD',
  ],
  'Energy': [
    'TVC:USOIL', 'TVC:UKOIL',
  ],
  'Crypto': [
    'BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:SOLUSDT', 'BINANCE:XRPUSDT',
  ],
};

const TIMEFRAMES = [
  { label: '1m', value: '1' },
  { label: '3m', value: '3' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '30m', value: '30' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: 'D', value: 'D' },
  { label: 'W', value: 'W' },
  { label: 'M', value: 'M' },
];

const RECENT_KEY = 'tv-recent-pairs';

function getDisplayName(symbol: string) {
  return symbol.split(':').pop() || symbol;
}

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch { return []; }
}

function saveRecent(symbol: string) {
  const list = loadRecent().filter(s => s !== symbol);
  list.unshift(symbol);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
}

export default function ChartAnalysis() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [symbol, setSymbol] = useState('OANDA:XAUUSD');
  const [interval, setIntervalValue] = useState('60');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('Forex Majors');
  const [recentPairs, setRecentPairs] = useState<string[]>(loadRecent);

  const selectPair = useCallback((pair: string) => {
    setSymbol(pair);
    saveRecent(pair);
    setRecentPairs(loadRecent());
  }, []);

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      const val = customInput.trim().toUpperCase();
      selectPair(val.includes(':') ? val : val);
      setCustomInput('');
    }
  };

  // Render TradingView widget
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
      hide_top_toolbar: false,
      hide_legend: false,
      enable_publishing: false,
      withdateranges: true,
      hide_side_toolbar: false,
      details: true,
      calendar: false,
      show_popup_button: true,
      popup_width: '1200',
      popup_height: '800',
      allow_symbol_change: true,
      save_image: true,
      width: '100%',
      height: '100%',
      support_host: 'https://www.tradingview.com',
    });

    widgetContainer.appendChild(script);
    containerRef.current.appendChild(widgetContainer);
  }, [symbol, interval]);

  // Fullscreen API
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

  return (
    <div ref={wrapperRef} className={`flex flex-col gap-0 ${isFullscreen ? 'bg-background' : ''}`}>
      {/* Top Control Bar */}
      <div className="flex flex-wrap items-center gap-2 px-1 py-2">
        {/* Category tabs */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0" style={{ scrollbarWidth: 'none' }}>
          {Object.keys(PAIR_CATEGORIES).map(cat => (
            <Button
              key={cat}
              size="sm"
              variant={activeCategory === cat ? 'default' : 'ghost'}
              className={`h-7 px-2.5 text-xs whitespace-nowrap shrink-0 ${activeCategory === cat ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Custom input */}
        <div className="flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
              placeholder="Custom symbol..."
              className="h-7 w-32 pl-7 text-xs bg-card/50 border-border/30"
            />
          </div>
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

      {/* Pair selector row */}
      <div className="flex items-center gap-1 px-1 pb-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {/* Recent pairs */}
        {recentPairs.length > 0 && (
          <>
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {recentPairs.slice(0, 4).map(pair => (
              <Button
                key={`recent-${pair}`}
                size="sm"
                variant={symbol === pair ? 'default' : 'outline'}
                className={`h-6 px-2 text-[10px] shrink-0 ${symbol === pair ? 'bg-primary/20 text-primary border-primary/30' : 'border-border/20 text-muted-foreground'}`}
                onClick={() => selectPair(pair)}
              >
                {getDisplayName(pair)}
              </Button>
            ))}
            <div className="w-px h-4 bg-border/30 mx-1 shrink-0" />
          </>
        )}

        {/* Category pairs */}
        {PAIR_CATEGORIES[activeCategory as keyof typeof PAIR_CATEGORIES]?.map(pair => (
          <Button
            key={pair}
            size="sm"
            variant={symbol === pair ? 'default' : 'ghost'}
            className={`h-6 px-2 text-[10px] shrink-0 ${symbol === pair ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
            onClick={() => selectPair(pair)}
          >
            {getDisplayName(pair)}
          </Button>
        ))}
      </div>

      {/* Timeframe bar */}
      <div className="flex items-center gap-0.5 px-1 pb-1">
        {TIMEFRAMES.map(tf => (
          <Button
            key={tf.value}
            size="sm"
            variant={interval === tf.value ? 'default' : 'ghost'}
            className={`h-6 px-2 text-[10px] ${interval === tf.value ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
            onClick={() => setIntervalValue(tf.value)}
          >
            {tf.label}
          </Button>
        ))}
        <div className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          <span>Click popup icon on chart to open in TradingView</span>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className={`w-full rounded-lg overflow-hidden ${isFullscreen ? 'flex-1' : 'h-[calc(100vh-220px)]'}`} />
    </div>
  );
}
