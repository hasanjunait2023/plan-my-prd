import { CurrencyStrengthRecord, CURRENCY_FLAGS, CATEGORY_COLORS } from '@/types/correlation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Columns2 } from 'lucide-react';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];

interface TimeframeComparisonProps {
  londonData: CurrencyStrengthRecord[];
  nyData: CurrencyStrengthRecord[];
}

function withOpacity(hslColor: string, opacity: number): string {
  const match = hslColor.match(/hsl\(([^)]+)\)/);
  if (match) return `hsla(${match[1]}, ${opacity})`;
  return hslColor;
}

export function TimeframeComparison({ londonData, nyData }: TimeframeComparisonProps) {
  const londonMap = new Map<string, CurrencyStrengthRecord>();
  const nyMap = new Map<string, CurrencyStrengthRecord>();
  for (const d of londonData) londonMap.set(d.currency, d);
  for (const d of nyData) nyMap.set(d.currency, d);

  const rows = CURRENCIES.map(c => {
    const ld = londonMap.get(c);
    const nd = nyMap.get(c);
    const londonStr = ld?.strength ?? null;
    const nyStr = nd?.strength ?? null;
    const shift = londonStr !== null && nyStr !== null ? nyStr - londonStr : null;
    return {
      currency: c,
      flag: CURRENCY_FLAGS[c] || '🏳️',
      londonStr,
      londonCat: ld?.category || '-',
      nyStr,
      nyCat: nd?.category || '-',
      shift,
    };
  }).sort((a, b) => {
    const aShift = Math.abs(a.shift ?? 0);
    const bShift = Math.abs(b.shift ?? 0);
    return bShift - aShift;
  });

  if (londonData.length === 0 && nyData.length === 0) return null;

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
            <Columns2 className="w-3.5 h-3.5 text-primary" />
          </div>
          <CardTitle className="text-base font-bold tracking-tight">London vs New York</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/20">
                <th className="text-left py-2 px-2 text-[11px] font-bold text-muted-foreground">Currency</th>
                <th className="text-center py-2 px-2 text-[11px] font-bold text-muted-foreground">🇬🇧 London</th>
                <th className="text-center py-2 px-2 text-[11px] font-bold text-muted-foreground">Category</th>
                <th className="text-center py-2 px-2 text-[11px] font-bold text-muted-foreground">🇺🇸 New York</th>
                <th className="text-center py-2 px-2 text-[11px] font-bold text-muted-foreground">Category</th>
                <th className="text-center py-2 px-2 text-[11px] font-bold text-muted-foreground">Shift</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const londonColor = CATEGORY_COLORS[row.londonCat] || 'hsl(0,0%,50%)';
                const nyColor = CATEGORY_COLORS[row.nyCat] || 'hsl(0,0%,50%)';
                const shiftColor = row.shift !== null
                  ? row.shift > 0 ? 'hsl(142, 71%, 45%)' : row.shift < 0 ? 'hsl(0, 84%, 60%)' : 'hsl(0,0%,50%)'
                  : 'hsl(0,0%,50%)';

                return (
                  <tr key={row.currency} className="border-b border-border/10 hover:bg-muted/5 transition-colors">
                    <td className="py-2 px-2">
                      <span className="text-base mr-1.5">{row.flag}</span>
                      <span className="font-bold text-foreground text-xs">{row.currency}</span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className="font-extrabold text-sm" style={{ color: londonColor }}>
                        {row.londonStr !== null ? (row.londonStr > 0 ? '+' : '') + row.londonStr : '—'}
                      </span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span
                        className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{ color: londonColor, backgroundColor: withOpacity(londonColor, 0.12) }}
                      >
                        {row.londonCat}
                      </span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className="font-extrabold text-sm" style={{ color: nyColor }}>
                        {row.nyStr !== null ? (row.nyStr > 0 ? '+' : '') + row.nyStr : '—'}
                      </span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span
                        className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{ color: nyColor, backgroundColor: withOpacity(nyColor, 0.12) }}
                      >
                        {row.nyCat}
                      </span>
                    </td>
                    <td className="text-center py-2 px-2">
                      {row.shift !== null ? (
                        <span className="font-bold text-sm" style={{ color: shiftColor }}>
                          {row.shift > 0 ? '↑' : row.shift < 0 ? '↓' : '—'}
                          {row.shift !== 0 && <span className="ml-0.5">{Math.abs(row.shift)}</span>}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
