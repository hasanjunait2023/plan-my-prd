import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import TradingViewWidget from './TradingViewWidget';

const QUICK_PAIRS = [
  'OANDA:XAUUSD', 'FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY',
  'BINANCE:BTCUSDT', 'TVC:USOIL', 'OANDA:XAGUSD', 'FX:GBPJPY',
];

const QUICK_TF = [
  { label: '15m', value: '15' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: 'D', value: 'D' },
];

function getDisplayName(symbol: string) {
  return symbol.split(':').pop() || symbol;
}

interface ChartPanelProps {
  defaultSymbol?: string;
  defaultInterval?: string;
  compact?: boolean;
}

export default function ChartPanel({
  defaultSymbol = 'OANDA:XAUUSD',
  defaultInterval = '60',
  compact = false,
}: ChartPanelProps) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [interval, setInterval] = useState(defaultInterval);
  const [searchInput, setSearchInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = () => {
    if (searchInput.trim()) {
      setSymbol(searchInput.trim().toUpperCase());
      setSearchInput('');
      setShowSearch(false);
    }
  };

  return (
    <div className="flex flex-col h-full border border-border/20 rounded-lg overflow-hidden bg-card/20">
      {/* Mini toolbar */}
      <div className="flex items-center gap-0.5 px-1 py-0.5 bg-card/40 border-b border-border/20 flex-wrap">
        <span className="text-[10px] font-semibold text-primary px-1">{getDisplayName(symbol)}</span>
        <div className="w-px h-3 bg-border/30 mx-0.5" />

        {/* Quick timeframes */}
        {QUICK_TF.map(tf => (
          <Button
            key={tf.value}
            size="sm"
            variant={interval === tf.value ? 'default' : 'ghost'}
            className={`h-5 px-1.5 text-[9px] ${interval === tf.value ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
            onClick={() => setInterval(tf.value)}
          >
            {tf.label}
          </Button>
        ))}

        <div className="w-px h-3 bg-border/30 mx-0.5" />

        {/* Quick pair buttons */}
        <div className="flex items-center gap-0.5 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          {QUICK_PAIRS.slice(0, compact ? 4 : 8).map(pair => (
            <Button
              key={pair}
              size="sm"
              variant={symbol === pair ? 'default' : 'ghost'}
              className={`h-5 px-1.5 text-[9px] shrink-0 ${symbol === pair ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
              onClick={() => setSymbol(pair)}
            >
              {getDisplayName(pair)}
            </Button>
          ))}
        </div>

        {/* Search toggle */}
        {showSearch ? (
          <div className="flex items-center gap-0.5">
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Symbol..."
              className="h-5 w-20 text-[9px] px-1 bg-background/50 border-border/30"
              autoFocus
            />
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setShowSearch(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setShowSearch(true)}>
            <Search className="w-3 h-3 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <TradingViewWidget symbol={symbol} interval={interval} compact={compact} />
      </div>
    </div>
  );
}
