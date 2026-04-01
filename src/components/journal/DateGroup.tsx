import { Trade } from '@/types/trade';
import TradeCard from './TradeCard';
import { format, parseISO } from 'date-fns';

interface DateGroupProps {
  date: string;
  trades: Trade[];
  onTradeClick: (trade: Trade) => void;
}

const DateGroup = ({ date, trades, onTradeClick }: DateGroupProps) => {
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const wins = trades.filter(t => t.outcome === 'WIN').length;
  const losses = trades.filter(t => t.outcome === 'LOSS').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">
            {format(parseISO(date), 'MMMM d, yyyy')}
          </h2>
          <span className="text-xs text-muted-foreground">
            {trades.length} trade{trades.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {wins > 0 && <span className="text-xs text-profit">{wins}W</span>}
          {losses > 0 && <span className="text-xs text-loss">{losses}L</span>}
          <span className={`font-bold ${totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {trades.map(trade => (
          <TradeCard key={trade.id} trade={trade} onClick={() => onTradeClick(trade)} />
        ))}
      </div>
    </div>
  );
};

export default DateGroup;
