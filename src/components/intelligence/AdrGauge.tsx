import { Activity } from 'lucide-react';
import { PairWithFlags } from '@/lib/pairFlags';

interface AdrItem {
  pair: string;
  adr_pips: number;
  today_range_pips: number;
  adr_percent_used: number;
  status: string;
}

const statusConfig: Record<string, { color: string; label: string; bg: string }> = {
  exhausted: { color: 'text-red-400', label: 'Exhausted', bg: 'bg-red-500' },
  caution: { color: 'text-orange-400', label: 'Caution', bg: 'bg-orange-500' },
  good: { color: 'text-green-400', label: 'Good Entry', bg: 'bg-green-500' },
  fresh: { color: 'text-blue-400', label: 'Fresh', bg: 'bg-blue-500' },
  normal: { color: 'text-muted-foreground', label: 'Normal', bg: 'bg-muted' },
};

export function AdrGauge({ data }: { data: AdrItem }) {
  const cfg = statusConfig[data.status] || statusConfig.normal;
  const pct = Math.min(Number(data.adr_percent_used), 100);

  return (
    <div className="rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm p-3 hover:bg-card/70 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground">{data.pair}</span>
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.color} ${cfg.bg}/15`}>
          {cfg.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted/30 overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${cfg.bg}`}
          style={{ width: `${pct}%`, opacity: 0.8 }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Today: <span className="font-bold text-foreground">{Number(data.today_range_pips).toFixed(1)}</span> pips</span>
        <span>ADR: <span className="font-bold text-foreground">{Number(data.adr_pips).toFixed(1)}</span> pips</span>
        <span className="font-bold text-foreground">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}
