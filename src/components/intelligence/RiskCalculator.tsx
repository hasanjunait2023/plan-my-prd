import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RiskCalculator() {
  const [balance, setBalance] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [entry, setEntry] = useState(0);
  const [sl, setSl] = useState(0);
  const [tp, setTp] = useState(0);

  const riskAmount = balance * (riskPercent / 100);
  const slDistance = Math.abs(entry - sl);
  const tpDistance = Math.abs(tp - entry);
  const rr = slDistance > 0 ? (tpDistance / slDistance) : 0;
  // Standard lot pip value ~$10 for most pairs, mini lot = $1
  const pipValue = 10;
  const slPips = slDistance > 0 ? slDistance * 10000 : 0; // non-JPY assumed
  const lotSize = slPips > 0 ? (riskAmount / (slPips * pipValue)) : 0;
  const potentialProfit = riskAmount * rr;

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
            <Calculator className="w-3.5 h-3.5 text-primary" />
          </div>
          <CardTitle className="text-sm font-bold">Risk Calculator</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <Label className="text-[10px] text-muted-foreground">Account Balance ($)</Label>
            <Input
              type="number"
              value={balance}
              onChange={e => setBalance(Number(e.target.value))}
              className="h-8 text-xs bg-muted/20 border-border/30"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Risk %</Label>
            <Input
              type="number"
              value={riskPercent}
              step={0.5}
              onChange={e => setRiskPercent(Number(e.target.value))}
              className="h-8 text-xs bg-muted/20 border-border/30"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Entry Price</Label>
            <Input
              type="number"
              value={entry || ''}
              step={0.00001}
              onChange={e => setEntry(Number(e.target.value))}
              className="h-8 text-xs bg-muted/20 border-border/30"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Stop Loss</Label>
            <Input
              type="number"
              value={sl || ''}
              step={0.00001}
              onChange={e => setSl(Number(e.target.value))}
              className="h-8 text-xs bg-muted/20 border-border/30"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-[10px] text-muted-foreground">Take Profit</Label>
            <Input
              type="number"
              value={tp || ''}
              step={0.00001}
              onChange={e => setTp(Number(e.target.value))}
              className="h-8 text-xs bg-muted/20 border-border/30"
            />
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Risk Amount', value: `$${riskAmount.toFixed(2)}`, color: 'text-red-400' },
            { label: 'Lot Size', value: lotSize.toFixed(2), color: 'text-foreground' },
            { label: 'R:R Ratio', value: `1:${rr.toFixed(1)}`, color: rr >= 2 ? 'text-green-400' : rr >= 1 ? 'text-yellow-400' : 'text-red-400' },
            { label: 'Potential Profit', value: `$${potentialProfit.toFixed(2)}`, color: 'text-green-400' },
          ].map(item => (
            <div key={item.label} className="bg-muted/20 rounded-lg p-2.5 text-center">
              <p className="text-[9px] text-muted-foreground mb-0.5">{item.label}</p>
              <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
