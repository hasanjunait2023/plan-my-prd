import { CurrencyStrengthRecord, CURRENCY_FLAGS, generatePairSuggestions } from '@/types/correlation';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { MiniChart } from './MiniChart';

interface PairSuggestionsProps {
  data: CurrencyStrengthRecord[];
}

export function PairSuggestions({ data }: PairSuggestionsProps) {
  const suggestions = generatePairSuggestions(data);
  if (!suggestions.length) return null;

  const buys = suggestions.filter(s => s.direction === 'BUY').slice(0, 3);
  const sells = suggestions.filter(s => s.direction === 'SELL').slice(0, 3);

  const toSymbol = (pair: string) => 'FX:' + pair.replace('/', '');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* BUY Suggestions */}
      <div className="relative overflow-hidden rounded-xl border border-border/30 bg-gradient-to-br from-emerald-500/5 to-transparent p-5 shadow-[inset_0_1px_0_0_hsla(142,71%,45%,0.08)]">
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-10 bg-emerald-500" />
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2 relative z-10">
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
            <ArrowUpRight className="w-3.5 h-3.5" style={{ color: 'hsl(142, 71%, 45%)' }} />
          </div>
          <span className="uppercase tracking-widest text-[11px]">BUY Signals</span>
        </h3>
        <div className="space-y-2 relative z-10">
          {buys.map((s, i) => (
            <div key={i}>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-card/60 border border-border/20 transition-all hover:border-emerald-500/20 hover:bg-emerald-500/5">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{CURRENCY_FLAGS[s.strongCurrency]}</span>
                  <span className="font-bold text-foreground text-sm tracking-wide">{s.pair}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
                    Gap {s.strengthDiff}
                  </span>
                  <span
                    className="text-[10px] font-extrabold px-2.5 py-1 rounded-md"
                    style={{
                      color: 'hsl(142, 71%, 45%)',
                      backgroundColor: 'hsla(142, 71%, 45%, 0.12)',
                      boxShadow: '0 0 8px hsla(142, 71%, 45%, 0.08)',
                    }}
                  >
                    BUY
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <MiniChart symbol={toSymbol(s.pair)} pair={s.pair} interval="60" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SELL Suggestions */}
      <div className="relative overflow-hidden rounded-xl border border-border/30 bg-gradient-to-br from-red-500/5 to-transparent p-5 shadow-[inset_0_1px_0_0_hsla(0,84%,60%,0.08)]">
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-10 bg-red-500" />
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2 relative z-10">
          <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center">
            <ArrowDownRight className="w-3.5 h-3.5" style={{ color: 'hsl(0, 84%, 60%)' }} />
          </div>
          <span className="uppercase tracking-widest text-[11px]">SELL Signals</span>
        </h3>
        <div className="space-y-2 relative z-10">
          {sells.map((s, i) => (
            <div key={i}>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-card/60 border border-border/20 transition-all hover:border-red-500/20 hover:bg-red-500/5">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{CURRENCY_FLAGS[s.weakCurrency]}</span>
                  <span className="font-bold text-foreground text-sm tracking-wide">{s.pair}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
                    Gap {Math.abs(s.strengthDiff)}
                  </span>
                  <span
                    className="text-[10px] font-extrabold px-2.5 py-1 rounded-md"
                    style={{
                      color: 'hsl(0, 84%, 60%)',
                      backgroundColor: 'hsla(0, 84%, 60%, 0.12)',
                      boxShadow: '0 0 8px hsla(0, 84%, 60%, 0.08)',
                    }}
                  >
                    SELL
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <MiniChart symbol={toSymbol(s.pair)} pair={s.pair} interval="60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
