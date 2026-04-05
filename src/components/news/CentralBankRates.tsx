import { Card } from '@/components/ui/card';
import { Landmark } from 'lucide-react';

const rates = [
  { currency: 'USD', rate: '4.50%', bank: 'Fed', flag: '🇺🇸' },
  { currency: 'EUR', rate: '2.65%', bank: 'ECB', flag: '🇪🇺' },
  { currency: 'GBP', rate: '4.50%', bank: 'BoE', flag: '🇬🇧' },
  { currency: 'JPY', rate: '0.50%', bank: 'BoJ', flag: '🇯🇵' },
  { currency: 'AUD', rate: '4.10%', bank: 'RBA', flag: '🇦🇺' },
  { currency: 'CAD', rate: '2.75%', bank: 'BoC', flag: '🇨🇦' },
  { currency: 'CHF', rate: '0.25%', bank: 'SNB', flag: '🇨🇭' },
  { currency: 'NZD', rate: '3.75%', bank: 'RBNZ', flag: '🇳🇿' },
];

export function CentralBankRates() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Landmark className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Central Bank Interest Rates</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {rates.map((r) => (
          <Card key={r.currency} className="bg-card/60 border-border/30 p-3 text-center hover:border-primary/30 transition-colors">
            <div className="text-lg mb-1">{r.flag}</div>
            <div className="text-xs font-bold text-foreground">{r.currency}</div>
            <div className="text-base font-bold text-primary mt-0.5">{r.rate}</div>
            <div className="text-[10px] text-muted-foreground">{r.bank}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
