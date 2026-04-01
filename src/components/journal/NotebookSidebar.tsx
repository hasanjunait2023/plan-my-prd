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
  month: string; // e.g. "March 2026"
  dates: { date: string; trades: Trade[]; pnl: number; wins: number; losses: number }[];
}

const NotebookSidebar = ({ trades, selectedDate, onSelectDate, searchQuery, onSearchChange }: NotebookSidebarProps) => {
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const monthGroups = useMemo(() => {
    // Group trades by date
    const byDate = new Map<string, Trade[]>();
    trades.forEach(t => {
      const existing = byDate.get(t.date) || [];
      existing.push(t);
      byDate.set(t.date, existing);
    });

    // Group dates by month
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
    <div className="h-full flex flex-col bg-sidebar-background">
      {/* Search */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs bg-sidebar-accent border-sidebar-border"
          />
        </div>
      </div>

      {/* Date sections */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {monthGroups.map(({ month, dates }) => {
            const collapsed = collapsedMonths.has(month);
            const monthPnl = dates.reduce((s, d) => s + d.pnl, 0);
            return (
              <div key={month}>
                {/* Month header */}
                <button
                  onClick={() => toggleMonth(month)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {month}
                  </span>
                  <span className={cn('text-[10px] font-bold', monthPnl >= 0 ? 'text-profit' : 'text-loss')}>
                    {monthPnl >= 0 ? '+' : ''}${monthPnl.toFixed(0)}
                  </span>
                </button>

                {/* Date items */}
                {!collapsed && dates.map(({ date, trades: dateTrades, pnl, wins, losses }) => (
                  <button
                    key={date}
                    onClick={() => onSelectDate(date)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-sm transition-colors',
                      'hover:bg-sidebar-accent',
                      selectedDate === date && 'bg-sidebar-accent border-l-2 border-primary text-foreground',
                      selectedDate !== date && 'text-muted-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        pnl > 0 ? 'bg-profit' : pnl < 0 ? 'bg-loss' : 'bg-muted-foreground'
                      )} />
                      <span className="text-xs">{format(parseISO(date), 'MMM d')}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {dateTrades.length}t
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {wins > 0 && <span className="text-[10px] text-profit">{wins}W</span>}
                      {losses > 0 && <span className="text-[10px] text-loss">{losses}L</span>}
                      <span className={cn('text-[10px] font-semibold', pnl >= 0 ? 'text-profit' : 'text-loss')}>
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
