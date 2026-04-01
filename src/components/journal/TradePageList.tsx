import { Trade } from '@/types/trade';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowUp, ArrowDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

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
    <div className="h-full flex flex-col border-r border-border bg-card/50">
      {/* Date header */}
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold">{format(parseISO(selectedDate), 'MMMM d, yyyy')}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{trades.length} trades</span>
          {wins > 0 && <span className="text-[10px] text-profit">{wins}W</span>}
          {losses > 0 && <span className="text-[10px] text-loss">{losses}L</span>}
          <span className={cn('text-xs font-bold ml-auto', dailyPnl >= 0 ? 'text-profit' : 'text-loss')}>
            {dailyPnl >= 0 ? '+' : ''}${dailyPnl.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Trade items */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {trades.map(trade => (
            <button
              key={trade.id}
              onClick={() => onSelectTrade(trade)}
              className={cn(
                'w-full text-left px-3 py-3 transition-colors border-b border-border/50',
                'hover:bg-accent/50',
                selectedTradeId === trade.id && 'bg-accent border-l-2 border-l-primary'
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
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 py-0',
                    trade.outcome === 'WIN' && 'border-profit text-profit',
                    trade.outcome === 'LOSS' && 'border-loss text-loss',
                    trade.outcome === 'BREAKEVEN' && 'border-muted-foreground text-muted-foreground'
                  )}
                >
                  {trade.outcome}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {trade.session} · {trade.timeframe} · {trade.strategy}
                </span>
                <span className={cn('text-xs font-semibold', trade.pnl >= 0 ? 'text-profit' : 'text-loss')}>
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
