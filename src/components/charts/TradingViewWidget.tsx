import { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  interval: string;
  showRsi?: boolean;
}

function TradingViewWidgetInner({ symbol, interval, showRsi = true }: TradingViewWidgetProps) {
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

    const studies: any[] = [
      { id: 'MAExp@tv-basicstudies', inputs: { length: 9 } },
      { id: 'MAExp@tv-basicstudies', inputs: { length: 15 } },
      { id: 'MAExp@tv-basicstudies', inputs: { length: 200 } },
    ];
    if (showRsi) {
      studies.push({ id: 'RSI@tv-basicstudies' });
    }

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
      studies,
      hide_top_toolbar: true,
      hide_legend: false,
      enable_publishing: false,
      withdateranges: false,
      hide_side_toolbar: true,
      hide_volume: false,
      details: false,
      calendar: false,
      show_popup_button: true,
      popup_width: '1200',
      popup_height: '800',
      allow_symbol_change: false,
      save_image: true,
      disabled_features: [],
      enabled_features: ["session_breaks"],
      width: '100%',
      height: '100%',
      support_host: 'https://www.tradingview.com',
    });

    widgetContainer.appendChild(script);
    containerRef.current.appendChild(widgetContainer);
  }, [symbol, interval, showRsi]);

  return <div ref={containerRef} className="w-full h-full overflow-hidden" />;
}

export default memo(TradingViewWidgetInner);
