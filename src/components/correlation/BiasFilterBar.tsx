import { BIAS_FILTER_OPTIONS, BiasQuality } from '@/lib/biasCalculator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';

export type BiasFilter = BiasQuality | 'ALL';
export type SortMode = 'DIFF_DESC' | 'DIFF_ASC' | 'PAIR_NAME' | 'BIAS_QUALITY';

interface BiasFilterBarProps {
  filter: BiasFilter;
  onFilterChange: (f: BiasFilter) => void;
  sort: SortMode;
  onSortChange: (s: SortMode) => void;
  totalCount?: number;
  filteredCount?: number;
}

const SORT_LABELS: Record<SortMode, string> = {
  DIFF_DESC: 'Differential ↓',
  DIFF_ASC: 'Differential ↑',
  PAIR_NAME: 'Pair Name',
  BIAS_QUALITY: 'Bias Quality',
};

function getChipColor(value: BiasFilter, active: boolean): string {
  if (!active) return 'bg-card border-border/40 text-muted-foreground hover:text-foreground hover:border-border/70';
  switch (value) {
    case 'HIGH_BUY':
      return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400';
    case 'MEDIUM_BUY':
      return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
    case 'NEUTRAL':
      return 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400';
    case 'MEDIUM_SELL':
      return 'bg-red-500/10 border-red-500/30 text-red-300';
    case 'HIGH_SELL':
      return 'bg-red-500/20 border-red-500/50 text-red-400';
    case 'ALL':
    default:
      return 'bg-primary/15 border-primary/40 text-primary';
  }
}

export function BiasFilterBar({
  filter,
  onFilterChange,
  sort,
  onSortChange,
  totalCount,
  filteredCount,
}: BiasFilterBarProps) {
  return (
    <div className="space-y-2.5">
      {/* Filter chips — horizontal scroll on mobile */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {BIAS_FILTER_OPTIONS.map(opt => {
          const active = filter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onFilterChange(opt.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-semibold tracking-wide transition-all ${getChipColor(opt.value, active)}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Sort + count row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {filteredCount !== undefined && totalCount !== undefined
            ? `${filteredCount} of ${totalCount} pairs`
            : ''}
        </span>
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          <Select value={sort} onValueChange={v => onSortChange(v as SortMode)}>
            <SelectTrigger className="h-7 w-[150px] text-[11px] bg-card border-border/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortMode[]).map(k => (
                <SelectItem key={k} value={k} className="text-xs">
                  {SORT_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
