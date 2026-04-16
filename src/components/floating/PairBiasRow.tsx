import { getPairFlags } from '@/lib/pairFlags';
import { PairStrengthBadges } from './StrengthBadge';
import { ExtendedStrengthBar } from '@/components/correlation/ExtendedStrengthBar';
import { calculateBias } from '@/lib/biasCalculator';
import type { CurrencyStrengthEntry } from '@/hooks/useCurrencyStrengths';
import type { WatchlistItem } from '@/lib/watchlistData';

interface PairBiasRowProps {
  item: WatchlistItem;
  onClick: () => void;
  strengths: Record<string, CurrencyStrengthEntry>;
}

export function PairBiasRow({ item, onClick, strengths }: PairBiasRowProps) {
  const { base, quote } = getPairFlags(item.symbol);
  const baseCur = item.symbol.slice(0, 3);
  const quoteCur = item.symbol.slice(3, 6);
  const baseEntry = strengths[baseCur];
  const quoteEntry = strengths[quoteCur];
  const baseStr = baseEntry?.strength;
  const quoteStr = quoteEntry?.strength;
  const hasData = baseStr !== undefined && quoteStr !== undefined;
  const diff = hasData ? baseStr! - quoteStr! : undefined;
  const bias = diff !== undefined ? calculateBias(diff) : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex flex-col gap-2 px-3 py-3 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left border-b min-h-[80px]"
      style={{
        borderColor: bias && bias.quality !== 'NEUTRAL' ? bias.borderColor : 'hsl(var(--border) / 0.3)',
      }}
    >
      {/* Top row: flags + symbol + bias badge */}
      <div className="flex items-center gap-3 w-full">
        <div className="relative w-9 h-9 shrink-0">
          <span className="absolute left-0 top-0 text-xl">{base}</span>
          <span className="absolute right-0 bottom-0 text-xl">{quote}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-foreground truncate">{item.symbol}</div>
          <div className="text-[10px] text-muted-foreground truncate">{item.name}</div>
        </div>
        {bias && (
          <span
            className="text-[10px] font-black px-2 py-1 rounded-md tracking-wider shrink-0"
            style={{
              color: bias.color,
              backgroundColor: bias.bgColor,
              border: `1px solid ${bias.borderColor}`,
              boxShadow: bias.quality !== 'NEUTRAL' ? `0 0 10px ${bias.bgColor}` : undefined,
            }}
          >
            {bias.shortLabel}
          </span>
        )}
      </div>

      {/* Strength bars (only if data available) */}
      {hasData ? (
        <div className="flex flex-col gap-1.5 w-full">
          <ExtendedStrengthBar currency={baseCur} strength={baseStr!} />
          <ExtendedStrengthBar currency={quoteCur} strength={quoteStr!} />
          {diff !== undefined && (
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="text-[9px] font-bold text-muted-foreground tracking-wider">Δ</span>
              <span
                className="text-[10px] font-black tabular-nums"
                style={{ color: bias?.color }}
              >
                {diff > 0 ? '+' : ''}{diff.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full">
          <PairStrengthBadges
            base={baseCur}
            quote={quoteCur}
            baseTier={baseEntry?.tier}
            quoteTier={quoteEntry?.tier}
            baseStrength={baseEntry?.strength}
            quoteStrength={quoteEntry?.strength}
            variant="full"
          />
        </div>
      )}
    </button>
  );
}
