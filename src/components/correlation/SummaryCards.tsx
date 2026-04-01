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
      gradient: 'from-emerald-500/20 to-emerald-500/5',
      borderGlow: 'shadow-[inset_0_1px_0_0_hsla(142,71%,45%,0.15)]',
      color: 'hsl(142, 71%, 45%)',
      iconBg: 'bg-emerald-500/10',
    },
    {
      icon: TrendingDown,
      label: 'Weakest',
      value: `${CURRENCY_FLAGS[weakest.currency] || ''} ${weakest.currency}`,
      score: `${weakest.strength}`,
      gradient: 'from-red-500/20 to-red-500/5',
      borderGlow: 'shadow-[inset_0_1px_0_0_hsla(0,84%,60%,0.15)]',
      color: 'hsl(0, 84%, 60%)',
      iconBg: 'bg-red-500/10',
    },
    {
      icon: ArrowRightLeft,
      label: 'Best Pair',
      value: bestPair,
      score: 'BUY',
      gradient: 'from-emerald-500/15 to-transparent',
      borderGlow: 'shadow-[inset_0_1px_0_0_hsla(142,71%,45%,0.1)]',
      color: 'hsl(142, 71%, 45%)',
      iconBg: 'bg-emerald-500/10',
    },
    {
      icon: Zap,
      label: 'Strength Gap',
      value: `${strongest.strength} vs ${weakest.strength}`,
      score: `${gap}`,
      gradient: 'from-yellow-500/15 to-transparent',
      borderGlow: 'shadow-[inset_0_1px_0_0_hsla(48,96%,53%,0.15)]',
      color: 'hsl(48, 96%, 53%)',
      iconBg: 'bg-yellow-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`relative overflow-hidden rounded-xl border border-border/30 bg-gradient-to-br ${card.gradient} backdrop-blur-sm p-5 ${card.borderGlow} transition-all duration-300 hover:border-border/60 hover:scale-[1.02]`}
        >
          {/* Subtle glow orb */}
          <div
            className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20"
            style={{ backgroundColor: card.color }}
          />

          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                {card.label}
              </span>
            </div>
            <div className="text-2xl font-bold text-foreground tracking-tight">{card.value}</div>
            <div
              className="text-lg font-extrabold"
              style={{ color: card.color }}
            >
              {card.score}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
