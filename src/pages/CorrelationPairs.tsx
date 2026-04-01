import { useState } from 'react';
import { LayoutGrid, Grid2x2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MiniChart } from '@/components/correlation/MiniChart';
import { SessionPanel } from '@/components/correlation/SessionPanel';

const CURRENCIES = [
  { code: 'EUR', flag: '🇪🇺' },
  { code: 'USD', flag: '🇺🇸' },
  { code: 'GBP', flag: '🇬🇧' },
  { code: 'JPY', flag: '🇯🇵' },
  { code: 'AUD', flag: '🇦🇺' },
  { code: 'NZD', flag: '🇳🇿' },
  { code: 'CAD', flag: '🇨🇦' },
  { code: 'CHF', flag: '🇨🇭' },
];

// Standard forex pair ordering hierarchy
const ORDER = ['EUR', 'GBP', 'AUD', 'NZD', 'USD', 'CAD', 'CHF', 'JPY'];

function makePair(a: string, b: string): string {
  const ia = ORDER.indexOf(a);
  const ib = ORDER.indexOf(b);
  return ia <= ib ? `${a}${b}` : `${b}${a}`;
}

// Top 6 pairs per currency (most liquid, excluding least traded)
const PAIR_MAP: Record<string, string[]> = {};
CURRENCIES.forEach(({ code }) => {
  const others = CURRENCIES.filter(c => c.code !== code).map(c => c.code);
  // Take first 6 by standard ordering (drops least liquid)
  const pairs = others.slice(0, 6).map(other => makePair(code, other));
  PAIR_MAP[code] = pairs;
});

const TIMEFRAMES = [
  { label: '3M', value: '3' },
  { label: '15M', value: '15' },
  { label: '1H', value: '60' },
];

export default function CorrelationPairs() {
  const [selected, setSelected] = useState('EUR');
  const [interval, setInterval] = useState('60');
  const [cols, setCols] = useState<2 | 3>(2);

  const pairs = PAIR_MAP[selected] || [];

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">
          📊 Correlation Pairs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a currency to view its correlated pairs with EMA & RSI
        </p>
      </div>

      {/* Currency Selector */}
      <div className="flex flex-wrap gap-2">
        {CURRENCIES.map(({ code, flag }) => (
          <Button
            key={code}
            size="sm"
            variant={selected === code ? 'default' : 'outline'}
            className={`text-sm ${
              selected === code
                ? 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_8px_hsla(var(--primary)/0.2)]'
                : 'text-muted-foreground border-border/30 hover:border-primary/30'
            }`}
            onClick={() => setSelected(code)}
          >
            <span className="mr-1">{flag}</span>
            {code}
          </Button>
        ))}
      </div>

      {/* Timeframe & Layout Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Timeframe:</span>
          <div className="flex gap-1">
            {TIMEFRAMES.map(tf => (
              <Button
                key={tf.value}
                size="sm"
                variant={interval === tf.value ? 'default' : 'ghost'}
                className={`h-7 px-2.5 text-xs ${
                  interval === tf.value
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground'
                }`}
                onClick={() => setInterval(tf.value)}
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Layout:</span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={cols === 2 ? 'default' : 'ghost'}
              className={`h-7 px-2 text-xs ${cols === 2 ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
              onClick={() => setCols(2)}
            >
              <Grid2x2 className="h-3.5 w-3.5 mr-1" /> 2×3
            </Button>
            <Button
              size="sm"
              variant={cols === 3 ? 'default' : 'ghost'}
              className={`h-7 px-2 text-xs ${cols === 3 ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
              onClick={() => setCols(3)}
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1" /> 3×2
            </Button>
          </div>
        </div>
      </div>

      {/* Chart Grid */}
      <div className={`grid grid-cols-1 gap-4 ${cols === 2 ? 'lg:grid-cols-2 gap-6' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
        {pairs.map(pair => (
          <MiniChart
            key={`${pair}-${interval}`}
            symbol={`OANDA:${pair}`}
            pair={pair}
            interval={interval}
          />
        ))}
      </div>
    </div>
  );
}
