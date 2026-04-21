import { cn } from '@/lib/utils';
import { type BiasInfo } from '@/lib/biasCalculator';

interface BiasPillProps {
  bias?: BiasInfo;
  size?: 'xs' | 'sm';
  className?: string;
}

/**
 * Compact inline pill rendering a pair's bias quality
 * (HQ Buy / Med Buy / Neutral / Med Sell / HQ Sell).
 * Renders nothing when bias is undefined (non-forex pair).
 */
export function BiasPill({ bias, size = 'xs', className }: BiasPillProps) {
  if (!bias) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded border border-border/30 text-muted-foreground/50 font-medium',
          size === 'xs' ? 'px-1.5 py-0 text-[9px]' : 'px-2 py-0.5 text-[10px]',
          className
        )}
        title="Bias unavailable"
      >
        —
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border font-bold tracking-wide',
        size === 'xs' ? 'px-1.5 py-0 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        className
      )}
      style={{
        color: bias.color,
        backgroundColor: bias.bgColor,
        borderColor: bias.borderColor,
      }}
      title={bias.label}
    >
      {bias.shortLabel}
    </span>
  );
}
