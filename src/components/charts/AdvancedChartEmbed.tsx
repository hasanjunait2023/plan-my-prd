import { useEffect, useRef, memo } from 'react';

interface AdvancedChartEmbedProps {
  symbol: string;
  interval: string;        // "3" | "15" | "60" | "240" | "D"
  height?: number | string;
  range?: string;          // override range mapping
  hideTopToolbar?: boolean;
  hideSideToolbar?: boolean;
}

/**
 * Reusable TradingView Advanced Chart with EMA 9/15/200 + RSI.
 * Keeps a "close-up" range based on selected timeframe by default.
 */
function AdvancedChartEmbedInner({
  symbol,
  interval,
  height = '100%',
  range,
  hideTopToolbar = false,
  hideSideToolbar = false,
}: AdvancedChartEmbedProps) {
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

    // Tighter zoom — show fewer bars per timeframe
    const rangeMap: Record<string, string> = {
      '3': '4H',
      '15': '1D',
      '60': '2D',
      '240': '5D',
      'D': '1M',
    };
    const finalRange = range ?? rangeMap[interval] ?? '2D';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.type = 'text/javascript';
    script.innerHTML = JSON.stringify({
      symbol,
      interval,
      range: finalRange,
      theme: 'dark',
      style: '1',
      locale: 'en',
      timezone: 'Etc/UTC',
      studies: [
        { id: 'MAExp@tv-basicstudies', inputs: { length: 9 } },
        { id: 'MAExp@tv-basicstudies', inputs: { length: 15 } },
        { id: 'MAExp@tv-basicstudies', inputs: { length: 200 } },
        { id: 'Volume@tv-basicstudies' },
        { id: 'RSI@tv-basicstudies' },
      ],
      hide_top_toolbar: hideTopToolbar,
      hide_legend: false,
      enable_publishing: false,
      withdateranges: true,
      hide_side_toolbar: hideSideToolbar,
      hide_volume: true,
      favorites: {
        intervals: ['1', '3', '15', '60', '240'],
      },
      details: true,
      calendar: false,
      show_popup_button: true,
      popup_width: '1200',
      popup_height: '800',
      allow_symbol_change: false,
      save_image: true,
      width: '100%',
      height: '100%',
      support_host: 'https://www.tradingview.com',
    });

    widgetContainer.appendChild(script);
    containerRef.current.appendChild(widgetContainer);
  }, [symbol, interval, range, hideTopToolbar, hideSideToolbar]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    />
  );
}

export default memo(AdvancedChartEmbedInner);
