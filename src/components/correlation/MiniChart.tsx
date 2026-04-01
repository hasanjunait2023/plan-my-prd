import { useEffect, useRef } from 'react';
import { PairWithFlags } from '@/lib/pairFlags';

interface MiniChartProps {
  symbol: string;
  pair: string;
  interval: string;
}

export function MiniChart({ symbol, pair, interval }: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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
        { id: "MAExp@tv-basicstudies", inputs: { length: 9 } },
        { id: "MAExp@tv-basicstudies", inputs: { length: 15 } },
        { id: "MAExp@tv-basicstudies", inputs: { length: 200 } },
        { id: "RSI@tv-basicstudies" },
      ],
      hide_top_toolbar: true,
      hide_legend: false,
      hide_side_toolbar: true,
      enable_publishing: false,
      withdateranges: false,
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
    <div className="rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-border/20">
        <PairWithFlags pair={pair} className="text-sm font-semibold text-foreground" />
      </div>
      <div ref={containerRef} className="w-full h-[250px]" />
    </div>
  );
}
