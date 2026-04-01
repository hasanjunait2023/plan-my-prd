import { Lightbulb, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Tip {
  icon: typeof Lightbulb;
  color: string;
  title: string;
  desc: string;
}

const TIPS: Record<string, Tip[]> = {
  XAUUSD: [
    { icon: Clock, color: 'text-blue-400', title: 'Best Sessions', desc: 'London open (07:00-09:00 GMT) এবং NY open (13:00-15:00 GMT) — সবচেয়ে বেশি volume ও volatility।' },
    { icon: TrendingUp, color: 'text-primary', title: 'USD Inverse', desc: 'Gold সাধারণত USD এর বিপরীতে move করে। DXY দুর্বল = Gold bullish।' },
    { icon: AlertTriangle, color: 'text-orange-400', title: 'News Impact', desc: 'NFP, CPI, FOMC — এই events এ Gold 300-500 pips move করতে পারে। News এর সময় cautious থাকুন।' },
    { icon: Lightbulb, color: 'text-yellow-400', title: 'Spread Note', desc: 'Asian session এ spread বেশি থাকে। London/NY overlap এ tightest spread পাবেন।' },
  ],
  XAGUSD: [
    { icon: TrendingUp, color: 'text-primary', title: 'Gold Correlation', desc: 'Silver সাধারণত Gold কে follow করে (85%+ correlation)। Gold এর direction দেখে Silver trade plan করুন।' },
    { icon: Lightbulb, color: 'text-yellow-400', title: 'Gold-Silver Ratio', desc: 'Ratio 80+ = Silver undervalued (buy signal)। Ratio 60- = Silver overvalued। Historical average ~65।' },
    { icon: AlertTriangle, color: 'text-orange-400', title: 'Higher Volatility', desc: 'Silver, Gold এর চেয়ে percentage wise বেশি volatile। Smaller position size recommend করা হয়।' },
    { icon: Clock, color: 'text-blue-400', title: 'Industrial Demand', desc: 'Silver এর industrial use আছে (solar panels, electronics)। Manufacturing data Silver কে affect করে।' },
  ],
  USOIL: [
    { icon: Clock, color: 'text-blue-400', title: 'Inventory Reports', desc: 'API Report (মঙ্গলবার 4:30 PM EST) ও EIA Report (বুধবার 10:30 AM EST) — Oil এর সবচেয়ে impactful events।' },
    { icon: AlertTriangle, color: 'text-orange-400', title: 'Geopolitical Risk', desc: 'Middle East tensions, OPEC decisions — Oil price এ sudden 3-5% move আনতে পারে।' },
    { icon: TrendingUp, color: 'text-primary', title: 'Seasonal Patterns', desc: 'Summer driving season (May-Sep) = demand বাড়ে। Winter heating season ও demand increase।' },
    { icon: Lightbulb, color: 'text-yellow-400', title: 'Spread Warning', desc: 'Oil এর spread সাধারণত 3-5 pips। High volatility events এ 10+ pips হতে পারে।' },
  ],
  BTCUSD: [
    { icon: Clock, color: 'text-blue-400', title: '24/7 Market', desc: 'Crypto market 24/7 open। সবচেয়ে বেশি volume US market hours এ (14:00-21:00 UTC)।' },
    { icon: TrendingUp, color: 'text-primary', title: 'Halving Cycle', desc: 'Bitcoin প্রতি ~4 বছরে halving হয়। Historically halving এর 12-18 মাস পরে new ATH হয়।' },
    { icon: AlertTriangle, color: 'text-orange-400', title: 'Weekend Volatility', desc: 'Weekend এ low liquidity = sudden pumps/dumps। Weekend trades এ careful থাকুন।' },
    { icon: Lightbulb, color: 'text-yellow-400', title: 'BTC Dominance', desc: 'BTC dominance 50%+ = altcoins weak। Dominance কমলে altseason শুরু হওয়ার chance।' },
  ],
};

export function TradingTipsCard({ symbol }: { symbol: string }) {
  const tips = TIPS[symbol] || [];

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          Trading Tips & Best Practices
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid gap-3">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/20">
              <div className={`p-1.5 rounded-lg bg-muted/40 ${tip.color} shrink-0 mt-0.5`}>
                <tip.icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-0.5">{tip.title}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
