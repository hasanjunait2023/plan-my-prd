import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, Layers, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { CurrencyStrengthRecord, generatePairSuggestions } from '@/types/correlation';

interface Zone {
  high: number;
  low: number;
  freshness: 'Fresh' | 'Tested' | 'Broken';
}

interface ZoneResult {
  pair: string;
  direction: 'BUY' | 'SELL';
  demandZone: Zone | null;
  supplyZone: Zone | null;
  currentPrice: number | null;
  proximity: 'Near DZ' | 'Near SZ' | 'Mid Range' | 'Wrong Zone' | 'No Data';
  priceRange: { chartHigh: number; chartLow: number } | null;
}

interface SupplyDemandPanelProps {
  strengthData?: CurrencyStrengthRecord[];
}

const PROXIMITY_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  'Near DZ': { icon: '🟢', color: 'text-emerald-400', bg: 'bg-emerald-500/[0.08]' },
  'Near SZ': { icon: '🟢', color: 'text-emerald-400', bg: 'bg-emerald-500/[0.08]' },
  'Mid Range': { icon: '⏳', color: 'text-amber-400', bg: '' },
  'Wrong Zone': { icon: '⚠️', color: 'text-red-400', bg: 'bg-red-500/[0.06]' },
  'No Data': { icon: '—', color: 'text-muted-foreground', bg: '' },
};

