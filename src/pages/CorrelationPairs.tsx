import { useState } from 'react';
import { LayoutGrid, Grid2x2, BarChart3, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MiniChart } from '@/components/correlation/MiniChart';
import { CompactSessionBar } from '@/components/correlation/CompactSessionBar';
import { CorrelationStrengthStrip } from '@/components/correlation/CorrelationStrengthStrip';

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

const ORDER = ['EUR', 'GBP', 'AUD', 'NZD', 'USD', 'CAD', 'CHF', 'JPY'];

function makePair(a: string, b: string): string {
  const ia = ORDER.indexOf(a);
  const ib = ORDER.indexOf(b);
  return ia <= ib ? `${a}${b}` : `${b}${a}`;
}

const PAIR_MAP: Record<string, string[]> = {};
CURRENCIES.forEach(({ code }) => {
  const others = CURRENCIES.filter(c => c.code !== code).map(c => c.code);
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
  const [chartVariant, setChartVariant] = useState<'ema-rsi' | 'ema-only'>('ema-only');

  const pairs = PAIR_MAP[selected] || [];
  const chartHeight = cols === 3 ? '220px' : '250px';

  return (
    <div className="max-w-[1600px] mx-auto space-y-2">
      {/* Header + Session */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">
          📊 Correlation Pairs
        </h1>
        <CompactSessionBar />
      </div>

      {/* Currency Selector */}
      <div className="flex flex-wrap gap-1.5">
        {CURRENCIES.map(({ code, flag }) => (
          <Button
            key={code}
            size="sm"
            variant={selected === code ? 'default' : 'outline'}
            className={`h-7 text-xs ${
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

      {/* Strength Strip */}
      <CorrelationStrengthStrip selectedCurrency={selected} />

      {/* Controls Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">TF:</span>
          {TIMEFRAMES.map(tf => (
            <Button
              key={tf.value}
              size="sm"
              variant={interval === tf.value ? 'default' : 'ghost'}
              className={`h-6 px-2 text-[10px] ${
                interval === tf.value ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
              }`}
              onClick={() => setInterval(tf.value)}
            >
              {tf.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Grid:</span>
          <Button
            size="sm"
            variant={cols === 2 ? 'default' : 'ghost'}
            className={`h-6 px-2 text-[10px] ${cols === 2 ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
            onClick={() => setCols(2)}
          >
            <Grid2x2 className="h-3 w-3 mr-0.5" /> 2×3
          </Button>
          <Button
            size="sm"
            variant={cols === 3 ? 'default' : 'ghost'}
            className={`h-6 px-2 text-[10px] ${cols === 3 ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
            onClick={() => setCols(3)}
          >
            <LayoutGrid className="h-3 w-3 mr-0.5" /> 3×2
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Chart:</span>
          <Button
            size="sm"
            variant={chartVariant === 'ema-rsi' ? 'default' : 'ghost'}
            className={`h-6 px-2 text-[10px] ${chartVariant === 'ema-rsi' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
            onClick={() => setChartVariant('ema-rsi')}
          >
            <BarChart3 className="h-3 w-3 mr-0.5" /> EMA+RSI
          </Button>
          <Button
            size="sm"
            variant={chartVariant === 'ema-only' ? 'default' : 'ghost'}
            className={`h-6 px-2 text-[10px] ${chartVariant === 'ema-only' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
            onClick={() => setChartVariant('ema-only')}
          >
            <TrendingUp className="h-3 w-3 mr-0.5" /> EMA Only
          </Button>
        </div>
      </div>

      {/* Chart Grid */}
      <div className={`grid grid-cols-1 gap-2 ${cols === 2 ? 'lg:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
        {(() => {
          const baseCount = pairs.filter(p => p.startsWith(selected)).length;
          const quoteCount = pairs.length - baseCount;
          const majorityIsBase = baseCount >= quoteCount;
          return pairs.map(pair => {
            const isBase = pair.startsWith(selected);
            const isDimmed = isBase !== majorityIsBase;
            return (
              <MiniChart
                key={`${pair}-${interval}-${chartVariant}`}
                symbol={`OANDA:${pair}`}
                pair={pair}
                interval={interval}
                dimmed={isDimmed}
                showRsi={chartVariant === 'ema-rsi'}
                chartHeight={chartHeight}
              />
            );
          });
        })()}
      </div>
    </div>
  );
}
