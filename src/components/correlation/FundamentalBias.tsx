import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CURRENCY_FLAGS } from '@/types/correlation';
import type { CurrencyStrengthRecord } from '@/types/correlation';
import { Newspaper, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

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

function getStrengthBias(strength: number): 'Bullish' | 'Bearish' | 'Neutral' {
  if (strength >= 5) return 'Bullish';
  if (strength <= -4) return 'Bearish';
  return 'Neutral';
}

const biasConfig = {
  Bullish: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Bullish' },
  Bearish: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Bearish' },
  Neutral: { icon: Minus, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'Neutral' },
};

const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];

export function FundamentalBias({ strengthData }: FundamentalBiasProps) {
  const { data, isLoading, isFetching } = useFundamentalBias();

  const strengthMap = new Map<string, number>();
  if (strengthData) {
    for (const d of strengthData) {
      strengthMap.set(d.currency, d.strength);
    }
  }

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-orange-500/10 flex items-center justify-center">
              <Newspaper className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <CardTitle className="text-base font-bold tracking-tight">Fundamental Bias</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {isFetching && <RefreshCw className="w-3 h-3 animate-spin" />}
            {data?.fetchedAt && (
              <span>Updated: {format(new Date(data.fetchedAt), 'HH:mm')}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : !data?.biases || Object.keys(data.biases).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">কোনো fundamental data পাওয়া যায়নি</p>
            <p className="text-[10px]">এই সপ্তাহে এখনো কোনো high-impact news release হয়নি।</p>
          </div>
        ) : (
          CURRENCIES.map(currency => {
            const bias = data.biases[currency];
            if (!bias) return null;

            const config = biasConfig[bias.bias];
            const Icon = config.icon;
            const strength = strengthMap.get(currency);
            const corrBias = strength !== undefined ? getStrengthBias(strength) : null;
            const isAligned = corrBias !== null && (
              (bias.bias === 'Bullish' && corrBias === 'Bullish') ||
              (bias.bias === 'Bearish' && corrBias === 'Bearish') ||
              (bias.bias === 'Neutral')
            );
            const showAlignment = corrBias !== null && bias.bias !== 'Neutral';

            return (
              <div
                key={currency}
                className={`rounded-lg border p-3 ${config.bg} transition-all hover:scale-[1.01]`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{CURRENCY_FLAGS[currency]}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{currency}</span>
                        <div className={`flex items-center gap-1 ${config.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">{config.label}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[280px] truncate">
                        {bias.event}: {bias.actual} vs {bias.forecast ? `${bias.forecast} forecast` : `${bias.previous} previous`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 ${
                        bias.impact.toLowerCase() === 'high'
                          ? 'border-red-500/30 text-red-400'
                          : 'border-yellow-500/30 text-yellow-400'
                      }`}
                    >
                      {bias.impact}
                    </Badge>

                    {showAlignment && (
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 ${
                          isAligned
                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                            : 'border-orange-500/30 text-orange-400 bg-orange-500/5'
                        }`}
                      >
                        {isAligned ? '✅ Aligned' : '⚠️ Divergent'}
                      </Badge>
                    )}

                    {corrBias !== null && (
                      <span className="text-[9px] text-muted-foreground">
                        Corr: {corrBias}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
