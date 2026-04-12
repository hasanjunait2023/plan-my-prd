import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CURRENCY_FLAGS } from '@/types/correlation';
import type { CurrencyStrengthRecord } from '@/types/correlation';
import { Newspaper, TrendingUp, TrendingDown, Minus, RefreshCw, ArrowUpRight, ArrowDownRight, Activity, CheckCircle2, AlertTriangle, BarChart3 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

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

function getStrengthBarWidth(strength: number): number {
  return Math.min(Math.abs(strength) * 10, 100);
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
    const corrBias = getStrengthCategory(strength).bias;
    return bias.bias === corrBias;
  }).length : 0;

  const totalActive = data?.biases ? CURRENCIES.filter(c => {
    const bias = data.biases[c];
    return bias && bias.bias !== 'Neutral';
  }).length : 0;

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)] overflow-hidden">
      <CardHeader className="pb-2 border-b border-border/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center border border-orange-500/20">
              <Newspaper className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight">Fundamental Bias</CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">Latest news impact on each currency</p>
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
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : !data?.biases || Object.keys(data.biases).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">কোনো fundamental data পাওয়া যায়নি</p>
            <p className="text-[10px] mt-1">এই সপ্তাহে এখনো কোনো high-impact news release হয়নি।</p>
          </div>
        ) : (
          <div className="divide-y divide-border/10">
            {CURRENCIES.map(currency => {
              const bias = data.biases[currency];
              if (!bias) return null;

              const strength = strengthMap.get(currency);
              const corrInfo = strength !== undefined ? getStrengthCategory(strength) : null;
              const isAligned = corrInfo !== null && bias.bias !== 'Neutral' && bias.bias === corrInfo.bias;
              const isDivergent = corrInfo !== null && bias.bias !== 'Neutral' && corrInfo.bias !== 'Neutral' && bias.bias !== corrInfo.bias;
              const barWidth = strength !== undefined ? getStrengthBarWidth(strength) : 0;

              const isBullish = bias.bias === 'Bullish';
              const isBearish = bias.bias === 'Bearish';

              return (
                <div
                  key={currency}
                  className="px-4 py-3 hover:bg-accent/5 transition-colors relative group"
                >
                  {/* Subtle left accent bar */}
                  <div className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full ${
                    isBullish ? 'bg-emerald-500' : isBearish ? 'bg-red-500' : 'bg-yellow-500/60'
                  }`} />

                  {/* Row 1: Currency + Bias + Alignment */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 min-w-[72px]">
                        <span className="text-xl leading-none">{CURRENCY_FLAGS[currency]}</span>
                        <span className="font-bold text-sm text-foreground tracking-wide">{currency}</span>
                      </div>

                      {/* Fundamental bias badge */}
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        isBullish ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                        isBearish ? 'bg-red-500/15 text-red-400 border border-red-500/25' :
                        'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25'
                      }`}>
                        {isBullish && <ArrowUpRight className="w-3.5 h-3.5" />}
                        {isBearish && <ArrowDownRight className="w-3.5 h-3.5" />}
                        {bias.bias === 'Neutral' && <Minus className="w-3.5 h-3.5" />}
                        <span>{bias.bias}</span>
                      </div>

                      {/* Impact badge */}
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 h-4 font-semibold ${
                          bias.impact.toLowerCase() === 'high'
                            ? 'border-red-500/40 text-red-400 bg-red-500/5'
                            : 'border-yellow-500/40 text-yellow-400 bg-yellow-500/5'
                        }`}
                      >
                        {bias.impact}
                      </Badge>
                    </div>

                    {/* Alignment indicator */}
                    <div className="flex items-center gap-2">
                      {corrInfo && bias.bias !== 'Neutral' && (
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isAligned
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isDivergent
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                            : 'bg-accent/20 text-muted-foreground border border-border/30'
                        }`}>
                          {isAligned ? (
                            <><CheckCircle2 className="w-3 h-3" /> Aligned</>
                          ) : isDivergent ? (
                            <><AlertTriangle className="w-3 h-3" /> Divergent</>
                          ) : (
                            <><Activity className="w-3 h-3" /> Mixed</>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 2: News detail + Correlation bar */}
                  <div className="flex items-end justify-between gap-4">
                    {/* News info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground/80 truncate">
                        {bias.event}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground">Actual:</span>
                          <span className={`text-[11px] font-bold ${
                            isBullish ? 'text-emerald-400' : isBearish ? 'text-red-400' : 'text-yellow-400'
                          }`}>{bias.actual}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground">Forecast:</span>
                          <span className="text-[11px] font-medium text-foreground/60">{bias.forecast || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground">Previous:</span>
                          <span className="text-[11px] font-medium text-foreground/60">{bias.previous || '—'}</span>
                        </div>
                        {bias.date && (
                          <span className="text-[9px] text-muted-foreground/50 ml-auto hidden sm:block">
                            {format(new Date(bias.date), 'MMM dd, HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Correlation strength mini gauge */}
                    {strength !== undefined && (
                      <div className="flex flex-col items-end gap-1 min-w-[120px]">
                        <div className="flex items-center gap-1.5 w-full justify-end">
                          <BarChart3 className="w-3 h-3 text-muted-foreground/50" />
                          <span className="text-[9px] text-muted-foreground">Correlation:</span>
                          <span className={`text-[11px] font-bold ${
                            corrInfo?.bias === 'Bullish' ? 'text-emerald-400' :
                            corrInfo?.bias === 'Bearish' ? 'text-red-400' :
                            'text-yellow-400'
                          }`}>
                            {corrInfo?.label}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground/70">
                            ({strength > 0 ? '+' : ''}{strength})
                          </span>
                        </div>
                        {/* Mini progress bar */}
                        <div className="w-full h-1.5 rounded-full bg-accent/20 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              (strength ?? 0) >= 0
                                ? 'bg-gradient-to-r from-emerald-500/60 to-emerald-400'
                                : 'bg-gradient-to-r from-red-400 to-red-500/60'
                            }`}
                            style={{ width: `${barWidth}%`, marginLeft: (strength ?? 0) < 0 ? 'auto' : undefined }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
