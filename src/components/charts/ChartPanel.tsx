import { useState } from 'react';
import { Button } from '@/components/ui/button';
import TradingViewWidget from './TradingViewWidget';
import TimeframePills from './TimeframePills';

interface ChartPanelProps {
  symbol: string;
  interval: string;
  onIntervalChange: (tf: string) => void;
}

export default function ChartPanel({ symbol, interval, onIntervalChange }: ChartPanelProps) {
  const [showRsi, setShowRsi] = useState(true);

  return (
    <div className="flex flex-col h-full border border-border/10 rounded overflow-hidden">
      {/* Compact toolbar: TF pills + RSI toggle */}
      <div className="flex items-center justify-between gap-1 px-1 py-0.5 bg-card/30 border-b border-border/10 shrink-0">
        <TimeframePills value={interval} onChange={onIntervalChange} />
        <Button
          size="sm"
          variant={showRsi ? 'default' : 'ghost'}
          className={`h-5 px-1.5 text-[9px] font-bold ${showRsi ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
          onClick={() => setShowRsi(v => !v)}
          title={showRsi ? 'Hide RSI' : 'Show RSI'}
        >
          RSI
        </Button>
      </div>

      {/* Chart with EMA 9/15/200 + optional RSI */}
      <div className="flex-1 min-h-0">
        <TradingViewWidget symbol={symbol} interval={interval} showRsi={showRsi} />
      </div>
    </div>
  );
}
