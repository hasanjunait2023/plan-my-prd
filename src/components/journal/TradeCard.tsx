import { Trade } from '@/types/trade';
import { Badge } from '@/components/ui/badge';
import { Star, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';
import { PairWithFlags } from '@/lib/pairFlags';

interface TradeCardProps {
  trade: Trade;
  onClick: () => void;
}

const TradeCard = ({ trade, onClick }: TradeCardProps) => {
  const isWin = trade.outcome === 'WIN';
  const isLoss = trade.outcome === 'LOSS';

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card hover:bg-accent/50 border border-border/50 rounded-lg p-4 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {trade.direction === 'LONG' ? (
            <div className="w-8 h-8 rounded-full bg-profit/10 flex items-center justify-center">
              <ArrowUp className="w-4 h-4 text-profit" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-loss/10 flex items-center justify-center">
              <ArrowDown className="w-4 h-4 text-loss" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <PairWithFlags pair={trade.pair} className="font-semibold" />
              <Badge variant={isWin ? 'default' : isLoss ? 'destructive' : 'secondary'}
                className={`text-[10px] px-1.5 py-0 ${isWin ? 'bg-profit text-primary-foreground' : ''}`}>
                {trade.outcome}
              </Badge>
              {trade.starred && <Star className="w-3.5 h-3.5 text-warning fill-current" />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {trade.session} &middot; {trade.timeframe} &middot; {trade.strategy}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={`font-bold ${trade.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {trade.pips >= 0 ? '+' : ''}{trade.pips} pips
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </button>
  );
};

export default TradeCard;
