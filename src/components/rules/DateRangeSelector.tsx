import { useState } from 'react';
import { format, parse } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/hooks/useDailyAdherence';

export type RangePreset = '7d' | '30d' | '90d' | 'custom';

interface Props {
  preset: RangePreset;
  range: DateRange;
  onChange: (preset: RangePreset, range: DateRange) => void;
}

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const presetToRange = (p: Exclude<RangePreset, 'custom'>): DateRange => {
  const days = p === '7d' ? 7 : p === '30d' ? 30 : 90;
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: fmt(from), to: fmt(to) };
};

export function DateRangeSelector({ preset, range, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const fromDate = parse(range.from, 'yyyy-MM-dd', new Date());
  const toDate = parse(range.to, 'yyyy-MM-dd', new Date());

  const handlePreset = (p: Exclude<RangePreset, 'custom'>) => {
    onChange(p, presetToRange(p));
  };

  const presets: Array<{ key: Exclude<RangePreset, 'custom'>; label: string }> = [
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: '90d', label: '90d' },
  ];

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-card/60 border border-border/40">
      {presets.map((p) => (
        <Button
          key={p.key}
          size="sm"
          variant={preset === p.key ? 'default' : 'ghost'}
          onClick={() => handlePreset(p.key)}
          className={cn(
            'h-7 px-2.5 text-xs font-medium',
            preset === p.key && 'shadow-sm'
          )}
        >
          {p.label}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={preset === 'custom' ? 'default' : 'ghost'}
            className={cn('h-7 px-2.5 text-xs font-medium gap-1.5', preset === 'custom' && 'shadow-sm')}
          >
            <CalendarIcon className="w-3 h-3" />
            {preset === 'custom'
              ? `${format(fromDate, 'MMM d')} – ${format(toDate, 'MMM d')}`
              : 'Custom'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from: fromDate, to: toDate }}
            onSelect={(r: any) => {
              if (r?.from && r?.to) {
                onChange('custom', { from: fmt(r.from), to: fmt(r.to) });
                setOpen(false);
              }
            }}
            numberOfMonths={2}
            disabled={(d) => d > new Date()}
            initialFocus
            className={cn('p-3 pointer-events-auto')}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
