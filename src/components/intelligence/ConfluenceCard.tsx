import { TrendingUp, TrendingDown, Zap, Clock, BarChart3, Crosshair } from 'lucide-react';
import { PairWithFlags } from '@/lib/pairFlags';

interface ConfluenceScore {
  pair: string;
  grade: string;
  strength_diff: number;
  ema_score: number;
  session_active: boolean;
  active_session: string | null;
  direction: string;
}

const gradeColors: Record<string, { bg: string; text: string; glow: string; border: string }> = {
  'A+': { bg: 'bg-green-500/15', text: 'text-green-400', glow: 'shadow-[0_0_12px_hsla(142,71%,45%,0.3)]', border: 'border-green-500/30' },
  'A': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', glow: 'shadow-[0_0_8px_hsla(160,70%,45%,0.2)]', border: 'border-emerald-500/30' },
  'B': { bg: 'bg-yellow-500/15', text: 'text-yellow-400', glow: '', border: 'border-yellow-500/20' },
  'C': { bg: 'bg-orange-500/15', text: 'text-orange-400', glow: '', border: 'border-orange-500/20' },
  'D': { bg: 'bg-red-500/15', text: 'text-red-400', glow: '', border: 'border-red-500/20' },
};

export function ConfluenceCard({ data }: { data: ConfluenceScore }) {
  const g = gradeColors[data.grade] || gradeColors['D'];
  const isBuy = data.direction === 'BUY';

  return (
    <div className={`rounded-xl border ${g.border} bg-card/50 backdrop-blur-sm p-4 hover:bg-card/70 transition-all duration-200 ${g.glow}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isBuy ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
          <PairWithFlags pair={data.pair} className="text-sm font-bold text-foreground" />
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isBuy ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
            {data.direction}
          </span>
        </div>
        <div className={`${g.bg} ${g.text} px-2.5 py-1 rounded-lg text-sm font-extrabold`}>
          {data.grade}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-1.5 bg-muted/20 rounded-lg px-2 py-1.5">
          <BarChart3 className="w-3 h-3 text-muted-foreground" />
          <div>
            <p className="text-[9px] text-muted-foreground">Str Diff</p>
            <p className="text-xs font-bold text-foreground">{Number(data.strength_diff).toFixed(0)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/20 rounded-lg px-2 py-1.5">
          <Crosshair className="w-3 h-3 text-muted-foreground" />
          <div>
            <p className="text-[9px] text-muted-foreground">EMA</p>
            <p className="text-xs font-bold text-foreground">{data.ema_score}/9</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/20 rounded-lg px-2 py-1.5">
          {data.session_active ? (
            <Zap className="w-3 h-3 text-yellow-400" />
          ) : (
            <Clock className="w-3 h-3 text-muted-foreground" />
          )}
          <div>
            <p className="text-[9px] text-muted-foreground">Session</p>
            <p className="text-[10px] font-bold text-foreground truncate">
              {data.active_session || 'Off'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
