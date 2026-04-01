import { CurrencyStrengthRecord, CURRENCY_FLAGS, CATEGORY_COLORS } from '@/types/correlation';

interface StrengthMeterProps {
  data: CurrencyStrengthRecord[];
}

export function StrengthMeter({ data }: StrengthMeterProps) {
  const sorted = [...data].sort((a, b) => b.strength - a.strength);
  const maxAbs = 10;

  return (
    <div className="space-y-1.5">
      {sorted.map((item, index) => {
        const percent = Math.abs(item.strength) / maxAbs * 100;
        const isPositive = item.strength >= 0;
        const color = CATEGORY_COLORS[item.category] || 'hsl(0, 0%, 50%)';
        const flag = CURRENCY_FLAGS[item.currency] || '🏳️';

        return (
          <div
            key={item.currency}
            className="flex items-center gap-3 group rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/10"
          >
            {/* Rank badge */}
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{
                color: index === 0 ? 'hsl(142, 71%, 45%)' : index === sorted.length - 1 ? 'hsl(0, 84%, 60%)' : 'hsl(0, 0%, 50%)',
                backgroundColor: index === 0 ? 'hsla(142, 71%, 45%, 0.12)' : index === sorted.length - 1 ? 'hsla(0, 84%, 60%, 0.12)' : 'hsla(0, 0%, 50%, 0.08)',
              }}
            >
              {index + 1}
            </div>

            {/* Flag + Currency */}
            <div className="flex items-center gap-2 w-20 shrink-0">
              <span className="text-xl leading-none">{flag}</span>
              <span className="font-bold text-foreground text-sm tracking-wide">{item.currency}</span>
            </div>

            {/* Bar container */}
            <div className="flex-1 relative h-8 rounded-md bg-muted/10 overflow-hidden border border-border/20">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-muted-foreground/15 z-10" />

              {/* Gradient bar */}
              <div
                className="absolute top-1 bottom-1 rounded-sm transition-all duration-700 ease-out"
                style={{
                  background: `linear-gradient(${isPositive ? '90deg' : '270deg'}, ${color}, ${color}88)`,
                  width: `${percent / 2}%`,
                  ...(isPositive
                    ? { left: '50%' }
                    : { right: '50%' }),
                  boxShadow: `0 0 12px ${color}30`,
                }}
              />
            </div>

            {/* Score */}
            <div className="w-12 text-right shrink-0">
              <span
                className="font-extrabold text-sm tabular-nums"
                style={{ color }}
              >
                {item.strength > 0 ? '+' : ''}{item.strength}
              </span>
            </div>

            {/* Direction arrow */}
            <span
              className="w-5 text-center shrink-0 text-sm font-bold"
              style={{ color }}
            >
              {item.strength > 0 ? '▲' : item.strength < 0 ? '▼' : '—'}
            </span>

            {/* Category badge */}
            <div
              className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shrink-0 w-20 text-center"
              style={{
                color,
                backgroundColor: `${color}15`,
                border: `1px solid ${color}25`,
                boxShadow: `0 0 8px ${color}10`,
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
