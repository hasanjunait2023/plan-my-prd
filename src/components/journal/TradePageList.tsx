import { Trade } from '@/types/trade';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowUp, ArrowDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';

interface TradePageListProps {
  trades: Trade[];
  selectedDate: string;
  selectedTradeId: string | null;
  onSelectTrade: (trade: Trade) => void;
}

const TradePageList = ({ trades, selectedDate, selectedTradeId, onSelectTrade }: TradePageListProps) => {
  const dailyPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const wins = trades.filter(t => t.outcome === 'WIN').length;
  const losses = trades.filter(t => t.outcome === 'LOSS').length;

  return (
    <div className="h-full flex flex-col border-r border-border/50">
      {/* Date header */}
      <div className="px-4 py-3 border-b border-border/40">
        <h3 className="text-sm font-semibold tracking-tight">{format(parseISO(selectedDate), 'MMMM d, yyyy')}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-muted-foreground">{trades.length} trades</span>
          {wins > 0 && <span className="text-[10px] font-medium text-profit">{wins}W</span>}
          {losses > 0 && <span className="text-[10px] font-medium text-loss">{losses}L</span>}
          <span className={cn('text-xs font-semibold ml-auto tabular-nums', dailyPnl >= 0 ? 'text-profit' : 'text-loss')}>
            {dailyPnl >= 0 ? '+' : ''}${dailyPnl.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Trade items */}
      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          {trades.map(trade => (
            <button
              key={trade.id}
              onClick={() => onSelectTrade(trade)}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-md transition-all duration-150',
                'hover:bg-secondary/60',
                selectedTradeId === trade.id
                  ? 'bg-primary/10 border-l-2 border-l-primary'
                  : 'border-l-2 border-l-transparent'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {trade.direction === 'LONG' ? (
                    <ArrowUp className="w-3.5 h-3.5 text-profit" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 text-loss" />
                  )}
                  <span className="text-sm font-medium">{trade.pair}</span>
                  {trade.starred && <Star className="w-3 h-3 text-warning fill-current" />}
                </div>
                <div className="flex items-center gap-1">
                  {trade.status === 'CLOSED' && (!trade.ruleChecklist?.length || trade.ruleScore === 0) && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">📋</span>
                  )}
                  {trade.status === 'CLOSED' && !trade.revisedAt && differenceInDays(new Date(), parseISO(trade.date)) >= 7 && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">📝</span>
                  )}
                  <span className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
                    trade.status === 'PENDING' && 'text-warning bg-warning/10',
                    trade.status !== 'PENDING' && trade.outcome === 'WIN' && 'text-profit bg-profit/10',
                    trade.status !== 'PENDING' && trade.outcome === 'LOSS' && 'text-loss bg-loss/10',
                    trade.status !== 'PENDING' && trade.outcome === 'BREAKEVEN' && 'text-muted-foreground bg-muted/50'
                  )}>
                    {trade.status === 'PENDING' ? '🟡 PENDING' : trade.outcome}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground/60">
                  {trade.session} · {trade.timeframe} · {trade.strategy}
                </span>
                <span className={cn('text-xs font-semibold tabular-nums', trade.pnl >= 0 ? 'text-profit' : 'text-loss')}>
                  {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(0)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default TradePageList;
