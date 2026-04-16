import { type StrengthTier } from '@/hooks/useCurrencyStrengths';
import { cn } from '@/lib/utils';

interface StrengthBadgeProps {
  currency: string;
  tier?: StrengthTier;
  strength?: number;
  size?: 'xs' | 'sm';
  showCurrency?: boolean;
  variant?: 'compact' | 'full';
  className?: string;
}

const TIER_CONFIG: Record<StrengthTier, { label: string; full: string; short: string; cls: string }> = {
  STRONG:        { label: 'Strong',     full: 'Strong',        short: 'S',  cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
  MEDIUM_STRONG: { label: 'Med Strong', full: 'Medium Strong', short: 'M+', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25' },
  NEUTRAL:       { label: 'Neutral',    full: 'Neutral',       short: 'N',  cls: 'bg-muted/40 text-muted-foreground border-border/50' },
  MEDIUM_WEAK:   { label: 'Med Weak',   full: 'Medium Weak',   short: 'M-', cls: 'bg-orange-500/10 text-orange-300 border-orange-500/25' },
  WEAK:          { label: 'Weak',       full: 'Weak',          short: 'W',  cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

export function StrengthBadge({
  currency,
  tier,
  strength,
  size = 'xs',
  showCurrency = true,
  variant = 'compact',
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
  const isFull = variant === 'full';
  const labelText = isFull ? cfg.full : (size === 'xs' ? cfg.short : cfg.label);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border font-medium',
        cfg.cls,
        isFull
          ? 'px-2 py-0.5 text-[10px]'
          : size === 'xs' ? 'px-1.5 py-0 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        className
      )}
      title={`${currency}: ${cfg.label}${strength !== undefined ? ` (${strength > 0 ? '+' : ''}${strength})` : ''}`}
    >
      {showCurrency && <span className="font-bold">{currency}</span>}
      <span>{labelText}</span>
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
  variant = 'compact',
}: {
  base: string;
  quote: string;
  baseTier?: StrengthTier;
  quoteTier?: StrengthTier;
  baseStrength?: number;
  quoteStrength?: number;
  size?: 'xs' | 'sm';
  variant?: 'compact' | 'full';
}) {
  if (variant === 'full') {
    return (
      <div className="flex flex-col gap-1">
        <StrengthBadge currency={base} tier={baseTier} strength={baseStrength} size={size} variant="full" />
        <StrengthBadge currency={quote} tier={quoteTier} strength={quoteStrength} size={size} variant="full" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <StrengthBadge currency={base} tier={baseTier} strength={baseStrength} size={size} />
      <span className="text-muted-foreground/40 text-[10px]">/</span>
      <StrengthBadge currency={quote} tier={quoteTier} strength={quoteStrength} size={size} />
    </div>
  );
}
