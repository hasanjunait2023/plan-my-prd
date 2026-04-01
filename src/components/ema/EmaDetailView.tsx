import { X } from 'lucide-react';
import type { EmaAlignment } from '@/types/ema';

interface EmaDetailViewProps {
  pair: string;
  alignments: EmaAlignment[];
  onClose: () => void;
}

export function EmaDetailView({ pair, alignments, onClose }: EmaDetailViewProps) {
  const grouped = {
    '3min': alignments.find((a) => a.timeframe === '3min'),
    '15min': alignments.find((a) => a.timeframe === '15min'),
    '1h': alignments.find((a) => a.timeframe === '1h'),
  };

  return (
    <div className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-5 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground">{pair} — EMA Detail</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left text-xs text-muted-foreground font-medium py-2 px-3">Timeframe</th>
              <th className="text-right text-xs text-muted-foreground font-medium py-2 px-3">Price</th>
              <th className="text-right text-xs text-muted-foreground font-medium py-2 px-3">EMA 9</th>
              <th className="text-right text-xs text-muted-foreground font-medium py-2 px-3">EMA 15</th>
              <th className="text-right text-xs text-muted-foreground font-medium py-2 px-3">EMA 200</th>
              <th className="text-center text-xs text-muted-foreground font-medium py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(['3min', '15min', '1h'] as const).map((tf) => {
              const row = grouped[tf];
              if (!row) return (
                <tr key={tf} className="border-b border-border/20">
                  <td className="py-2.5 px-3 text-xs font-medium text-foreground">{tf}</td>
                  <td colSpan={5} className="py-2.5 px-3 text-xs text-muted-foreground text-center">No data</td>
                </tr>
              );
              return (
                <tr key={tf} className="border-b border-border/20">
                  <td className="py-2.5 px-3 text-xs font-medium text-foreground">{tf}</td>
                  <td className="py-2.5 px-3 text-xs text-foreground text-right font-mono">{Number(row.current_price).toFixed(5)}</td>
                  <td className={`py-2.5 px-3 text-xs text-right font-mono ${
                    row.current_price > row.ema_9 ? 'text-green-400' : 'text-red-400'
                  }`}>{Number(row.ema_9).toFixed(5)}</td>
                  <td className={`py-2.5 px-3 text-xs text-right font-mono ${
                    row.current_price > row.ema_15 ? 'text-green-400' : 'text-red-400'
                  }`}>{Number(row.ema_15).toFixed(5)}</td>
                  <td className={`py-2.5 px-3 text-xs text-right font-mono ${
                    row.current_price > row.ema_200 ? 'text-green-400' : 'text-red-400'
                  }`}>{Number(row.ema_200).toFixed(5)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      row.alignment_type === 'BULLISH'
                        ? 'bg-green-500/15 text-green-400'
                        : row.alignment_type === 'BEARISH'
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-muted/50 text-muted-foreground'
                    }`}>
                      {row.alignment_type}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
