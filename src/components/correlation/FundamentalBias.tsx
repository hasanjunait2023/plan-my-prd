import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CURRENCY_FLAGS } from '@/types/correlation';
import type { CurrencyStrengthRecord } from '@/types/correlation';
import { Newspaper, RefreshCw, CheckCircle2, AlertTriangle, Activity, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

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
      <CardHeader className="py-2.5 px-3 border-b border-border/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center border border-orange-500/20">
              <Newspaper className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold tracking-tight">Fundamental Bias</CardTitle>
              {!isMobile && <p className="text-[9px] text-muted-foreground mt-0.5">News impact vs correlation alignment</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalActive > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/30 border border-border/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-[9px] font-semibold text-foreground">{alignedCount}/{totalActive}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
              {isFetching && <RefreshCw className="w-3 h-3 animate-spin" />}
              {data?.fetchedAt && !isMobile && (
                <span>{formatDistanceToNow(new Date(data.fetchedAt), { addSuffix: true })}</span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-2 space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full rounded" />
            ))}
          </div>
        ) : !data?.biases || Object.keys(data.biases).length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Newspaper className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
            <p className="text-xs font-medium">কোনো fundamental data পাওয়া যায়নি</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="border-b border-border/30 bg-accent/5">
                  <th className={`${isMobile ? 'w-[52px] px-1.5 text-[7px]' : 'w-[72px] px-2.5 text-[8px]'} h-6 font-extrabold uppercase tracking-[0.15em] text-muted-foreground/50`}>Currency</th>
                  <th className={`${isMobile ? 'w-[36px] px-1 text-[7px]' : 'w-[56px] px-2 text-[8px]'} h-6 font-extrabold uppercase tracking-[0.15em] text-muted-foreground/50 text-right`}>Score</th>
                  <th className={`${isMobile ? 'w-[48px] px-1 text-[7px]' : 'w-[80px] px-2 text-[8px]'} h-6 font-extrabold uppercase tracking-[0.15em] text-muted-foreground/50`}>Strength</th>
                  <th className={`${isMobile ? 'px-1.5 text-[7px]' : 'px-2.5 text-[8px]'} h-6 font-extrabold uppercase tracking-[0.15em] text-muted-foreground/50`}>Fundamental</th>
                  <th className={`${isMobile ? 'w-[52px] px-1 text-[7px]' : 'w-[72px] px-2 text-[8px]'} h-6 font-extrabold uppercase tracking-[0.15em] text-muted-foreground/50 text-center`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...CURRENCIES].sort((a, b) => {
                  const biasA = data.biases[a];
                  const biasB = data.biases[b];
                  const strA = strengthMap.get(a);
                  const strB = strengthMap.get(b);
                  const corrA = strA !== undefined ? getStrengthCategory(strA) : null;
                  const corrB = strB !== undefined ? getStrengthCategory(strB) : null;
                  const alignedA = corrA !== null && biasA && biasA.bias !== 'Neutral' && biasA.bias === corrA.bias;
                  const alignedB = corrB !== null && biasB && biasB.bias !== 'Neutral' && biasB.bias === corrB.bias;
                  if (alignedA && !alignedB) return -1;
                  if (!alignedA && alignedB) return 1;
                  return 0;
                }).map(currency => {
                  const bias = data.biases[currency];
                  if (!bias) return null;

                  const strength = strengthMap.get(currency);
                  const corrInfo = strength !== undefined ? getStrengthCategory(strength) : null;
                  const isAligned = corrInfo !== null && bias.bias !== 'Neutral' && bias.bias === corrInfo.bias;
                  const isDivergent = corrInfo !== null && bias.bias !== 'Neutral' && corrInfo.bias !== 'Neutral' && bias.bias !== corrInfo.bias;
                  const isNeutralBias = bias.bias === 'Neutral';
                  const isBullish = bias.bias === 'Bullish';
                  const isBearish = bias.bias === 'Bearish';
                  const isBullishAligned = isAligned && isBullish;
                  const isBearishAligned = isAligned && isBearish;

                  const rowBg = isBullishAligned
                    ? 'bg-emerald-500/[0.06]'
                    : isBearishAligned
                    ? 'bg-red-500/[0.06]'
                    : '';

                  const rowBorder = isAligned
                    ? isBullish ? 'border-l-2 border-l-emerald-500/50' : 'border-l-2 border-l-red-500/50'
                    : isDivergent
                    ? 'border-l-2 border-l-orange-500/40'
                    : 'border-l-2 border-l-transparent';

                  return (
                    <tr
                      key={currency}
                      className={`border-b border-border/10 hover:bg-accent/5 transition-colors ${rowBg} ${rowBorder}`}
                    >
                      {/* Currency */}
                      <td className={`${isMobile ? 'px-1.5 py-1' : 'px-2.5 py-1.5'}`}>
                        <div className="flex items-center gap-1">
                          <span className={`${isMobile ? 'text-sm' : 'text-base'} leading-none`}>{CURRENCY_FLAGS[currency]}</span>
                          <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} ${isAligned ? 'font-extrabold' : 'font-bold'} text-foreground`}>{currency}</span>
                        </div>
                      </td>

                      {/* Score */}
                      <td className={`${isMobile ? 'px-1 py-1' : 'px-2 py-1.5'} text-right`}>
                        {strength !== undefined ? (
                          <span className={`font-mono ${isMobile ? 'text-[10px]' : 'text-[12px]'} font-bold tabular-nums ${
                            strength > 0 ? 'text-emerald-400' : strength < 0 ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {strength > 0 ? '+' : ''}{strength.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/30">—</span>
                        )}
                      </td>

                      {/* Strength */}
                      <td className={`${isMobile ? 'px-1 py-1' : 'px-2 py-1.5'}`}>
                        {corrInfo ? (
                          <div className="flex items-center gap-0.5">
                            {corrInfo.bias === 'Bullish' && <ArrowUpRight className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-emerald-400 shrink-0`} />}
                            {corrInfo.bias === 'Bearish' && <ArrowDownRight className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-red-400 shrink-0`} />}
                            {corrInfo.bias === 'Neutral' && <Minus className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-yellow-400 shrink-0`} />}
                            <span className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} font-semibold leading-tight ${
                              corrInfo.bias === 'Bullish' ? 'text-emerald-400' :
                              corrInfo.bias === 'Bearish' ? 'text-red-400' :
                              'text-yellow-400'
                            }`}>
                              {isMobile ? corrInfo.label.split(' ')[0] : corrInfo.label}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/30">—</span>
                        )}
                        {/* Strength bar - desktop only */}
                        {!isMobile && strength !== undefined && (
                          <div className="w-12 h-[2px] rounded-full bg-accent/15 overflow-hidden mt-0.5">
                            <div
                              className={`h-full rounded-full ${(strength ?? 0) >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(Math.abs(strength ?? 0) * 10, 100)}%` }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Fundamental Impact */}
                      <td className={`${isMobile ? 'px-1.5 py-1' : 'px-2.5 py-1.5'}`}>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`inline-flex items-center gap-0.5 px-1 py-[1px] rounded ${isMobile ? 'text-[8px]' : 'text-[9px]'} font-bold leading-none ${
                            isBullish ? 'bg-emerald-500/15 text-emerald-400' :
                            isBearish ? 'bg-red-500/15 text-red-400' :
                            'bg-yellow-500/15 text-yellow-400'
                          }`}>
                            {isBullish ? '▲' : isBearish ? '▼' : '●'} {bias.bias}
                          </span>
                          <span className={`${isMobile ? 'text-[7px]' : 'text-[8px]'} font-bold px-1 py-[1px] rounded leading-none ${
                            bias.impact.toLowerCase() === 'high'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {bias.impact.toUpperCase()}
                          </span>
                        </div>
                        <p className={`${isMobile ? 'text-[8px] max-w-[120px]' : 'text-[10px] max-w-[220px]'} text-foreground/70 mt-0.5 truncate leading-tight`} title={bias.event}>
                          {bias.event}
                        </p>
                        {/* A/F/P - desktop only */}
                        {!isMobile && (
                          <div className="flex items-center gap-1.5 mt-0.5 text-[9px] leading-none">
                            <span>
                              <span className="text-muted-foreground/40">A:</span>{' '}
                              <span className={`font-bold ${isBullish ? 'text-emerald-400' : isBearish ? 'text-red-400' : 'text-foreground/50'}`}>{bias.actual || '—'}</span>
                            </span>
                            <span className="text-muted-foreground/20">·</span>
                            <span>
                              <span className="text-muted-foreground/40">F:</span>{' '}
                              <span className="text-foreground/35">{bias.forecast || '—'}</span>
                            </span>
                            <span className="text-muted-foreground/20">·</span>
                            <span>
                              <span className="text-muted-foreground/40">P:</span>{' '}
                              <span className="text-foreground/35">{bias.previous || '—'}</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Alignment */}
                      <td className={`${isMobile ? 'px-1 py-1' : 'px-2 py-1.5'} text-center`}>
                        {isNeutralBias ? (
                          <span className={`inline-flex items-center gap-0.5 ${isMobile ? 'text-[7px]' : 'text-[9px]'} text-muted-foreground/40`}>
                            <Minus className="w-2.5 h-2.5" /> <span className="hidden sm:inline">Neutral</span>
                          </span>
                        ) : corrInfo === null ? (
                          <span className="text-[9px] text-muted-foreground/30">—</span>
                        ) : isAligned ? (
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${isMobile ? 'text-[7px]' : 'text-[9px]'} font-bold border ${
                            isBullish
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                              : 'bg-red-500/15 text-red-400 border-red-500/25'
                          }`}>
                            <CheckCircle2 className="w-2.5 h-2.5" /> {isMobile ? '✓' : 'Aligned'}
                          </span>
                        ) : isDivergent ? (
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${isMobile ? 'text-[7px]' : 'text-[9px]'} font-bold bg-orange-500/12 text-orange-400 border border-orange-500/20`}>
                            <AlertTriangle className="w-2.5 h-2.5" /> {isMobile ? '⚠' : 'Divergent'}
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${isMobile ? 'text-[7px]' : 'text-[9px]'} text-muted-foreground/50 bg-accent/10 border border-border/15`}>
                            <Activity className="w-2.5 h-2.5" /> {isMobile ? '~' : 'Mixed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
