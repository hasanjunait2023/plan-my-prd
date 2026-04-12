import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CURRENCY_FLAGS } from '@/types/correlation';
import type { CurrencyStrengthRecord } from '@/types/correlation';
import { Newspaper, RefreshCw, CheckCircle2, AlertTriangle, Activity, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BiasData {
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  event: string;
  actual: string;
  forecast: string;
  previous: string;
  impact: string;
  date: string;
}

interface FundamentalBiasProps {
  strengthData?: CurrencyStrengthRecord[];
}

function useFundamentalBias() {
  return useQuery({
    queryKey: ['fundamental-bias'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fundamental-bias');
      if (error) throw error;
      return data as { biases: Record<string, BiasData>; fetchedAt: string };
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}

function getStrengthCategory(strength: number): { label: string; bias: 'Bullish' | 'Bearish' | 'Neutral' } {
  if (strength >= 7) return { label: 'Very Strong', bias: 'Bullish' };
  if (strength >= 4) return { label: 'Strong', bias: 'Bullish' };
  if (strength >= 1) return { label: 'Mild Bull', bias: 'Bullish' };
  if (strength >= -1) return { label: 'Neutral', bias: 'Neutral' };
  if (strength >= -4) return { label: 'Mild Bear', bias: 'Bearish' };
  if (strength >= -7) return { label: 'Weak', bias: 'Bearish' };
  return { label: 'Very Weak', bias: 'Bearish' };
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];

export function FundamentalBias({ strengthData }: FundamentalBiasProps) {
  const { data, isLoading, isFetching } = useFundamentalBias();

  const strengthMap = new Map<string, number>();
  if (strengthData) {
    for (const d of strengthData) {
      strengthMap.set(d.currency, d.strength);
    }
  }

  const alignedCount = data?.biases ? CURRENCIES.filter(c => {
    const bias = data.biases[c];
    if (!bias || bias.bias === 'Neutral') return false;
    const strength = strengthMap.get(c);
    if (strength === undefined) return false;
    return bias.bias === getStrengthCategory(strength).bias;
  }).length : 0;

  const totalActive = data?.biases ? CURRENCIES.filter(c => {
    const bias = data.biases[c];
    return bias && bias.bias !== 'Neutral';
  }).length : 0;

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)] overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-border/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center border border-orange-500/20">
              <Newspaper className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight">Fundamental Bias</CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">News impact vs technical correlation alignment</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {totalActive > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/30 border border-border/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-semibold text-foreground">{alignedCount}/{totalActive}</span>
                <span className="text-[10px] text-muted-foreground">Aligned</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {isFetching && <RefreshCw className="w-3 h-3 animate-spin" />}
              {data?.fetchedAt && (
                <span>{formatDistanceToNow(new Date(data.fetchedAt), { addSuffix: true })}</span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-3 space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded" />
            ))}
          </div>
        ) : !data?.biases || Object.keys(data.biases).length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">কোনো fundamental data পাওয়া যায়নি</p>
            <p className="text-[10px] mt-1">এই সপ্তাহে এখনো কোনো high-impact news release হয়নি।</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/30 hover:bg-transparent bg-accent/5">
                <TableHead className="h-8 px-3 text-[9px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground/60 w-[80px]">Currency</TableHead>
                <TableHead className="h-8 px-2 text-[9px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground/60 w-[64px] text-right">Score</TableHead>
                <TableHead className="h-8 px-2 text-[9px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground/60 w-[100px]">Strength</TableHead>
                <TableHead className="h-8 px-3 text-[9px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground/60">Fundamental Impact</TableHead>
                <TableHead className="h-8 px-3 text-[9px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground/60 w-[96px] text-right">Alignment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CURRENCIES.map(currency => {
                const bias = data.biases[currency];
                if (!bias) return null;

                const strength = strengthMap.get(currency);
                const corrInfo = strength !== undefined ? getStrengthCategory(strength) : null;
                const isAligned = corrInfo !== null && bias.bias !== 'Neutral' && bias.bias === corrInfo.bias;
                const isDivergent = corrInfo !== null && bias.bias !== 'Neutral' && corrInfo.bias !== 'Neutral' && bias.bias !== corrInfo.bias;
                const isNeutralBias = bias.bias === 'Neutral';
                const isBullish = bias.bias === 'Bullish';
                const isBearish = bias.bias === 'Bearish';

                // Determine row accent
                const rowAccent = isAligned
                  ? 'border-l-2 border-l-emerald-500/40'
                  : isDivergent
                  ? 'border-l-2 border-l-orange-500/40'
                  : 'border-l-2 border-l-transparent';

                return (
                  <TableRow
                    key={currency}
                    className={`border-b border-border/10 hover:bg-accent/5 transition-colors ${rowAccent}`}
                  >
                    {/* Currency */}
                    <TableCell className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base leading-none">{CURRENCY_FLAGS[currency]}</span>
                        <span className="font-bold text-[13px] text-foreground">{currency}</span>
                      </div>
                    </TableCell>

                    {/* Score */}
                    <TableCell className="px-2 py-2 text-right">
                      {strength !== undefined ? (
                        <span className={`font-mono text-[13px] font-bold tabular-nums ${
                          strength > 0 ? 'text-emerald-400' : strength < 0 ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {strength > 0 ? '+' : ''}{strength.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/30">—</span>
                      )}
                    </TableCell>

                    {/* Strength */}
                    <TableCell className="px-2 py-2">
                      {corrInfo ? (
                        <div className="flex items-center gap-1">
                          {corrInfo.bias === 'Bullish' && <ArrowUpRight className="w-3 h-3 text-emerald-400 shrink-0" />}
                          {corrInfo.bias === 'Bearish' && <ArrowDownRight className="w-3 h-3 text-red-400 shrink-0" />}
                          {corrInfo.bias === 'Neutral' && <Minus className="w-3 h-3 text-yellow-400 shrink-0" />}
                          <span className={`text-[11px] font-semibold leading-tight ${
                            corrInfo.bias === 'Bullish' ? 'text-emerald-400' :
                            corrInfo.bias === 'Bearish' ? 'text-red-400' :
                            'text-yellow-400'
                          }`}>
                            {corrInfo.label}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/30">—</span>
                      )}
                      {/* Thin strength bar under label */}
                      {strength !== undefined && (
                        <div className="w-14 h-[3px] rounded-full bg-accent/15 overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              (strength ?? 0) >= 0
                                ? 'bg-emerald-400'
                                : 'bg-red-400'
                            }`}
                            style={{ width: `${Math.min(Math.abs(strength ?? 0) * 10, 100)}%` }}
                          />
                        </div>
                      )}
                    </TableCell>

                    {/* Fundamental Impact */}
                    <TableCell className="px-3 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Bias chip */}
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded text-[10px] font-bold leading-none ${
                          isBullish ? 'bg-emerald-500/15 text-emerald-400' :
                          isBearish ? 'bg-red-500/15 text-red-400' :
                          'bg-yellow-500/15 text-yellow-400'
                        }`}>
                          {isBullish ? '▲' : isBearish ? '▼' : '●'} {bias.bias}
                        </span>
                        {/* Impact chip */}
                        <span className={`text-[9px] font-bold px-1.5 py-[1px] rounded leading-none ${
                          bias.impact.toLowerCase() === 'high'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {bias.impact.toUpperCase()}
                        </span>
                      </div>
                      {/* Event name */}
                      <p className="text-[11px] text-foreground/75 mt-0.5 truncate max-w-[260px] leading-tight" title={bias.event}>
                        {bias.event}
                      </p>
                      {/* A / F / P */}
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] leading-none">
                        <span>
                          <span className="text-muted-foreground/50">A:</span>{' '}
                          <span className={`font-bold ${
                            isBullish ? 'text-emerald-400' : isBearish ? 'text-red-400' : 'text-foreground/60'
                          }`}>{bias.actual || '—'}</span>
                        </span>
                        <span className="text-muted-foreground/30">·</span>
                        <span>
                          <span className="text-muted-foreground/50">F:</span>{' '}
                          <span className="text-foreground/40">{bias.forecast || '—'}</span>
                        </span>
                        <span className="text-muted-foreground/30">·</span>
                        <span>
                          <span className="text-muted-foreground/50">P:</span>{' '}
                          <span className="text-foreground/40">{bias.previous || '—'}</span>
                        </span>
                      </div>
                    </TableCell>

                    {/* Alignment */}
                    <TableCell className="px-3 py-2 text-right">
                      {isNeutralBias ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-muted-foreground/50">
                          <Minus className="w-3 h-3" /> Neutral
                        </span>
                      ) : corrInfo === null ? (
                        <span className="text-[11px] text-muted-foreground/30">—</span>
                      ) : isAligned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/12 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Aligned
                        </span>
                      ) : isDivergent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/12 text-orange-400 border border-orange-500/20">
                          <AlertTriangle className="w-3 h-3" /> Divergent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-accent/10 text-muted-foreground/60 border border-border/20">
                          <Activity className="w-3 h-3" /> Mixed
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
