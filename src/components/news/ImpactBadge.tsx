import { cn } from '@/lib/utils';

interface ImpactBadgeProps {
  impact: string;
  className?: string;
}

export function ImpactBadge({ impact, className }: ImpactBadgeProps) {
  const normalized = impact.toLowerCase();
  
  const config = normalized === 'high'
    ? { label: 'High', bg: 'bg-destructive/20 text-destructive border-destructive/30', dot: 'bg-destructive' }
    : normalized === 'medium'
    ? { label: 'Medium', bg: 'bg-warning/20 text-warning border-warning/30', dot: 'bg-warning' }
    : { label: 'Low', bg: 'bg-muted text-muted-foreground border-border/30', dot: 'bg-muted-foreground' };

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border', config.bg, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}
