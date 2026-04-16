import { type StrengthTier } from '@/hooks/useCurrencyStrengths';
import { cn } from '@/lib/utils';

interface StrengthBadgeProps {
  currency: string;
  tier?: StrengthTier;
  strength?: number;
  size?: 'xs' | 'sm';
  showCurrency?: boolean;
  className?: string;
}

const TIER_CONFIG: Record<StrengthTier, { label: string; short: string; cls: string }> = {
  STRONG:        { label: 'Strong',     short: 'S',  cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
  MEDIUM_STRONG: { label: 'Med Strong', short: 'M+', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25' },
  NEUTRAL:       { label: 'Neutral',    short: 'N',  cls: 'bg-muted/40 text-muted-foreground border-border/50' },
  MEDIUM_WEAK:   { label: 'Med Weak',   short: 'M-', cls: 'bg-orange-500/10 text-orange-300 border-orange-500/25' },
  WEAK:          { label: 'Weak',       short: 'W',  cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

export function StrengthBadge({
  currency,
  tier,
  strength,
  size = 'xs',
  showCurrency = true,
  className,
}: StrengthBadgeProps) {
  if (!tier) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded border border-border/40 text-muted-foreground/60',
          size === 'xs' ? 'px-1.5 py-0 text-[9px]' : 'px-2 py-0.5 text-[10px]',
          className
        )}
        title={`${currency}: no data`}
      >
        {showCurrency && <span className="font-semibold">{currency}</span>}
        <span>—</span>
      </span>
    );
  }

  const cfg = TIER_CONFIG[tier];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border font-medium',
        cfg.cls,
        size === 'xs' ? 'px-1.5 py-0 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        className
      )}
      title={`${currency}: ${cfg.label}${strength !== undefined ? ` (${strength > 0 ? '+' : ''}${strength})` : ''}`}
    >
      {showCurrency && <span className="font-bold">{currency}</span>}
      <span>{size === 'xs' ? cfg.short : cfg.label}</span>
    </span>
  );
}

/**
 * Renders strength badges for both base and quote currency of a pair.
 */
export function PairStrengthBadges({
  base,
  quote,
  baseTier,
  quoteTier,
  baseStrength,
  quoteStrength,
  size = 'xs',
}: {
  base: string;
  quote: string;
  baseTier?: StrengthTier;
  quoteTier?: StrengthTier;
  baseStrength?: number;
  quoteStrength?: number;
  size?: 'xs' | 'sm';
}) {
  return (
    <div className="flex items-center gap-1">
      <StrengthBadge currency={base} tier={baseTier} strength={baseStrength} size={size} />
      <span className="text-muted-foreground/40 text-[10px]">/</span>
      <StrengthBadge currency={quote} tier={quoteTier} strength={quoteStrength} size={size} />
    </div>
  );
}
