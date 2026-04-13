import { CurrencyStrengthRecord, CURRENCY_FLAGS, CATEGORY_COLORS } from '@/types/correlation';

interface StrengthMeterProps {
  data: CurrencyStrengthRecord[];
  previousData?: CurrencyStrengthRecord[];
}

// Convert hsl string to hsla with opacity
function withOpacity(hslColor: string, opacity: number): string {
  const match = hslColor.match(/hsl\(([^)]+)\)/);
  if (match) return `hsla(${match[1]}, ${opacity})`;
  return hslColor;
}

export function StrengthMeter({ data, previousData }: StrengthMeterProps) {
  const sorted = [...data].sort((a, b) => b.strength - a.strength);
  const maxAbs = 10;

  // Build previous snapshot maps for delta + category
  const prevMap = new Map<string, number>();
  const prevCategoryMap = new Map<string, string>();
  if (previousData) {
    for (const p of previousData) {
      prevMap.set(p.currency, p.strength);
      prevCategoryMap.set(p.currency, p.category);
    }
  }

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
                  background: `linear-gradient(${isPositive ? '90deg' : '270deg'}, ${color}, ${withOpacity(color, 0.5)})`,
                  width: `${percent / 2}%`,
                  ...(isPositive
                    ? { left: '50%' }
                    : { right: '50%' }),
                  boxShadow: `0 0 12px ${withOpacity(color, 0.3)}`,
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

            {/* Delta badge */}
            {(() => {
              const prev = prevMap.get(item.currency);
              if (prev === undefined) return <div className="w-12 shrink-0" />;
              const delta = item.strength - prev;
              if (delta === 0) return <div className="w-12 shrink-0 text-center text-[10px] text-muted-foreground/50">—</div>;
              const deltaColor = delta > 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)';
              return (
                <div
                  className="w-12 shrink-0 text-center text-[10px] font-bold rounded-md py-0.5"
                  style={{ color: deltaColor, backgroundColor: delta > 0 ? 'hsla(142,71%,45%,0.1)' : 'hsla(0,84%,60%,0.1)' }}
                >
                  {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}
                </div>
              );
            })()}

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
                backgroundColor: withOpacity(color, 0.12),
                border: `1px solid ${withOpacity(color, 0.2)}`,
                boxShadow: `0 0 8px ${withOpacity(color, 0.08)}`,
              }}
            >
              {item.category}
            </div>

            {/* Previous snapshot badge */}
            {(() => {
              const prevStrength = prevMap.get(item.currency);
              const prevCategory = prevCategoryMap.get(item.currency);
              if (prevStrength === undefined || prevCategory === undefined) return <div className="shrink-0 w-32" />;
              const prevColor = CATEGORY_COLORS[prevCategory] || 'hsl(0, 0%, 50%)';
              const categoryChanged = prevCategory !== item.category;
              return (
                <div
                  className="text-[9px] font-bold px-2 py-1 rounded-md shrink-0 w-32 text-center truncate"
                  style={{
                    color: prevColor,
                    backgroundColor: withOpacity(prevColor, categoryChanged ? 0.18 : 0.08),
                    border: `1px solid ${withOpacity(prevColor, categoryChanged ? 0.35 : 0.12)}`,
                    boxShadow: categoryChanged ? `0 0 10px ${withOpacity(prevColor, 0.15)}` : 'none',
                  }}
                >
                  was: {prevCategory} ({prevStrength > 0 ? '+' : ''}{prevStrength})
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}
