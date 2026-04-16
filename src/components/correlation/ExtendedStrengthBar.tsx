import { getStrengthLabel } from '@/lib/strengthLabels';
import { CURRENCY_FLAGS } from '@/types/correlation';

interface ExtendedStrengthBarProps {
  currency: string;
  strength: number;
  // Max absolute value used to scale the bar (default 10)
  maxAbs?: number;
}

/**
 * Extended (taller, wider) strength bar with full descriptive label.
 * Replaces compact "EUR M" badges with "EUR Medium Strong" + visual bar.
 */
export function ExtendedStrengthBar({ currency, strength, maxAbs = 10 }: ExtendedStrengthBarProps) {
  const label = getStrengthLabel(strength);
  const pct = Math.min(100, (Math.abs(strength) / maxAbs) * 100);
  const isPositive = strength >= 0;

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {/* Top row: flag + currency + value */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base flex-shrink-0">{CURRENCY_FLAGS[currency]}</span>
          <span className="text-xs font-bold text-foreground tracking-wide">{currency}</span>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded truncate"
            style={{ color: label.color, backgroundColor: label.bgColor }}
          >
            {label.label}
          </span>
        </div>
        <span
          className="text-xs font-bold font-mono tabular-nums flex-shrink-0"
          style={{ color: label.color }}
        >
          {strength > 0 ? '+' : ''}{strength.toFixed(1)}
        </span>
      </div>

      {/* Extended gradient bar — taller (14px) than compact version */}
      <div className="relative h-3.5 w-full bg-secondary/40 rounded-full overflow-hidden border border-border/30">
        {/* Center marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/50" />
        {/* Filled portion */}
        <div
          className="absolute top-0 bottom-0 transition-all duration-500 rounded-full"
          style={{
            width: `${pct / 2}%`,
            left: isPositive ? '50%' : `${50 - pct / 2}%`,
            background: isPositive
              ? `linear-gradient(90deg, ${label.color}80, ${label.color})`
              : `linear-gradient(90deg, ${label.color}, ${label.color}80)`,
            boxShadow: `0 0 8px ${label.bgColor}`,
          }}
        />
      </div>
    </div>
  );
}
