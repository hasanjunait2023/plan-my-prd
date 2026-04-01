import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { mockTrades, mockDailyPnL, mockRules, mockPsychologyLogs, mockAccountSettings } from '@/data/mockData';
import { TrendingUp, TrendingDown, Target, Activity, Flame, Brain, ShieldCheck, Star, BookOpen } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const todayPnL = useMemo(() => {
    return mockTrades.filter(t => t.date === '2026-03-31').reduce((sum, t) => sum + t.pnl, 0);
  }, []);

  const weeklyPnL = useMemo(() => mockDailyPnL.reduce((sum, d) => sum + d.pnl, 0), []);
  const weeklyTarget = 1500;

  const stats = useMemo(() => {
    const wins = mockTrades.filter(t => t.outcome === 'WIN').length;
    const losses = mockTrades.filter(t => t.outcome === 'LOSS').length;
    const winRate = (wins / mockTrades.length) * 100;
    const avgWin = mockTrades.filter(t => t.outcome === 'WIN').reduce((s, t) => s + t.pnl, 0) / wins;
    const avgLoss = Math.abs(mockTrades.filter(t => t.outcome === 'LOSS').reduce((s, t) => s + t.pnl, 0) / losses);
    const profitFactor = avgWin * wins / (avgLoss * losses);
    let maxDD = 0, peak = 0, running = 0;
    mockDailyPnL.forEach(d => {
      running += d.pnl;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDD) maxDD = dd;
    });
    return { winRate, profitFactor, maxDrawdown: maxDD, avgWin, avgLoss };
  }, []);

  const equityCurve = useMemo(() => {
    let balance = mockAccountSettings.startingBalance;
    return mockDailyPnL.map(d => {
      balance += d.pnl;
      return { date: d.date.slice(5), balance };
    });
  }, []);

  const lastTrade = mockTrades[0];
  const ruleOfDay = mockRules[Math.floor(Date.now() / 86400000) % mockRules.length];
  const latestPsych = mockPsychologyLogs[0];

  // Streak calculation
  const winStreak = (() => {
    let streak = 0;
    for (const t of mockTrades) {
      if (t.outcome === 'WIN') streak++;
      else break;
    }
    return streak;
  })();

  const journalStreak = mockPsychologyLogs.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome back, Trader. Here's your overview.</p>
      </div>

      {/* Top row: P&L + Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's P&L */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Today's P&L</p>
              {todayPnL >= 0 ? <TrendingUp className="w-4 h-4 text-profit" /> : <TrendingDown className="w-4 h-4 text-loss" />}
            </div>
            <p className={`text-3xl font-bold mt-1 ${todayPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
              {todayPnL >= 0 ? '+' : ''}${todayPnL.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {mockTrades.filter(t => t.date === '2026-03-31').length} trades today
            </p>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <Target className="w-4 h-4 text-primary" />
            </div>
            <p className="text-3xl font-bold mt-1">{stats.winRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {mockTrades.filter(t => t.outcome === 'WIN').length}W / {mockTrades.filter(t => t.outcome === 'LOSS').length}L
            </p>
          </CardContent>
        </Card>

        {/* Profit Factor */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Profit Factor</p>
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <p className="text-3xl font-bold mt-1">{stats.profitFactor.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Avg W: ${stats.avgWin.toFixed(0)} / Avg L: ${stats.avgLoss.toFixed(0)}
            </p>
          </CardContent>
        </Card>

        {/* Max Drawdown */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Max Drawdown</p>
              <TrendingDown className="w-4 h-4 text-warning" />
            </div>
            <p className="text-3xl font-bold text-warning mt-1">${stats.maxDrawdown.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {((stats.maxDrawdown / mockAccountSettings.startingBalance) * 100).toFixed(1)}% of starting balance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly P&L Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Weekly P&L Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${weeklyPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
              {weeklyPnL >= 0 ? '+' : ''}${weeklyPnL.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground mb-2">Target: ${weeklyTarget}</p>
            <Progress value={Math.min((weeklyPnL / weeklyTarget) * 100, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {((weeklyPnL / weeklyTarget) * 100).toFixed(0)}% of weekly goal
            </p>
          </CardContent>
        </Card>

        {/* Mini Equity Curve */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Equity Curve</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityCurve}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(213, 16%, 50%)' }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(210, 38%, 17%)', border: 'none', borderRadius: '8px', color: 'hsl(192, 15%, 94%)' }}
                    formatter={(value: number) => [`$${value.toFixed(0)}`, 'Balance']}
                  />
                  <Line type="monotone" dataKey="balance" stroke="hsl(170, 100%, 39%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third row: Streaks + Last Trade + Rule + Psych */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Win Streak */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-warning" />
              <p className="text-sm text-muted-foreground">Win Streak</p>
            </div>
            <p className="text-2xl font-bold">{winStreak} trades</p>
          </CardContent>
        </Card>

        {/* Journal Streak */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">Journal Streak</p>
            </div>
            <p className="text-2xl font-bold">{journalStreak} days</p>
          </CardContent>
        </Card>

        {/* Rule of the Day */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">Rule of the Day</p>
            </div>
            <p className="text-sm font-medium">{ruleOfDay.text}</p>
          </CardContent>
        </Card>

        {/* Psychology State */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">Today's Mental State</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{latestPsych.overallScore}/10</p>
              <div className="flex flex-wrap gap-1">
                {latestPsych.emotions.map(e => (
                  <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Trade */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Last Trade</CardTitle>
            {lastTrade.starred && <Star className="w-4 h-4 text-warning fill-warning" />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={lastTrade.direction === 'LONG' ? 'default' : 'destructive'}>
                {lastTrade.direction}
              </Badge>
              <span className="font-semibold">{lastTrade.pair}</span>
            </div>
            <span className="text-sm text-muted-foreground">{lastTrade.strategy}</span>
            <span className="text-sm text-muted-foreground">{lastTrade.session} / {lastTrade.timeframe}</span>
            <span className={`font-bold ${lastTrade.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {lastTrade.pnl >= 0 ? '+' : ''}${lastTrade.pnl.toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground">RRR: {lastTrade.rrr}</span>
            <div className="flex gap-1">
              {lastTrade.smcTags.map(tag => (
                <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
