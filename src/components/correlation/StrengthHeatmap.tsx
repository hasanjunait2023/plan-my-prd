import { CurrencyStrengthRecord, CURRENCY_FLAGS } from '@/types/correlation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Grid3X3 } from 'lucide-react';
import { useState } from 'react';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];

interface StrengthHeatmapProps {
  data: CurrencyStrengthRecord[];
  onPairClick?: (pair: string) => void;
}

function getColor(diff: number): string {
  const abs = Math.min(Math.abs(diff), 10);
  const intensity = abs / 10;
  if (diff > 0) return `hsla(142, 71%, 45%, ${0.15 + intensity * 0.7})`;
  if (diff < 0) return `hsla(0, 84%, 60%, ${0.15 + intensity * 0.7})`;
  return 'hsla(0, 0%, 50%, 0.1)';
}

function getTextColor(diff: number): string {
  const abs = Math.abs(diff);
  if (abs >= 5) return 'hsl(0, 0%, 95%)';
  return 'hsl(0, 0%, 70%)';
}

export function StrengthHeatmap({ data, onPairClick }: StrengthHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const strengthMap = new Map<string, number>();
  for (const d of data) {
    strengthMap.set(d.currency, d.strength);
  }

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
            <Grid3X3 className="w-3.5 h-3.5 text-primary" />
          </div>
          <CardTitle className="text-base font-bold tracking-tight">Strength Heatmap</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-12 h-8" />
                {CURRENCIES.map(q => (
                  <th key={q} className="text-center text-[11px] font-bold text-muted-foreground p-1 w-14">
                    <span className="text-sm">{CURRENCY_FLAGS[q]}</span>
                    <br />{q}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CURRENCIES.map(base => (
                <tr key={base}>
                  <td className="text-[11px] font-bold text-muted-foreground p-1 text-right pr-2">
                    <span className="text-sm">{CURRENCY_FLAGS[base]}</span> {base}
                  </td>
                  {CURRENCIES.map(quote => {
                    if (base === quote) {
                      return (
                        <td key={quote} className="p-0.5">
                          <div className="w-full h-9 rounded-md bg-muted/5 flex items-center justify-center text-[10px] text-muted-foreground/30">—</div>
                        </td>
                      );
                    }
                    const baseStr = strengthMap.get(base) ?? 0;
                    const quoteStr = strengthMap.get(quote) ?? 0;
                    const diff = baseStr - quoteStr;
                    const cellKey = `${base}/${quote}`;
                    const isHovered = hoveredCell === cellKey;

                    return (
                      <td key={quote} className="p-0.5">
                        <div
                          className="w-full h-9 rounded-md flex items-center justify-center text-[11px] font-bold cursor-pointer transition-all duration-200"
                          style={{
                            backgroundColor: getColor(diff),
                            color: getTextColor(diff),
                            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                            zIndex: isHovered ? 10 : 1,
                            boxShadow: isHovered ? '0 0 12px hsla(0,0%,0%,0.4)' : 'none',
                          }}
                          onMouseEnter={() => setHoveredCell(cellKey)}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => onPairClick?.(`${base}/${quote}`)}
                          title={`${base}/${quote}: ${diff > 0 ? '+' : ''}${diff}`}
                        >
                          {diff > 0 ? '+' : ''}{diff}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          Row (Base) - Column (Quote) = Strength Difference • ক্লিক করে pair chart দেখুন
        </p>
      </CardContent>
    </Card>
  );
}
