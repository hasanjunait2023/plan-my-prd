import { useEffect, useRef, useState } from 'react';
import { PairWithFlags } from '@/lib/pairFlags';
import { Maximize2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface MiniChartProps {
  symbol: string;
  pair: string;
  interval: string;
}

function TradingViewWidget({ symbol, interval, height }: { symbol: string; interval: string; height: string }) {
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

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}

export function MiniChart({ symbol, pair, interval }: MiniChartProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-border/20 flex items-center justify-between">
          <PairWithFlags pair={pair} className="text-sm font-semibold text-foreground" />
          <button
            onClick={() => setExpanded(true)}
            className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <TradingViewWidget symbol={symbol} interval={interval} height="400px" />
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 border-border/30 bg-card">
          <div className="px-4 py-3 border-b border-border/20">
            <PairWithFlags pair={pair} className="text-base font-semibold text-foreground" />
          </div>
          <div className="flex-1 min-h-0" style={{ height: 'calc(90vh - 52px)' }}>
            <TradingViewWidget symbol={symbol} interval={interval} height="100%" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}