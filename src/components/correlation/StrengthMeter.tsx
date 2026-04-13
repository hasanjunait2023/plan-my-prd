import { CurrencyStrengthRecord, CURRENCY_FLAGS, CATEGORY_COLORS } from '@/types/correlation';

interface StrengthMeterProps {
  data: CurrencyStrengthRecord[];
  previousData?: CurrencyStrengthRecord[];
  previousSessionLabel?: string;
  previousTimestamp?: string;
}

function withOpacity(hslColor: string, opacity: number): string {
  const match = hslColor.match(/hsl\(([^)]+)\)/);
  if (match) return `hsla(${match[1]}, ${opacity})`;
  return hslColor;
}

export function StrengthMeter({ data, previousData, previousSessionLabel, previousTimestamp }: StrengthMeterProps) {
  const sorted = [...data].sort((a, b) => b.strength - a.strength);
  const maxAbs = 10;

  const prevMap = new Map<string, number>();
  const prevCategoryMap = new Map<string, string>();
  if (previousData) {
    for (const p of previousData) {
      prevMap.set(p.currency, p.strength);
      prevCategoryMap.set(p.currency, p.category);
    }
  }

  const hasPrevData = previousData && previousData.length > 0;

  return (
    <div className="space-y-1">
      {sorted.map((item, index) => {
        const percent = Math.abs(item.strength) / maxAbs * 100;
        const isPositive = item.strength >= 0;
        const color = CATEGORY_COLORS[item.category] || 'hsl(0, 0%, 50%)';
        const flag = CURRENCY_FLAGS[item.currency] || '🏳️';

        const prevStrength = prevMap.get(item.currency);
        const prevCategory = prevCategoryMap.get(item.currency);
        const hasPrev = prevStrength !== undefined && prevCategory !== undefined;
        const categoryChanged = hasPrev && prevCategory !== item.category;

        return (
          <div key={item.currency} className="group rounded-lg px-1.5 sm:px-2 py-1 transition-colors hover:bg-muted/10">
            {/* Row 1: Main info */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Rank */}
              <div
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[10px] sm:text-[11px] font-bold shrink-0"
                style={{
                  color: index === 0 ? 'hsl(142, 71%, 45%)' : index === sorted.length - 1 ? 'hsl(0, 84%, 60%)' : 'hsl(0, 0%, 50%)',
                  backgroundColor: index === 0 ? 'hsla(142, 71%, 45%, 0.12)' : index === sorted.length - 1 ? 'hsla(0, 84%, 60%, 0.12)' : 'hsla(0, 0%, 50%, 0.08)',
                }}
              >
                {index + 1}
              </div>

              {/* Flag + Currency */}
              <div className="flex items-center gap-1 sm:gap-2 w-14 sm:w-20 shrink-0">
                <span className="text-base sm:text-xl leading-none">{flag}</span>
                <span className="font-bold text-foreground text-xs sm:text-sm tracking-wide">{item.currency}</span>
              </div>

              {/* Bar */}
              <div className="flex-1 relative h-6 sm:h-8 rounded-md bg-muted/10 overflow-hidden border border-border/20">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-muted-foreground/15 z-10" />
                <div
                  className="absolute top-0.5 bottom-0.5 sm:top-1 sm:bottom-1 rounded-sm transition-all duration-700 ease-out"
                  style={{
                    background: `linear-gradient(${isPositive ? '90deg' : '270deg'}, ${color}, ${withOpacity(color, 0.5)})`,
                    width: `${percent / 2}%`,
                    ...(isPositive ? { left: '50%' } : { right: '50%' }),
                    boxShadow: `0 0 12px ${withOpacity(color, 0.3)}`,
                  }}
                />
              </div>

              {/* Score */}
              <span className="font-extrabold text-xs sm:text-sm tabular-nums w-8 sm:w-12 text-right shrink-0" style={{ color }}>
                {item.strength > 0 ? '+' : ''}{item.strength}
              </span>

              {/* Category badge */}
              <div
                className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md shrink-0 w-14 sm:w-20 text-center"
                style={{
                  color,
                  backgroundColor: withOpacity(color, 0.12),
                  border: `1px solid ${withOpacity(color, 0.2)}`,
                  boxShadow: `0 0 8px ${withOpacity(color, 0.08)}`,
                }}
              >
                {item.category}
              </div>
            </div>

            {/* Row 2: Previous session info (compact, below main row) */}
            {hasPrev && (
              <div className="flex items-center gap-1.5 ml-6 sm:ml-8 mt-0.5">
                {/* Delta */}
                {(() => {
                  const delta = item.strength - prevStrength!;
                  if (delta === 0) return <span className="text-[9px] text-muted-foreground/40">±0</span>;
                  const deltaColor = delta > 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)';
                  return (
                    <span className="text-[9px] font-bold" style={{ color: deltaColor }}>
                      {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}
                    </span>
                  );
                })()}

                <span className="text-[9px] text-muted-foreground/30">•</span>

                {/* Previous session pill */}
                <div
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-dashed"
                  style={{
                    borderColor: withOpacity(CATEGORY_COLORS[prevCategory!] || 'hsl(0,0%,50%)', categoryChanged ? 0.5 : 0.15),
                    backgroundColor: categoryChanged
                      ? withOpacity(CATEGORY_COLORS[prevCategory!] || 'hsl(0,0%,50%)', 0.08)
                      : 'transparent',
                  }}
                >
                  <div
                    className="w-1 h-1 rounded-full shrink-0"
                    style={{
                      backgroundColor: CATEGORY_COLORS[prevCategory!] || 'hsl(0,0%,50%)',
                      boxShadow: categoryChanged ? `0 0 4px ${withOpacity(CATEGORY_COLORS[prevCategory!] || 'hsl(0,0%,50%)', 0.5)}` : 'none',
                    }}
                  />
                  <span
                    className="text-[9px] font-medium"
                    style={{ color: categoryChanged ? (CATEGORY_COLORS[prevCategory!] || 'hsl(0,0%,50%)') : 'hsl(0,0%,55%)' }}
                  >
                    was {prevCategory} ({prevStrength! > 0 ? '+' : ''}{prevStrength})
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Footer */}
      {hasPrevData && previousSessionLabel && (
        <div className="mt-2 pt-2 border-t border-border/15 flex items-center gap-2 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
          <span className="text-[9px] sm:text-[10px] text-muted-foreground/60 font-medium">
            vs <span className="text-muted-foreground/80 font-bold">{previousSessionLabel}</span>
            {previousTimestamp && (
              <span className="ml-1 text-muted-foreground/40">
                ({new Date(previousTimestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
