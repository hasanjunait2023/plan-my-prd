import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TradingViewChartProps {
  symbol: string;
  title: string;
}

const TV_SYMBOLS: Record<string, string> = {
  XAUUSD: 'OANDA:XAUUSD',
  XAGUSD: 'OANDA:XAGUSD',
  USOIL: 'TVC:USOIL',
  BTCUSD: 'BINANCE:BTCUSDT',
};

const TIMEFRAMES = [
  { label: '3M', value: '3' },
  { label: '15M', value: '15' },
  { label: '1H', value: '60' },
];

const STUDIES = encodeURIComponent(JSON.stringify([
  "MAExp@tv-basicstudies|{\"length\":9}",
  "MAExp@tv-basicstudies|{\"length\":15}",
  "MAExp@tv-basicstudies|{\"length\":200}",
  "RSI@tv-basicstudies",
]));

export function TradingViewChart({ symbol, title }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [interval, setInterval] = useState('60');

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const tvSymbol = TV_SYMBOLS[symbol] || symbol;
    const widgetHtml = `
      <div class="tradingview-widget-container" style="height:100%;width:100%">
        <iframe
          scrolling="no"
          allowtransparency="true"
          frameborder="0"
          src="https://s.tradingview.com/widgetembed/?hideideas=1&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost&utm_medium=widget_new&utm_campaign=chart&utm_term=${encodeURIComponent(tvSymbol)}#%7B%22symbol%22%3A%22${encodeURIComponent(tvSymbol)}%22%2C%22frameElementId%22%3A%22tv_${symbol}%22%2C%22interval%22%3A%22${interval}%22%2C%22hide_top_toolbar%22%3A%221%22%2C%22hide_legend%22%3A%220%22%2C%22save_image%22%3A%220%22%2C%22studies%22%3A${STUDIES}%2C%22theme%22%3A%22dark%22%2C%22style%22%3A%221%22%2C%22timezone%22%3A%22Etc%2FUTC%22%2C%22withdateranges%22%3A%221%22%2C%22studies_overrides%22%3A%7B%7D%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%7D"
          style="width:100%;height:100%;"
        ></iframe>
      </div>
    `;
    containerRef.current.innerHTML = widgetHtml;
  }, [symbol, interval]);

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
        <div className="flex gap-1">
          {TIMEFRAMES.map(tf => (
            <Button
              key={tf.value}
              size="sm"
              variant={interval === tf.value ? 'default' : 'ghost'}
              className={`h-7 px-2.5 text-xs ${interval === tf.value ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
              onClick={() => setInterval(tf.value)}
            >
              {tf.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0 px-2 pb-2">
        <div ref={containerRef} className="w-full h-[350px] md:h-[420px] rounded-lg overflow-hidden" />
      </CardContent>
    </Card>
  );
}
