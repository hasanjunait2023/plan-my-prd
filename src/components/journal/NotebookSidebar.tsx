import { useMemo, useState } from 'react';
import { Trade } from '@/types/trade';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface NotebookSidebarProps {
  trades: Trade[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

interface MonthGroup {
  month: string;
  dates: { date: string; trades: Trade[]; pnl: number; wins: number; losses: number }[];
}

const NotebookSidebar = ({ trades, selectedDate, onSelectDate, searchQuery, onSearchChange }: NotebookSidebarProps) => {
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const monthGroups = useMemo(() => {
    const byDate = new Map<string, Trade[]>();
    trades.forEach(t => {
      const existing = byDate.get(t.date) || [];
      existing.push(t);
      byDate.set(t.date, existing);
    });

    const byMonth = new Map<string, MonthGroup['dates']>();
    Array.from(byDate.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([date, dateTrades]) => {
        const monthKey = format(parseISO(date), 'MMMM yyyy');
        const existing = byMonth.get(monthKey) || [];
        existing.push({
          date,
          trades: dateTrades,
          pnl: dateTrades.reduce((s, t) => s + t.pnl, 0),
          wins: dateTrades.filter(t => t.outcome === 'WIN').length,
          losses: dateTrades.filter(t => t.outcome === 'LOSS').length,
        });
        byMonth.set(monthKey, existing);
      });

    return Array.from(byMonth.entries()).map(([month, dates]) => ({ month, dates }));
  }, [trades]);

  const toggleMonth = (month: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      next.has(month) ? next.delete(month) : next.add(month);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col bg-background/50">
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs bg-secondary/50 border-border/50 focus:border-primary/50 rounded-md"
          />
        </div>
      </div>

      {/* Date sections */}
      <ScrollArea className="flex-1">
        <div className="px-1.5 pb-2">
          {monthGroups.map(({ month, dates }) => {
            const collapsed = collapsedMonths.has(month);
            const monthPnl = dates.reduce((s, d) => s + d.pnl, 0);
            return (
              <div key={month} className="mb-0.5">
                {/* Month header */}
                <button
                  onClick={() => toggleMonth(month)}
                  className="w-full flex items-center justify-between px-2 py-2 text-[11px] font-medium tracking-wide uppercase text-muted-foreground/70 hover:text-foreground/80 transition-colors"
                >
                  <span className="flex items-center gap-1">
                    {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {month}
                  </span>
                  <span className={cn('text-[10px] font-semibold tabular-nums', monthPnl >= 0 ? 'text-profit' : 'text-loss')}>
                    {monthPnl >= 0 ? '+' : ''}${monthPnl.toFixed(0)}
                  </span>
                </button>

                {/* Date items */}
                {!collapsed && dates.map(({ date, trades: dateTrades, pnl, wins, losses }) => (
                  <button
                    key={date}
                    onClick={() => onSelectDate(date)}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-2 rounded-md mx-auto transition-all duration-150 group',
                      'hover:bg-secondary/60',
                      selectedDate === date
                        ? 'bg-primary/10 text-foreground'
                        : 'text-muted-foreground'
                    )}
                    style={{ width: 'calc(100% - 4px)', marginLeft: 2 }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        pnl > 0 ? 'bg-profit' : pnl < 0 ? 'bg-loss' : 'bg-muted-foreground/40'
                      )} />
                      <span className="text-xs font-medium">{format(parseISO(date), 'MMM d')}</span>
                      <span className="text-[10px] text-muted-foreground/50">{dateTrades.length}t</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {wins > 0 && <span className="text-[10px] text-profit/80">{wins}W</span>}
                      {losses > 0 && <span className="text-[10px] text-loss/80">{losses}L</span>}
                      <span className={cn('text-[10px] font-semibold tabular-nums', pnl >= 0 ? 'text-profit' : 'text-loss')}>
                        {pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}
                      </span>
                    </div>
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

export default NotebookSidebar;
