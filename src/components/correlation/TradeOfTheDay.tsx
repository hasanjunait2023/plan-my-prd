import { CurrencyStrengthRecord, generatePairSuggestions, CURRENCY_FLAGS } from '@/types/correlation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TradeOfTheDayProps {
  data: CurrencyStrengthRecord[];
}

export function TradeOfTheDay({ data }: TradeOfTheDayProps) {
  const suggestions = generatePairSuggestions(data);

  // Fetch latest confluence scores
  const { data: confluenceData } = useQuery({
    queryKey: ['confluence-for-trade-of-day'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('confluence_scores')
        .select('*')
        .order('calculated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (suggestions.length === 0) return null;

  // Score each suggestion combining strength gap + confluence
  const scored = suggestions.slice(0, 10).map(s => {
    const confluenceMatch = confluenceData?.find(
      c => c.pair === s.pair.replace('/', '') || c.pair === s.pair
    );
    const confluenceGrade = confluenceMatch?.grade || 'D';
    const emaScore = confluenceMatch?.ema_score || 0;
    const gradePoints: Record<string, number> = { 'A+': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
    const totalScore = s.strengthDiff * 2 + (gradePoints[confluenceGrade] || 1) * 3 + emaScore;

    return { ...s, confluenceGrade, emaScore, totalScore };
  }).sort((a, b) => b.totalScore - a.totalScore);

  const top = scored[0];
  if (!top) return null;

  const DirectionIcon = top.direction === 'BUY' ? TrendingUp : TrendingDown;
  const dirColor = top.direction === 'BUY' ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)';

  return (
    <Card className="border-border/30 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)] overflow-hidden relative">
      {/* Glow effect */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: dirColor }}
      />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            <CardTitle className="text-base font-bold tracking-tight">Trade of the Day</CardTitle>
          </div>
          <Badge
            className="text-[10px] font-bold border-0"
            style={{ backgroundColor: `${dirColor}20`, color: dirColor }}
          >
            <Zap className="w-3 h-3 mr-1" />
            Score: {top.totalScore.toFixed(0)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Pair + Direction */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{CURRENCY_FLAGS[top.strongCurrency]}</span>
              <span className="text-lg font-extrabold text-foreground">{top.pair}</span>
              <span className="text-2xl">{CURRENCY_FLAGS[top.weakCurrency]}</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold"
                style={{ backgroundColor: `${dirColor}15`, color: dirColor }}
              >
                <DirectionIcon className="w-4 h-4" />
                {top.direction}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Gap</p>
              <p className="text-lg font-extrabold text-foreground">{top.strengthDiff}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Grade</p>
              <p className="text-lg font-extrabold" style={{ color: top.confluenceGrade.startsWith('A') ? 'hsl(142,71%,45%)' : 'hsl(48,96%,53%)' }}>
                {top.confluenceGrade}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium mb-0.5">EMA</p>
              <p className="text-lg font-extrabold text-foreground">{top.emaScore}/3</p>
            </div>
          </div>
        </div>

        {/* Runner ups */}
        {scored.length > 1 && (
          <div className="mt-3 pt-3 border-t border-border/15">
            <p className="text-[10px] text-muted-foreground font-medium mb-2">Runner-ups:</p>
            <div className="flex flex-wrap gap-1.5">
              {scored.slice(1, 4).map(s => (
                <span
                  key={s.pair}
                  className="text-[10px] font-bold px-2 py-1 rounded-md bg-muted/10 text-muted-foreground"
                >
                  {s.pair} {s.direction === 'BUY' ? '↑' : '↓'} ({s.strengthDiff})
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