function ZoneOverlayChart({ result }: { result: ZoneResult }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const symbol = `FX:${result.pair.replace('/', '')}`;
  const chartHeight = isMobile ? 200 : 350;

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current.querySelector('.tv-widget-wrap');
    if (el) el.remove();

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tv-widget-wrap tradingview-widget-container';
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
      interval: '60',
      theme: 'dark',
      style: '1',
      locale: 'en',
      timezone: 'Etc/UTC',
      hide_top_toolbar: true,
      hide_legend: true,
      hide_side_toolbar: true,
      enable_publishing: false,
      withdateranges: false,
      details: false,
      calendar: false,
      show_popup_button: false,
      save_image: false,
      allow_symbol_change: false,
      width: '100%',
      height: '100%',
      support_host: 'https://www.tradingview.com',
    });

    widgetContainer.appendChild(script);
    containerRef.current.appendChild(widgetContainer);
  }, [symbol]);

  // Calculate overlay band positions
  const { demandZone, supplyZone, priceRange } = result;
  const range = priceRange ? priceRange.chartHigh - priceRange.chartLow : 0;

  const demandBand = demandZone && priceRange && range > 0
    ? {
        bottom: ((demandZone.low - priceRange.chartLow) / range) * 100,
        height: ((demandZone.high - demandZone.low) / range) * 100,
      }
    : null;

  const supplyBand = supplyZone && priceRange && range > 0
    ? {
        bottom: ((supplyZone.low - priceRange.chartLow) / range) * 100,
        height: ((supplyZone.high - supplyZone.low) / range) * 100,
      }
    : null;

  // Chart area offsets (approximate TradingView padding)
  const chartTopPad = 8; // % from top
  const chartBottomPad = 12; // % from bottom
  const chartArea = 100 - chartTopPad - chartBottomPad;

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border/20" style={{ height: chartHeight }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Demand Zone overlay (green) */}
      {demandBand && (
        <div
          className="absolute left-0 right-0 pointer-events-none border-y border-emerald-500/40"
          style={{
            bottom: `${chartBottomPad + (demandBand.bottom / 100) * chartArea}%`,
            height: `${Math.max((demandBand.height / 100) * chartArea, 0.5)}%`,
            background: 'linear-gradient(180deg, hsla(142,71%,45%,0.12) 0%, hsla(142,71%,45%,0.06) 100%)',
          }}
        >
          <span className="absolute -top-4 left-2 text-[9px] font-bold text-emerald-400/80 bg-card/80 px-1 rounded">
            DZ {demandZone!.freshness === 'Fresh' ? '✦' : ''}
          </span>
        </div>
      )}

      {/* Supply Zone overlay (red) */}
      {supplyBand && (
        <div
          className="absolute left-0 right-0 pointer-events-none border-y border-red-500/40"
          style={{
            bottom: `${chartBottomPad + (supplyBand.bottom / 100) * chartArea}%`,
            height: `${Math.max((supplyBand.height / 100) * chartArea, 0.5)}%`,
            background: 'linear-gradient(180deg, hsla(0,84%,60%,0.12) 0%, hsla(0,84%,60%,0.06) 100%)',
          }}
        >
          <span className="absolute -top-4 right-2 text-[9px] font-bold text-red-400/80 bg-card/80 px-1 rounded">
            SZ {supplyZone!.freshness === 'Fresh' ? '✦' : ''}
          </span>
        </div>
      )}

      {/* Zone levels sidebar */}
      <div className="absolute top-2 right-2 z-10 bg-card/90 backdrop-blur-sm border border-border/30 rounded-md px-2 py-1.5 space-y-1">
        {demandZone && (
          <div className="text-[9px] font-mono">
            <span className="text-emerald-400 font-bold">DZ:</span>{' '}
            <span className="text-muted-foreground">{demandZone.low.toFixed(result.pair.includes('JPY') ? 3 : 5)} – {demandZone.high.toFixed(result.pair.includes('JPY') ? 3 : 5)}</span>
            <Badge className={`ml-1 text-[7px] px-1 py-0 ${demandZone.freshness === 'Fresh' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-muted/20 text-muted-foreground border-border/30'}`}>
              {demandZone.freshness}
            </Badge>
          </div>
        )}
        {supplyZone && (
          <div className="text-[9px] font-mono">
            <span className="text-red-400 font-bold">SZ:</span>{' '}
            <span className="text-muted-foreground">{supplyZone.low.toFixed(result.pair.includes('JPY') ? 3 : 5)} – {supplyZone.high.toFixed(result.pair.includes('JPY') ? 3 : 5)}</span>
            <Badge className={`ml-1 text-[7px] px-1 py-0 ${supplyZone.freshness === 'Fresh' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-muted/20 text-muted-foreground border-border/30'}`}>
              {supplyZone.freshness}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

export function SupplyDemandPanel({ strengthData }: SupplyDemandPanelProps) {
  const isMobile = useIsMobile();
  const [expandedPair, setExpandedPair] = useState<string | null>(null);
  const suggestions = strengthData ? generatePairSuggestions(strengthData) : [];
  const top8 = suggestions.slice(0, 8);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['supply-demand-zones', top8.map(p => p.pair).join(',')],
    queryFn: async () => {
      if (top8.length === 0) return [] as ZoneResult[];
      const { data, error } = await supabase.functions.invoke('supply-demand-zones', {
        body: {
          pairs: top8.map(p => ({ pair: p.pair, direction: p.direction })),
        },
      });
      if (error) throw error;
      return (data?.zones || []) as ZoneResult[];
    },
    enabled: top8.length > 0,
    refetchInterval: 180000,
    staleTime: 120000,
  });

  const results = data || [];
  const nearZoneCount = results.filter(r => r.proximity === 'Near DZ' || r.proximity === 'Near SZ').length;

  const formatPrice = (price: number | null, pair: string) => {
    if (price === null) return '—';
    const isJpy = pair.includes('JPY');
    return price.toFixed(isJpy ? 3 : 5);
  };

  const formatZone = (zone: Zone | null, pair: string) => {
    if (!zone) return '—';
    const isJpy = pair.includes('JPY');
    const dec = isJpy ? 3 : 5;
    return `${zone.low.toFixed(dec)} – ${zone.high.toFixed(dec)}`;
  };

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]">
      <CardHeader className={`${isMobile ? 'px-3 py-2.5' : 'pb-3'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-violet-500/10 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div>
              <CardTitle className={`${isMobile ? 'text-sm' : 'text-base'} font-bold tracking-tight`}>
                Supply & Demand Zones
              </CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Aligned Pairs — Swing-Based S/D Detection (1H)
                {nearZoneCount > 0 && (
                  <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0">
                    {nearZoneCount} Near Zone
                  </Badge>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className={`${isMobile ? 'px-1.5 pb-2' : 'pt-0'}`}>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">কোনো pair suggestion নেই — Strength data লোড হলে দেখাবে</p>
          </div>
        ) : (
          <div className="space-y-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/20 hover:bg-transparent">
                    <TableHead className={`${isMobile ? 'text-[8px] px-1.5 py-1' : 'text-[11px] px-3 py-2'} font-bold text-muted-foreground`}>Pair</TableHead>
                    <TableHead className={`${isMobile ? 'text-[8px] px-1.5 py-1' : 'text-[11px] px-3 py-2'} font-bold text-muted-foreground`}>Bias</TableHead>
                    {!isMobile && (
                      <>
                        <TableHead className="text-[11px] px-3 py-2 font-bold text-muted-foreground">Demand Zone</TableHead>
                        <TableHead className="text-[11px] px-3 py-2 font-bold text-muted-foreground">Supply Zone</TableHead>
                      </>
                    )}
                    <TableHead className={`${isMobile ? 'text-[8px] px-1.5 py-1' : 'text-[11px] px-3 py-2'} font-bold text-muted-foreground text-right`}>Price</TableHead>
                    <TableHead className={`${isMobile ? 'text-[8px] px-1.5 py-1' : 'text-[11px] px-3 py-2'} font-bold text-muted-foreground text-center`}>Proximity</TableHead>
                    <TableHead className={`${isMobile ? 'text-[8px] px-1.5 py-1' : 'text-[11px] px-3 py-2'} font-bold text-muted-foreground text-center`}>Chart</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => {
                    const config = PROXIMITY_CONFIG[r.proximity] || PROXIMITY_CONFIG['No Data'];
                    const isNearZone = r.proximity === 'Near DZ' || r.proximity === 'Near SZ';
                    const isExpanded = expandedPair === r.pair;

                    return (
                      <>
                        <TableRow
                          key={r.pair}
                          className={`border-border/10 ${config.bg} transition-colors cursor-pointer`}
                          onClick={() => setExpandedPair(isExpanded ? null : r.pair)}
                        >
                          <TableCell className={`${isMobile ? 'text-[9px] px-1.5 py-1' : 'text-xs px-3 py-2'} ${isNearZone ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                            {r.pair}
                          </TableCell>
                          <TableCell className={`${isMobile ? 'text-[9px] px-1.5 py-1' : 'text-xs px-3 py-2'}`}>
                            <span className={`font-semibold ${r.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {r.direction === 'BUY' ? '▲' : '▼'} {r.direction}
                            </span>
                          </TableCell>
                          {!isMobile && (
                            <>
                              <TableCell className="text-xs px-3 py-2 font-mono text-emerald-400/80">
                                {formatZone(r.demandZone, r.pair)}
                                {r.demandZone?.freshness === 'Fresh' && (
                                  <span className="ml-1 text-[8px] text-emerald-400">✦</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs px-3 py-2 font-mono text-red-400/80">
                                {formatZone(r.supplyZone, r.pair)}
                                {r.supplyZone?.freshness === 'Fresh' && (
                                  <span className="ml-1 text-[8px] text-red-400">✦</span>
                                )}
                              </TableCell>
                            </>
                          )}
                          <TableCell className={`${isMobile ? 'text-[9px] px-1.5 py-1' : 'text-xs px-3 py-2'} text-right font-mono ${isNearZone ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                            {formatPrice(r.currentPrice, r.pair)}
                          </TableCell>
                          <TableCell className={`${isMobile ? 'text-[9px] px-1.5 py-1' : 'text-xs px-3 py-2'} text-center`}>
                            <span className={`${config.color} font-bold`}>
                              {config.icon} {isMobile ? '' : r.proximity}
                            </span>
                          </TableCell>
                          <TableCell className={`${isMobile ? 'text-[9px] px-1.5 py-1' : 'text-xs px-3 py-2'} text-center`}>
                            <ChevronDown className={`w-3.5 h-3.5 mx-auto text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${r.pair}-chart`} className="border-border/10">
                            <TableCell colSpan={isMobile ? 5 : 7} className="p-2">
                              <ZoneOverlayChart result={r} />
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
