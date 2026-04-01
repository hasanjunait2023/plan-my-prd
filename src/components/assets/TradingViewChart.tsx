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

export function TradingViewChart({ symbol, title }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [interval, setInterval] = useState('60');

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const tvSymbol = TV_SYMBOLS[symbol] || symbol;

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
      symbol: tvSymbol,
      interval: interval,
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
      enable_publishing: false,
      withdateranges: true,
      hide_side_toolbar: false,
      details: false,
      calendar: false,
      show_popup_button: false,
      disabled_features: [],
      enabled_features: ["session_breaks"],
      save_image: false,
      allow_symbol_change: false,
      width: '100%',
      height: '100%',
      support_host: 'https://www.tradingview.com',
    });

    widgetContainer.appendChild(script);
    containerRef.current.appendChild(widgetContainer);
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
