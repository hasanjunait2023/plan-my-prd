import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CURRENCY_FLAGS, CATEGORY_COLORS } from '@/types/correlation';
import { Skeleton } from '@/components/ui/skeleton';

interface StrengthStripProps {
  selectedCurrency: string;
}

async function fetchLatestStrength() {
  // Get the most recent recorded_at timestamp
  const { data: latest } = await supabase
    .from('currency_strength')
    .select('recorded_at')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  if (!latest) return [];

  const { data } = await supabase
    .from('currency_strength')
    .select('*')
    .eq('recorded_at', latest.recorded_at)
    .order('strength', { ascending: false });

  return data || [];
}

export function CorrelationStrengthStrip({ selectedCurrency }: StrengthStripProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['correlation-strength-strip'],
    queryFn: fetchLatestStrength,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-xs text-muted-foreground/50 py-1">
        No strength data available
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {data.map((item) => {
        const isSelected = item.currency === selectedCurrency;
        const color = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['NEUTRAL'];
        const flag = CURRENCY_FLAGS[item.currency] || '';

        return (
          <div
            key={item.currency}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
              isSelected
                ? 'ring-1 ring-primary/50 shadow-[0_0_10px_hsla(var(--primary)/0.15)] scale-105 border-primary/40 bg-primary/10'
                : 'border-border/20 bg-card/40'
            }`}
          >
            <span className="text-sm">{flag}</span>
            <span className={isSelected ? 'text-foreground' : 'text-muted-foreground'}>
              {item.currency}
            </span>
            <span
              className="font-mono font-bold tabular-nums"
              style={{ color }}
            >
              {item.strength > 0 ? '+' : ''}{item.strength}
            </span>
            <span
              className="text-[8px] px-1 py-0 rounded font-bold tracking-wider"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {item.category}
            </span>
          </div>
        );
      })}
    </div>
  );
}
