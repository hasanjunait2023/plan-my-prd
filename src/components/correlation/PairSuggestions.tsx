import { CurrencyStrengthRecord, CURRENCY_FLAGS, generatePairSuggestions } from '@/types/correlation';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface PairSuggestionsProps {
  data: CurrencyStrengthRecord[];
}

export function PairSuggestions({ data }: PairSuggestionsProps) {
  const suggestions = generatePairSuggestions(data);
  if (!suggestions.length) return null;

  const buys = suggestions.filter(s => s.direction === 'BUY').slice(0, 4);
  const sells = suggestions.filter(s => s.direction === 'SELL').slice(0, 4);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* BUY Suggestions */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4" style={{ color: 'hsl(142, 71%, 45%)' }} />
          BUY Suggestions
        </h3>
        <div className="space-y-2">
          {buys.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="text-sm">{CURRENCY_FLAGS[s.strongCurrency]}</span>
                <span className="font-semibold text-foreground text-sm">{s.pair}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Gap: {s.strengthDiff}</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{
                    color: 'hsl(142, 71%, 45%)',
                    backgroundColor: 'hsla(142, 71%, 45%, 0.12)',
                  }}
                >
                  BUY
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SELL Suggestions */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <ArrowDownRight className="w-4 h-4" style={{ color: 'hsl(0, 84%, 60%)' }} />
          SELL Suggestions
        </h3>
        <div className="space-y-2">
          {sells.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="text-sm">{CURRENCY_FLAGS[s.weakCurrency]}</span>
                <span className="font-semibold text-foreground text-sm">{s.pair}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Gap: {Math.abs(s.strengthDiff)}</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{
                    color: 'hsl(0, 84%, 60%)',
                    backgroundColor: 'hsla(0, 84%, 60%, 0.12)',
                  }}
                >
                  SELL
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
