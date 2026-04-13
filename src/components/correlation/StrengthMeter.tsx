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
    <div className="space-y-0">
      {sorted.map((item, index) => {
        const percent = Math.abs(item.strength) / maxAbs * 100;
        const isPositive = item.strength >= 0;
        const color = CATEGORY_COLORS[item.category] || 'hsl(0, 0%, 50%)';
        const flag = CURRENCY_FLAGS[item.currency] || '🏳️';

        const prevStrength = prevMap.get(item.currency);
        const prevCategory = prevCategoryMap.get(item.currency);
        const hasPrev = prevStrength !== undefined && prevCategory !== undefined;
        const categoryChanged = hasPrev && prevCategory !== item.category;
        const isTop = index === 0;
        const isBottom = index === sorted.length - 1;

        return (
          <div
            key={item.currency}
            className="relative transition-all duration-300"
            style={{
              animationDelay: `${index * 60}ms`,
            }}
          >
            {/* ── DESKTOP LAYOUT ── */}
            <div className="hidden sm:flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-muted/10 transition-colors">
              {/* Rank */}
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{
                  color: isTop ? 'hsl(142, 71%, 45%)' : isBottom ? 'hsl(0, 84%, 60%)' : 'hsl(0, 0%, 50%)',
                  backgroundColor: isTop ? 'hsla(142, 71%, 45%, 0.12)' : isBottom ? 'hsla(0, 84%, 60%, 0.12)' : 'hsla(0, 0%, 50%, 0.08)',
                }}
              >
                {index + 1}
              </div>

              <div className="flex items-center gap-2 w-20 shrink-0">
                <span className="text-xl leading-none">{flag}</span>
                <span className="font-bold text-foreground text-sm tracking-wide">{item.currency}</span>
              </div>

              <div className="flex-1 relative h-8 rounded-md bg-muted/10 overflow-hidden border border-border/20">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-muted-foreground/15 z-10" />
                <div
                  className="absolute top-1 bottom-1 rounded-sm transition-all duration-700 ease-out"
                  style={{
                    background: `linear-gradient(${isPositive ? '90deg' : '270deg'}, ${color}, ${withOpacity(color, 0.5)})`,
                    width: `${percent / 2}%`,
                    ...(isPositive ? { left: '50%' } : { right: '50%' }),
                    boxShadow: `0 0 12px ${withOpacity(color, 0.3)}`,
                  }}
                />
              </div>

              <span className="font-extrabold text-sm tabular-nums w-12 text-right shrink-0" style={{ color }}>
                {item.strength > 0 ? '+' : ''}{item.strength}
              </span>

              {/* Delta */}
              {(() => {
                if (!hasPrev) return <div className="w-12 shrink-0" />;
                const delta = item.strength - prevStrength!;
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

              <span className="w-5 text-center shrink-0 text-sm font-bold" style={{ color }}>
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

              {/* Previous session pill (desktop) */}
              {hasPrev ? (
                <div
                  className="shrink-0 w-36 flex items-center gap-1.5 px-2 py-1 rounded-full border border-dashed"
                  style={{
                    borderColor: withOpacity(CATEGORY_COLORS[prevCategory!] || 'hsl(0,0%,50%)', categoryChanged ? 0.5 : 0.2),
                    backgroundColor: categoryChanged ? withOpacity(CATEGORY_COLORS[prevCategory!] || 'hsl(0,0%,50%)', 0.1) : 'hsla(0,0%,100%,0.03)',
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: CATEGORY_COLORS[prevCategory!] || 'hsl(0,0%,50%)',
                      boxShadow: categoryChanged ? `0 0 6px ${withOpacity(CATEGORY_COLORS[prevCategory!] || 'hsl(0,0%,50%)', 0.5)}` : 'none',
                    }}
                  />
                  <span
                    className="text-[9px] font-semibold truncate"
                    style={{ color: categoryChanged ? (CATEGORY_COLORS[prevCategory!] || 'hsl(0,0%,50%)') : 'hsl(0,0%,60%)' }}
                  >
                    was {prevCategory} ({prevStrength! > 0 ? '+' : ''}{prevStrength})
                  </span>
                </div>
              ) : <div className="shrink-0 w-36" />}
            </div>

            {/* ── MOBILE LAYOUT — Premium card style ── */}
            <div
              className="sm:hidden rounded-xl mx-0.5 mb-1.5 overflow-hidden border transition-all duration-300"
              style={{
                borderColor: withOpacity(color, isTop || isBottom ? 0.25 : 0.1),
                background: `linear-gradient(135deg, ${withOpacity(color, 0.06)} 0%, transparent 60%)`,
                boxShadow: isTop ? `0 0 20px ${withOpacity(color, 0.12)}` : isBottom ? `0 0 16px ${withOpacity(color, 0.08)}` : 'none',
              }}
            >
              {/* Main row */}
              <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                {/* Rank circle */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
                  style={{
                    color: isTop ? 'hsl(142, 71%, 45%)' : isBottom ? 'hsl(0, 84%, 60%)' : 'hsl(0, 0%, 55%)',
                    backgroundColor: isTop ? 'hsla(142, 71%, 45%, 0.15)' : isBottom ? 'hsla(0, 84%, 60%, 0.15)' : 'hsla(0, 0%, 50%, 0.08)',
                    border: `1.5px solid ${isTop ? 'hsla(142,71%,45%,0.3)' : isBottom ? 'hsla(0,84%,60%,0.3)' : 'transparent'}`,
                  }}
                >
                  {index + 1}
                </div>

                {/* Flag + Currency */}
                <span className="text-lg leading-none">{flag}</span>
                <span className="font-black text-foreground text-sm tracking-wide">{item.currency}</span>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Big score — hero element */}
                <div className="flex items-baseline gap-1">
                  <span
                    className="font-black text-xl tabular-nums tracking-tight"
                    style={{
                      color,
                      textShadow: `0 0 20px ${withOpacity(color, 0.4)}`,
                    }}
                  >
                    {item.strength > 0 ? '+' : ''}{item.strength}
                  </span>
                  <span className="text-sm font-bold" style={{ color }}>
                    {item.strength > 0 ? '▲' : item.strength < 0 ? '▼' : '—'}
                  </span>
                </div>

                {/* Category pill */}
                <div
                  className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md text-center ml-1"
                  style={{
                    color,
                    backgroundColor: withOpacity(color, 0.15),
                    border: `1px solid ${withOpacity(color, 0.25)}`,
                    boxShadow: `0 0 10px ${withOpacity(color, 0.1)}`,
                  }}
                >
                  {item.category}
                </div>
              </div>

              {/* Progress bar — full width, sleek */}
              <div className="px-3 pb-1.5">
                <div className="relative h-2 rounded-full bg-muted/15 overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 rounded-full transition-all duration-700 ease-out"
                    style={{
                      background: `linear-gradient(90deg, ${withOpacity(color, 0.7)}, ${color})`,
                      width: `${percent}%`,
                      left: 0,
                      boxShadow: `0 0 8px ${withOpacity(color, 0.4)}`,
                    }}
                  />
                </div>
              </div>

              {/* Previous session row — subtle, secondary info */}
              {hasPrev && (
                <div
                  className="flex items-center gap-2 px-3 py-1.5 border-t"
                  style={{
                    borderColor: withOpacity(color, 0.08),
                    backgroundColor: categoryChanged ? withOpacity(CATEGORY_COLORS[prevCategory!] || color, 0.04) : 'transparent',
                  }}
                >
                  {/* Delta chip */}
                  {(() => {
                    const delta = item.strength - prevStrength!;
                    if (delta === 0) {
                      return <span className="text-[10px] text-muted-foreground/40 font-medium">±0 change</span>;
                    }
                    const isUp = delta > 0;
                    const deltaColor = isUp ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)';
                    return (
                      <div
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                        style={{
                          color: deltaColor,
                          backgroundColor: isUp ? 'hsla(142,71%,45%,0.1)' : 'hsla(0,84%,60%,0.1)',
                        }}
                      >
                        {isUp ? '↑' : '↓'}{Math.abs(delta)}
                      </div>
                    );
                  })()}

                  <span className="text-[9px] text-muted-foreground/30">•</span>

                  {/* Previous session info */}
                  <div className="flex items-center gap-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: CATEGORY_COLORS[prevCategory!] || 'hsl(0,0%,50%)',
                        boxShadow: categoryChanged ? `0 0 5px ${withOpacity(CATEGORY_COLORS[prevCategory!] || 'hsl(0,0%,50%)', 0.6)}` : 'none',
                      }}
                    />
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: categoryChanged ? (CATEGORY_COLORS[prevCategory!] || 'hsl(0,0%,50%)') : 'hsl(0,0%,50%)' }}
                    >
                      was <span className="font-bold">{prevCategory}</span> ({prevStrength! > 0 ? '+' : ''}{prevStrength})
                    </span>
                  </div>

                  {categoryChanged && (
                    <span className="ml-auto text-[8px] font-bold uppercase tracking-widest" style={{ color }}>
                      shifted
                    </span>
                  )}
                </div>
              )}
            </div>
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
