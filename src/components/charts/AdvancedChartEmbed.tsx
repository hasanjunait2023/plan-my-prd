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
  hideTopToolbar = true,
  hideSideToolbar = true,
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
        { id: 'RSI@tv-basicstudies' },
        { id: 'Volume@tv-basicstudies' },
      ],
      studies_overrides: {
        // EMA — colors set per study (TradingView shares this key, so individual EMA colors
        // need to be tweaked from the chart UI; we set the dominant 200 EMA look here).
        'moving average exponential.plot.color': '#a855f7',
        'moving average exponential.plot.linewidth': 2,
        // RSI — compact style
        'relative strength index.plot.color': '#eab308',
        'relative strength index.plot.linewidth': 1,
        'relative strength index.upper band.color': '#64748b',
        'relative strength index.lower band.color': '#64748b',
        'relative strength index.hlines background.color': 'rgba(100,116,139,0.05)',
        // Volume — separate pane (default), red/green bars
        'volume.volume.color.0': '#ef4444',
        'volume.volume.color.1': '#22c55e',
        'volume.volume ma.visible': false,
      },
      overrides: {
        'paneProperties.legendProperties.showStudyTitles': true,
        'paneProperties.legendProperties.showStudyValues': true,
        'scalesProperties.showSeriesLastValue': true,
        // Countdown to bar close on price scale
        'scalesProperties.showSymbolLabels': false,
      },
      hide_top_toolbar: hideTopToolbar,
      hide_legend: false,
      enable_publishing: false,
      withdateranges: false,
      hide_side_toolbar: hideSideToolbar,
      details: false,
      calendar: false,
      show_popup_button: true,
      popup_width: '1200',
      popup_height: '800',
      allow_symbol_change: false,
      save_image: true,
      enabled_features: ['countdown', 'study_templates'],
      time_frames: [
        { text: '1D', resolution: interval, description: '1 Day' },
      ],
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
