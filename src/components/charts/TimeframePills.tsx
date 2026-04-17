import { cn } from '@/lib/utils';

const FAVORITE_TFS: { label: string; value: string }[] = [
  { label: '1m', value: '1' },
  { label: '3m', value: '3' },
  { label: '15m', value: '15' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
];

interface TimeframePillsProps {
  value: string;
  onChange: (tf: string) => void;
  className?: string;
}

export default function TimeframePills({ value, onChange, className }: TimeframePillsProps) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {FAVORITE_TFS.map((tf) => {
        const active = value === tf.value;
        return (
          <button
            key={tf.value}
            onClick={() => onChange(tf.value)}
            className={cn(
              'h-5 px-2 text-[10px] font-bold rounded transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
            )}
            title={tf.label}
          >
            {tf.label}
          </button>
        );
      })}
    </div>
  );
}
