import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { BarChart3, TrendingUp, Activity } from 'lucide-react';
import { useTrades } from '@/hooks/useTrades';
import { useAccountSettings } from '@/hooks/useAccountSettings';
import { defaultAccountSettings } from '@/data/mockData';
import { Skeleton } from '@/components/ui/skeleton';
import { DailyPnL } from '@/types/trade';
import { SectionVisibilityProvider } from '@/contexts/SectionVisibilityContext';
import { HiddenSectionsBar } from '@/components/common/HiddenSectionsBar';
import { HideableSection } from '@/components/common/HideableSection';

const glassCard = "border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]";
const tooltipStyle = { backgroundColor: 'hsl(0, 0%, 8%)', border: '1px solid hsla(0,0%,100%,0.1)', borderRadius: '8px', color: 'hsl(0, 0%, 95%)' };

const gradientAccents = [
  'from-emerald-500/15', 'from-blue-500/15', 'from-violet-500/15', 'from-emerald-500/15',
  'from-red-500/15', 'from-emerald-500/15', 'from-red-500/15', 'from-orange-500/15',
  'from-blue-500/15', 'from-violet-500/15',
];

const Analytics = () => {
  const { data: trades = [], isLoading } = useTrades();
  const { data: accountSettings = defaultAccountSettings } = useAccountSettings();

  const dailyPnL: DailyPnL[] = useMemo(() => {
    const map: Record<string, { pnl: number; trades: number }> = {};
    trades.forEach(t => {
      if (!map[t.date]) map[t.date] = { pnl: 0, trades: 0 };
      map[t.date].pnl += t.pnl;
      map[t.date].trades++;
    });
    return Object.entries(map)
      .map(([date, d]) => ({ date, pnl: d.pnl, trades: d.trades }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [trades]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-24 gap-4">
        <BarChart3 className="w-16 h-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold">কোনো analytics data নেই!</h2>
        <p className="text-muted-foreground text-sm text-center">Trade entry করলে এখানে performance statistics দেখা যাবে।</p>
      </div>
    );
  }

  const wins = trades.filter(t => t.outcome === 'WIN');
  const losses = trades.filter(t => t.outcome === 'LOSS');

  const totalPnL = trades.reduce((s, t) => s + t.pnl, 0);
  const winRate = (wins.length / trades.length) * 100;
  const avgWin = wins.reduce((s, t) => s + t.pnl, 0) / (wins.length || 1);
  const avgLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / (losses.length || 1));
  const profitFactor = (avgWin * wins.length) / (avgLoss * losses.length || 1);
  const bestTrade = Math.max(...trades.map(t => t.pnl));
  const worstTrade = Math.min(...trades.map(t => t.pnl));
  const avgRRR = trades.reduce((s, t) => s + t.rrr, 0) / trades.length;
  const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

  let maxDD = 0, peak = 0, running = 0;
  dailyPnL.forEach(d => { running += d.pnl; if (running > peak) peak = running; const dd = peak - running; if (dd > maxDD) maxDD = dd; });

  const equityCurve = (() => {
    let balance = accountSettings.startingBalance;
    return dailyPnL.map(d => { balance += d.pnl; return { date: d.date.slice(5), balance }; });
  })();

  const monthlyPnL = dailyPnL.map(d => ({ date: d.date.slice(5), pnl: d.pnl }));

  const metrics = [
    { label: 'Total P&L', value: `$${totalPnL.toFixed(0)}`, color: totalPnL >= 0 ? 'text-profit' : 'text-loss' },
    { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? 'text-profit' : 'text-loss' },
    { label: 'Profit Factor', value: profitFactor.toFixed(2), color: profitFactor >= 1.5 ? 'text-profit' : 'text-warning' },
    { label: 'Avg Win', value: `$${avgWin.toFixed(0)}`, color: 'text-profit' },
    { label: 'Avg Loss', value: `$${avgLoss.toFixed(0)}`, color: 'text-loss' },
    { label: 'Best Trade', value: `$${bestTrade.toFixed(0)}`, color: 'text-profit' },
    { label: 'Worst Trade', value: `$${worstTrade.toFixed(0)}`, color: 'text-loss' },
    { label: 'Max Drawdown', value: `$${maxDD.toFixed(0)}`, color: 'text-warning' },
    { label: 'Expectancy', value: `$${expectancy.toFixed(0)}`, color: expectancy >= 0 ? 'text-profit' : 'text-loss' },
    { label: 'Avg RRR', value: avgRRR.toFixed(2), color: avgRRR >= 1.5 ? 'text-profit' : 'text-warning' },
  ];

  return (
    <SectionVisibilityProvider pageKey="analytics">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center border border-blue-500/20">
            <BarChart3 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground">Performance overview & statistics</p>
          </div>
        </div>

        <HiddenSectionsBar />

        <HideableSection id="metrics" title="Key Metrics">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {metrics.map((m, i) => (
              <Card key={m.label} className={`${glassCard} bg-gradient-to-br ${gradientAccents[i]} to-transparent`}>
                <CardContent className="pt-4 pb-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                  <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </HideableSection>

        <HideableSection id="equity-curve" title="Equity Curve">
          <Card className={glassCard}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 text-primary" />
                </div>
                Equity Curve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsla(0,0%,100%,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toFixed(0)}`, 'Balance']} />
                    <Line type="monotone" dataKey="balance" stroke="hsl(145, 63%, 49%)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </HideableSection>

        <HideableSection id="daily-pnl" title="Daily P&L">
          <Card className={glassCard}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <Activity className="w-3 h-3 text-primary" />
                </div>
                Daily P&L
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyPnL}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsla(0,0%,100%,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toFixed(0)}`, 'P&L']} />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                      {monthlyPnL.map((entry, i) => (
                        <Cell key={i} fill={entry.pnl >= 0 ? 'hsl(145, 63%, 49%)' : 'hsl(355, 78%, 56%)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </HideableSection>
      </div>
    </SectionVisibilityProvider>
  );
};

export default Analytics;
