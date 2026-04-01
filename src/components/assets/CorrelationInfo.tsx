import { ArrowLeftRight, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CorrelationItem {
  label: string;
  value: string;
  detail: string;
  color: string;
}

const CORRELATIONS: Record<string, CorrelationItem[]> = {
  XAUUSD: [
    { label: 'USD Inverse Correlation', value: '-0.85', detail: 'DXY দুর্বল হলে Gold সাধারণত উপরে যায়', color: 'text-red-400' },
    { label: 'Real Yields', value: 'Inverse', detail: 'US real yields কমলে Gold bullish হয়', color: 'text-orange-400' },
    { label: 'S&P 500', value: '-0.30', detail: 'Risk-off sentiment এ Gold safe haven হিসেবে কাজ করে', color: 'text-yellow-400' },
  ],
  XAGUSD: [
    { label: 'Gold Correlation', value: '+0.88', detail: 'Silver সাধারণত Gold কে closely follow করে', color: 'text-primary' },
    { label: 'Gold-Silver Ratio', value: '~78', detail: '80+ = Silver cheap, 60- = Silver expensive', color: 'text-blue-400' },
    { label: 'Industrial Index', value: '+0.45', detail: 'Manufacturing growth Silver কে support করে', color: 'text-purple-400' },
  ],
  USOIL: [
    { label: 'USD Correlation', value: '-0.60', detail: 'Weak USD generally supports Oil prices', color: 'text-red-400' },
    { label: 'OPEC Influence', value: 'High', detail: 'OPEC production cuts = Oil bullish', color: 'text-orange-400' },
    { label: 'CAD Correlation', value: '+0.70', detail: 'Canada is major oil exporter — Oil up = CAD strong', color: 'text-primary' },
  ],
  BTCUSD: [
    { label: 'BTC Dominance', value: '~52%', detail: 'High dominance = altcoins underperform', color: 'text-orange-400' },
    { label: 'Nasdaq Correlation', value: '+0.65', detail: 'BTC increasingly correlates with tech stocks', color: 'text-blue-400' },
    { label: 'Fear & Greed', value: 'Sentiment', detail: 'Extreme fear = potential buy zone, Extreme greed = caution', color: 'text-yellow-400' },
  ],
};

export function CorrelationInfo({ symbol }: { symbol: string }) {
  const items = CORRELATIONS[symbol] || [];

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-blue-400" />
          Correlations & Indicators
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/20">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <Activity className={`w-3 h-3 ${item.color}`} />
                  <span className="text-xs font-semibold text-foreground">{item.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{item.detail}</p>
              </div>
              <span className={`text-sm font-bold ${item.color} shrink-0 ml-3`}>{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
