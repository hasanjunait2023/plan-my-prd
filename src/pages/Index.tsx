import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { mockTrades, mockDailyPnL, mockRules, mockPsychologyLogs, mockAccountSettings } from '@/data/mockData';
import { TrendingUp, TrendingDown, Target, Activity, Flame, Brain, ShieldCheck, Star, BookOpen, LayoutDashboard } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PairWithFlags } from '@/lib/pairFlags';

const glassCard = "border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]";
const tooltipStyle = { backgroundColor: 'hsl(0, 0%, 8%)', border: '1px solid hsla(0,0%,100%,0.1)', borderRadius: '8px', color: 'hsl(0, 0%, 95%)' };

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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Premium Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
          <LayoutDashboard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Welcome back, Trader. Here's your overview.</p>
        </div>
      </div>

      {/* Top row: P&L + Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${glassCard} bg-gradient-to-br from-emerald-500/10 to-transparent`}>
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

        <Card className={`${glassCard} bg-gradient-to-br from-blue-500/10 to-transparent`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <Target className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-3xl font-bold mt-1">{stats.winRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {mockTrades.filter(t => t.outcome === 'WIN').length}W / {mockTrades.filter(t => t.outcome === 'LOSS').length}L
            </p>
          </CardContent>
        </Card>

        <Card className={`${glassCard} bg-gradient-to-br from-violet-500/10 to-transparent`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Profit Factor</p>
              <Activity className="w-4 h-4 text-violet-400" />
            </div>
            <p className="text-3xl font-bold mt-1">{stats.profitFactor.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Avg W: ${stats.avgWin.toFixed(0)} / Avg L: ${stats.avgLoss.toFixed(0)}
            </p>
          </CardContent>
        </Card>

        <Card className={`${glassCard} bg-gradient-to-br from-red-500/10 to-transparent`}>
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
        <Card className={glassCard}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-primary" />
              </div>
              Weekly P&L Progress
            </CardTitle>
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

        <Card className={`${glassCard} lg:col-span-2`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                <Activity className="w-3 h-3 text-primary" />
              </div>
              Equity Curve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityCurve}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(0, 0%, 45%)' }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`$${value.toFixed(0)}`, 'Balance']} />
                  <Line type="monotone" dataKey="balance" stroke="hsl(145, 63%, 49%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${glassCard} bg-gradient-to-br from-orange-500/10 to-transparent`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-warning" />
              <p className="text-sm text-muted-foreground">Win Streak</p>
            </div>
            <p className="text-2xl font-bold">{winStreak} trades</p>
          </CardContent>
        </Card>

        <Card className={`${glassCard} bg-gradient-to-br from-blue-500/10 to-transparent`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <p className="text-sm text-muted-foreground">Journal Streak</p>
            </div>
            <p className="text-2xl font-bold">{journalStreak} days</p>
          </CardContent>
        </Card>

        <Card className={`${glassCard} bg-gradient-to-br from-emerald-500/10 to-transparent`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">Rule of the Day</p>
            </div>
            <p className="text-sm font-medium">{ruleOfDay.text}</p>
          </CardContent>
        </Card>

        <Card className={`${glassCard} bg-gradient-to-br from-violet-500/10 to-transparent`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-violet-400" />
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
      <Card className={glassCard}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                <Star className="w-3 h-3 text-primary" />
              </div>
              Last Trade
            </CardTitle>
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
