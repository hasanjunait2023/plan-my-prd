import { CurrencyStrengthRecord, CURRENCY_FLAGS } from '@/types/correlation';
import { TrendingUp, TrendingDown, ArrowRightLeft, Zap } from 'lucide-react';

interface SummaryCardsProps {
  data: CurrencyStrengthRecord[];
}

export function SummaryCards({ data }: SummaryCardsProps) {
  if (!data.length) return null;

  const sorted = [...data].sort((a, b) => b.strength - a.strength);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const gap = strongest.strength - weakest.strength;
  const bestPair = `${strongest.currency}/${weakest.currency}`;

  const cards = [
    {
      icon: TrendingUp,
      label: 'Strongest',
      value: `${CURRENCY_FLAGS[strongest.currency] || ''} ${strongest.currency}`,
      score: `+${strongest.strength}`,
      color: 'hsl(142, 71%, 45%)',
    },
    {
      icon: TrendingDown,
      label: 'Weakest',
      value: `${CURRENCY_FLAGS[weakest.currency] || ''} ${weakest.currency}`,
      score: `${weakest.strength}`,
      color: 'hsl(0, 84%, 60%)',
    },
    {
      icon: ArrowRightLeft,
      label: 'Best Pair',
      value: bestPair,
      score: 'BUY',
      color: 'hsl(142, 71%, 45%)',
    },
    {
      icon: Zap,
      label: 'Strength Gap',
      value: `${strongest.strength} vs ${weakest.strength}`,
      score: `${gap}`,
      color: 'hsl(48, 96%, 53%)',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-border/50 bg-card p-4 space-y-2"
        >
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
            <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
            {card.label}
          </div>
          <div className="text-xl font-bold text-foreground">{card.value}</div>
          <div
            className="text-sm font-bold"
            style={{ color: card.color }}
          >
            {card.score}
          </div>
        </div>
      ))}
    </div>
  );
}
