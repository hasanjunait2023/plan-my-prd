import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Zap } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { PairSuggestion, CurrencyStrengthRecord, generatePairSuggestions } from '@/types/correlation';

interface PowerGrabResult {
  pair: string;
  direction: 'BUY' | 'SELL';
  nyHigh: number | null;
  nyLow: number | null;
  currentPrice: number | null;
  breakStatus: 'HH Break' | 'LL Break' | 'In Range' | 'Counter Move' | 'No Data';
}

interface PowerGrabPanelProps {
  strengthData?: CurrencyStrengthRecord[];
}

const STATUS_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  'HH Break': { icon: '🟢', color: 'text-emerald-400', bg: 'bg-emerald-500/[0.08]', border: 'border-l-emerald-500/50' },
  'LL Break': { icon: '🟢', color: 'text-emerald-400', bg: 'bg-emerald-500/[0.08]', border: 'border-l-emerald-500/50' },
  'In Range': { icon: '⏳', color: 'text-amber-400', bg: '', border: 'border-l-transparent' },
  'Counter Move': { icon: '⚠️', color: 'text-red-400', bg: 'bg-red-500/[0.06]', border: 'border-l-red-500/50' },
  'No Data': { icon: '—', color: 'text-muted-foreground', bg: '', border: 'border-l-transparent' },
};

export function PowerGrabPanel({ strengthData }: PowerGrabPanelProps) {
  const isMobile = useIsMobile();
  const suggestions = strengthData ? generatePairSuggestions(strengthData) : [];
  const top8 = suggestions.slice(0, 8);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['ny-session-breaks', top8.map(p => p.pair).join(',')],
    queryFn: async () => {
      if (top8.length === 0) return [] as PowerGrabResult[];
      const { data, error } = await supabase.functions.invoke('ny-session-breaks', {
        body: {
          pairs: top8.map(p => ({ pair: p.pair, direction: p.direction })),
        },
      });
      if (error) throw error;
      return (data?.pairs || []) as PowerGrabResult[];
    },
    enabled: top8.length > 0,
    refetchInterval: 120000,
    staleTime: 60000,
  });

  const results = data || [];
  const powerGrabCount = results.filter(r => r.breakStatus === 'HH Break' || r.breakStatus === 'LL Break').length;

  const formatPrice = (price: number | null, pair: string) => {
    if (price === null) return '—';
    const isJpy = pair.includes('JPY');
    return price.toFixed(isJpy ? 3 : 5);
  };

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]">
      <CardHeader className={`${isMobile ? 'px-3 py-2.5' : 'pb-3'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div>
              <CardTitle className={`${isMobile ? 'text-sm' : 'text-base'} font-bold tracking-tight`}>
                NY Power Grab
              </CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                গতকালের NY Session H/L Break Status
                {powerGrabCount > 0 && (
                  <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0">
                    {powerGrabCount} Confirmed
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
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">কোনো pair suggestion নেই — Strength data লোড হলে দেখাবে</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/20 hover:bg-transparent">
                  <TableHead className={`${isMobile ? 'text-[8px] px-1.5 py-1' : 'text-[11px] px-3 py-2'} font-bold text-muted-foreground`}>Pair</TableHead>
                  <TableHead className={`${isMobile ? 'text-[8px] px-1.5 py-1' : 'text-[11px] px-3 py-2'} font-bold text-muted-foreground`}>Bias</TableHead>
                  {!isMobile && (
                    <>
                      <TableHead className="text-[11px] px-3 py-2 font-bold text-muted-foreground text-right">NY High</TableHead>
                      <TableHead className="text-[11px] px-3 py-2 font-bold text-muted-foreground text-right">NY Low</TableHead>
                    </>
                  )}
                  <TableHead className={`${isMobile ? 'text-[8px] px-1.5 py-1' : 'text-[11px] px-3 py-2'} font-bold text-muted-foreground text-right`}>Price</TableHead>
                  <TableHead className={`${isMobile ? 'text-[8px] px-1.5 py-1' : 'text-[11px] px-3 py-2'} font-bold text-muted-foreground text-center`}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => {
                  const config = STATUS_CONFIG[r.breakStatus] || STATUS_CONFIG['No Data'];
                  const isPowerGrab = r.breakStatus === 'HH Break' || r.breakStatus === 'LL Break';

                  return (
                    <TableRow
                      key={r.pair}
                      className={`border-border/10 border-l-2 ${config.border} ${config.bg} transition-colors`}
                    >
                      <TableCell className={`${isMobile ? 'text-[9px] px-1.5 py-1' : 'text-xs px-3 py-2'} ${isPowerGrab ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                        {r.pair}
                      </TableCell>
                      <TableCell className={`${isMobile ? 'text-[9px] px-1.5 py-1' : 'text-xs px-3 py-2'}`}>
                        <span className={`font-semibold ${r.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {r.direction === 'BUY' ? '▲' : '▼'} {r.direction}
                        </span>
                      </TableCell>
                      {!isMobile && (
                        <>
                          <TableCell className="text-xs px-3 py-2 text-right font-mono text-muted-foreground">
                            {formatPrice(r.nyHigh, r.pair)}
                          </TableCell>
                          <TableCell className="text-xs px-3 py-2 text-right font-mono text-muted-foreground">
                            {formatPrice(r.nyLow, r.pair)}
                          </TableCell>
                        </>
                      )}
                      <TableCell className={`${isMobile ? 'text-[9px] px-1.5 py-1' : 'text-xs px-3 py-2'} text-right font-mono ${isPowerGrab ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                        {formatPrice(r.currentPrice, r.pair)}
                      </TableCell>
                      <TableCell className={`${isMobile ? 'text-[9px] px-1.5 py-1' : 'text-xs px-3 py-2'} text-center`}>
                        <span className={`${config.color} font-bold`}>
                          {config.icon} {isMobile ? '' : r.breakStatus}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
