import { CurrencyStrengthRecord, CURRENCY_FLAGS, CATEGORY_COLORS } from '@/types/correlation';

interface StrengthMeterProps {
  data: CurrencyStrengthRecord[];
}

export function StrengthMeter({ data }: StrengthMeterProps) {
  const sorted = [...data].sort((a, b) => b.strength - a.strength);
  const maxAbs = 10;

  return (
    <div className="space-y-3">
      {sorted.map((item) => {
        const percent = Math.abs(item.strength) / maxAbs * 100;
        const isPositive = item.strength >= 0;
        const color = CATEGORY_COLORS[item.category] || 'hsl(0, 0%, 50%)';
        const flag = CURRENCY_FLAGS[item.currency] || '🏳️';

        return (
          <div key={item.currency} className="flex items-center gap-3">
            {/* Currency label */}
            <div className="flex items-center gap-2 w-24 shrink-0">
              <span className="text-lg">{flag}</span>
              <span className="font-semibold text-foreground text-sm">{item.currency}</span>
            </div>

            {/* Bar container */}
            <div className="flex-1 relative h-8 rounded bg-muted/30 overflow-hidden">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-muted-foreground/30 z-10" />

              {/* Bar */}
              <div
                className="absolute top-1 bottom-1 rounded transition-all duration-500"
                style={{
                  backgroundColor: color,
                  width: `${percent / 2}%`,
                  ...(isPositive
                    ? { left: '50%' }
                    : { right: '50%' }),
                  opacity: 0.85,
                }}
              />
            </div>

            {/* Score */}
            <div className="w-12 text-right shrink-0">
              <span
                className="font-bold text-sm"
                style={{ color }}
              >
                {item.strength > 0 ? '+' : ''}{item.strength}
              </span>
            </div>

            {/* Category badge */}
            <div
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 w-20 text-center"
              style={{
                color,
                backgroundColor: `${color}20`,
                border: `1px solid ${color}40`,
              }}
            >
              {item.category}
            </div>
          </div>
        );
      })}
    </div>
  );
}
