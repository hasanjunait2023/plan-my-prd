import { TrendingUp, TrendingDown, CheckCircle2, XCircle } from 'lucide-react';
import type { PairAlignmentSummary } from '@/types/ema';
import { PairWithFlags } from '@/lib/pairFlags';

interface AlignmentCardProps {
  data: PairAlignmentSummary;
  onClick?: () => void;
}

function EmaCheck({ aligned }: { aligned: boolean }) {
  return aligned ? (
    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
  ) : (
    <XCircle className="w-3.5 h-3.5 text-red-400/60" />
  );
}

export function AlignmentCard({ data, onClick }: AlignmentCardProps) {
  const isBuy = data.direction === 'BUY';
  const scorePercent = (data.score / 9) * 100;

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border bg-card/60 backdrop-blur-sm p-4 cursor-pointer transition-all duration-300 hover:border-border/50 ${
        isBuy
          ? 'border-green-500/20 shadow-[0_0_15px_hsla(142,71%,45%,0.08)] hover:shadow-[0_0_20px_hsla(142,71%,45%,0.15)]'
          : 'border-red-500/20 shadow-[0_0_15px_hsla(0,84%,60%,0.08)] hover:shadow-[0_0_20px_hsla(0,84%,60%,0.15)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{data.pair}</span>
          <span
            className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isBuy
                ? 'bg-green-500/15 text-green-400'
                : 'bg-red-500/15 text-red-400'
            }`}
          >
            {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {data.direction}
          </span>
        </div>
        <span className="text-xs font-bold text-muted-foreground">{data.score}/9</span>
      </div>

      {/* Timeframe Grid */}
      <div className="space-y-1.5">
        {(['5min', '15min', '1h'] as const).map((tf) => {
          const a = data.alignments[tf];
          return (
            <div key={tf} className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-muted-foreground w-10">{tf}</span>
              <div className="flex items-center gap-1.5">
                <EmaCheck aligned={a.ema_9} />
                <EmaCheck aligned={a.ema_15} />
                <EmaCheck aligned={a.ema_200} />
              </div>
              {a.aligned && (
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                  isBuy ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  ALIGNED
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Score Bar */}
      <div className="mt-3">
        <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isBuy
                ? 'bg-gradient-to-r from-green-500 to-green-400'
                : 'bg-gradient-to-r from-red-500 to-red-400'
            }`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
