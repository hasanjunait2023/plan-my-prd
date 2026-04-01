import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockTrades, mockDailyPnL, mockAccountSettings } from '@/data/mockData';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const Analytics = () => {
  const [period, setPeriod] = useState('all');

  const trades = mockTrades;
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
  mockDailyPnL.forEach(d => { running += d.pnl; if (running > peak) peak = running; const dd = peak - running; if (dd > maxDD) maxDD = dd; });

  const equityCurve = useMemo(() => {
    let balance = mockAccountSettings.startingBalance;
    return mockDailyPnL.map(d => { balance += d.pnl; return { date: d.date.slice(5), balance }; });
  }, []);

  const monthlyPnL = mockDailyPnL.map(d => ({ date: d.date.slice(5), pnl: d.pnl }));

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

  const tooltipStyle = { backgroundColor: 'hsl(210, 38%, 17%)', border: 'none', borderRadius: '8px', color: 'hsl(192, 15%, 94%)' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance overview & statistics</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">Quarter</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {metrics.map(m => (
          <Card key={m.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
              <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Equity Curve */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Equity Curve</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 25%, 20%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(213, 16%, 50%)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(213, 16%, 50%)' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toFixed(0)}`, 'Balance']} />
                <Line type="monotone" dataKey="balance" stroke="hsl(170, 100%, 39%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Daily P&L Bar Chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Daily P&L</CardTitle></CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPnL}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 25%, 20%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(213, 16%, 50%)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(213, 16%, 50%)' }} />
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
    </div>
  );
};

export default Analytics;
