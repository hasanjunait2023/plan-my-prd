import { useMemo, useState } from 'react';
import { MindThought } from '@/hooks/useMindThoughts';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Props {
  thoughts: MindThought[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const MindSidebar = ({ thoughts, selectedDate, onSelectDate, searchQuery, onSearchChange }: Props) => {
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const monthGroups = useMemo(() => {
    const byDate = new Map<string, MindThought[]>();
    thoughts.forEach(t => {
      const existing = byDate.get(t.date) || [];
      existing.push(t);
      byDate.set(t.date, existing);
    });

    const byMonth = new Map<string, { date: string; count: number }[]>();
    Array.from(byDate.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([date, dateThoughts]) => {
        const monthKey = format(parseISO(date), 'MMMM yyyy');
        const existing = byMonth.get(monthKey) || [];
        existing.push({ date, count: dateThoughts.length });
        byMonth.set(monthKey, existing);
      });

    return Array.from(byMonth.entries()).map(([month, dates]) => ({ month, dates }));
  }, [thoughts]);

  const toggleMonth = (month: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      next.has(month) ? next.delete(month) : next.add(month);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col bg-background/50">
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
          <Input
            placeholder="Search thoughts..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs bg-secondary/50 border-border/50 focus:border-primary/50 rounded-md"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-1.5 pb-2">
          {monthGroups.map(({ month, dates }) => {
            const collapsed = collapsedMonths.has(month);
            const totalCount = dates.reduce((s, d) => s + d.count, 0);
            return (
              <div key={month} className="mb-0.5">
                <button
                  onClick={() => toggleMonth(month)}
                  className="w-full flex items-center justify-between px-2 py-2 text-[11px] font-medium tracking-wide uppercase text-muted-foreground/70 hover:text-foreground/80 transition-colors"
                >
                  <span className="flex items-center gap-1">
                    {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {month}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">{totalCount}</span>
                </button>

                {!collapsed && dates.map(({ date, count }) => (
                  <button
                    key={date}
                    onClick={() => onSelectDate(date)}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-2 rounded-md mx-auto transition-all duration-150',
                      'hover:bg-secondary/60',
                      selectedDate === date
                        ? 'bg-primary/10 text-foreground'
                        : 'text-muted-foreground'
                    )}
                    style={{ width: 'calc(100% - 4px)', marginLeft: 2 }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-primary/40" />
                      <span className="text-xs font-medium">{format(parseISO(date), 'MMM d')}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/50">{count} thoughts</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MindSidebar;
