import { ScanLine, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface ScanSummaryProps {
  totalScanned: number;
  bullishCount: number;
  bearishCount: number;
  lastScanTime: string | null;
}

export function ScanSummary({ totalScanned, bullishCount, bearishCount, lastScanTime }: ScanSummaryProps) {
  const cards = [
    {
      label: 'Pairs Scanned',
      value: totalScanned,
      icon: ScanLine,
      color: 'text-blue-400',
      glow: 'shadow-[0_0_15px_hsla(217,91%,60%,0.15)]',
    },
    {
      label: 'Bullish Aligned',
      value: bullishCount,
      icon: TrendingUp,
      color: 'text-green-400',
      glow: 'shadow-[0_0_15px_hsla(142,71%,45%,0.15)]',
    },
    {
      label: 'Bearish Aligned',
      value: bearishCount,
      icon: TrendingDown,
      color: 'text-red-400',
      glow: 'shadow-[0_0_15px_hsla(0,84%,60%,0.15)]',
    },
    {
      label: 'Last Scan',
      value: lastScanTime || 'Never',
      icon: Activity,
      color: 'text-yellow-400',
      glow: 'shadow-[0_0_15px_hsla(38,92%,50%,0.15)]',
      isText: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-4 ${card.glow} transition-all duration-300 hover:border-border/50`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg bg-muted/50 ${card.color}`}>
              <card.icon className="w-4 h-4" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
          </div>
          <p className={`text-2xl font-bold text-foreground ${card.isText ? '!text-sm' : ''}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
