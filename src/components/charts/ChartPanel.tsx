import { Button } from '@/components/ui/button';
import TradingViewWidget from './TradingViewWidget';

const TIMEFRAMES = [
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: 'D', value: 'D' },
  { label: 'W', value: 'W' },
];

interface ChartPanelProps {
  symbol: string;
  interval: string;
  onIntervalChange: (tf: string) => void;
}

export default function ChartPanel({ symbol, interval, onIntervalChange }: ChartPanelProps) {
  return (
    <div className="flex flex-col h-full border border-border/10 rounded overflow-hidden">
      {/* Thin timeframe bar */}
      <div className="flex items-center gap-0.5 px-1 py-0.5 bg-card/30 border-b border-border/10 shrink-0">
        {TIMEFRAMES.map(tf => (
          <Button
            key={tf.value}
            size="sm"
            variant={interval === tf.value ? 'default' : 'ghost'}
            className={`h-5 px-1.5 text-[9px] ${interval === tf.value ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
            onClick={() => onIntervalChange(tf.value)}
          >
            {tf.label}
          </Button>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <TradingViewWidget symbol={symbol} interval={interval} />
      </div>
    </div>
  );
}
