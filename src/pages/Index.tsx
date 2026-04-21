import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { defaultAccountSettings } from '@/data/mockData';
import { TrendingUp, TrendingDown, Target, Activity, Flame, Brain, ShieldCheck, Star, BookOpen, LayoutDashboard, BarChart3, AlertTriangle, Crosshair, Gauge, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { PairWithFlags } from '@/lib/pairFlags';
import { SessionPanel } from '@/components/correlation/SessionPanel';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { subDays, parseISO, isAfter, format } from 'date-fns';
import { useTrades } from '@/hooks/useTrades';
import { useAccountSettings } from '@/hooks/useAccountSettings';
import { usePsychologyLogs } from '@/hooks/usePsychologyLogs';
import { useTradingRules } from '@/hooks/useTradingRules';
import { Skeleton } from '@/components/ui/skeleton';
import { DailyPnL } from '@/types/trade';
import { SectionVisibilityProvider } from '@/contexts/SectionVisibilityContext';
import { HiddenSectionsBar } from '@/components/common/HiddenSectionsBar';
import { HideableSection } from '@/components/common/HideableSection';

const glassCard = "border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]";
const tooltipStyle = { backgroundColor: 'hsl(0, 0%, 8%)', border: '1px solid hsla(0,0%,100%,0.1)', borderRadius: '8px', color: 'hsl(0, 0%, 95%)' };

type DateRange = '7d' | '30d' | 'all';

const Dashboard = () => {
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const { data: allTrades = [], isLoading: tradesLoading } = useTrades();
  const { data: accountSettings = defaultAccountSettings } = useAccountSettings();
  const { data: psychologyLogs = [], isLoading: psychLoading } = usePsychologyLogs();
  const { data: rules = [] } = useTradingRules();

  const today = format(new Date(), 'yyyy-MM-dd');
  const referenceDate = new Date();

  // Build dailyPnL from trades
  const allDailyPnL: DailyPnL[] = useMemo(() => {
    const map: Record<string, { pnl: number; trades: number }> = {};
    allTrades.forEach(t => {
      if (!map[t.date]) map[t.date] = { pnl: 0, trades: 0 };
      map[t.date].pnl += t.pnl;
      map[t.date].trades++;
    });
    return Object.entries(map)
      .map(([date, d]) => ({ date, pnl: d.pnl, trades: d.trades }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allTrades]);

  const filteredTrades = useMemo(() => {
    if (dateRange === 'all') return allTrades;
    const days = dateRange === '7d' ? 7 : 30;
    const cutoff = subDays(referenceDate, days);
    return allTrades.filter(t => isAfter(parseISO(t.date), cutoff) || parseISO(t.date).getTime() === cutoff.getTime());
  }, [dateRange, allTrades]);

  const filteredDailyPnL = useMemo(() => {
    if (dateRange === 'all') return allDailyPnL;
    const days = dateRange === '7d' ? 7 : 30;
    const cutoff = subDays(referenceDate, days);
    return allDailyPnL.filter(d => isAfter(parseISO(d.date), cutoff) || parseISO(d.date).getTime() === cutoff.getTime());
  }, [dateRange, allDailyPnL]);

  const filteredPsychLogs = useMemo(() => {
    if (dateRange === 'all') return psychologyLogs;
    const days = dateRange === '7d' ? 7 : 30;
    const cutoff = subDays(referenceDate, days);
    return psychologyLogs.filter(p => isAfter(parseISO(p.date), cutoff) || parseISO(p.date).getTime() === cutoff.getTime());
  }, [dateRange, psychologyLogs]);

  const todayPnL = useMemo(() => {
    return filteredTrades.filter(t => t.date === today).reduce((sum, t) => sum + t.pnl, 0);
  }, [filteredTrades, today]);

  const weeklyPnL = useMemo(() => filteredDailyPnL.reduce((sum, d) => sum + d.pnl, 0), [filteredDailyPnL]);
  const weeklyTarget = 1500;

  const stats = useMemo(() => {
    if (filteredTrades.length === 0) return { winRate: 0, profitFactor: 0, maxDrawdown: 0, avgWin: 0, avgLoss: 0 };
    const wins = filteredTrades.filter(t => t.outcome === 'WIN').length;
    const losses = filteredTrades.filter(t => t.outcome === 'LOSS').length;
    const winRate = (wins / filteredTrades.length) * 100;
    const avgWin = wins ? filteredTrades.filter(t => t.outcome === 'WIN').reduce((s, t) => s + t.pnl, 0) / wins : 0;
    const avgLoss = losses ? Math.abs(filteredTrades.filter(t => t.outcome === 'LOSS').reduce((s, t) => s + t.pnl, 0) / losses) : 0;
    const profitFactor = avgLoss * losses > 0 ? (avgWin * wins) / (avgLoss * losses) : 0;
    let maxDD = 0, peak = 0, running = 0;
    filteredDailyPnL.forEach(d => {
      running += d.pnl;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDD) maxDD = dd;
    });
    return { winRate, profitFactor, maxDrawdown: maxDD, avgWin, avgLoss };
  }, [filteredTrades, filteredDailyPnL]);

  const equityCurve = useMemo(() => {
    let balance = accountSettings.startingBalance;
    return filteredDailyPnL.map(d => {
      balance += d.pnl;
      return { date: d.date.slice(5), balance };
    });
  }, [filteredDailyPnL, accountSettings.startingBalance]);

  const lastTrade = filteredTrades[0];
  const ruleOfDay = rules.length > 0 ? rules[Math.floor(Date.now() / 86400000) % rules.length] : null;
  const latestPsych = filteredPsychLogs[0];

  const winStreak = (() => {
    let streak = 0;
    for (const t of filteredTrades) {
      if (t.outcome === 'WIN') streak++;
      else break;
    }
    return streak;
  })();

  const journalStreak = filteredPsychLogs.length;

  const avgRRR = useMemo(() => {
    if (filteredTrades.length === 0) return 0;
    return filteredTrades.reduce((sum, t) => sum + t.rrr, 0) / filteredTrades.length;
  }, [filteredTrades]);

  const planAdherencePercent = useMemo(() => {
    if (filteredTrades.length === 0) return 0;
    const adherent = filteredTrades.filter(t => t.planAdherence).length;
    return (adherent / filteredTrades.length) * 100;
  }, [filteredTrades]);

  const bestWorstPair = useMemo(() => {
    if (filteredTrades.length === 0) return { best: { pair: '-', pnl: 0 }, worst: { pair: '-', pnl: 0 } };
    const pairPnL: Record<string, number> = {};
    filteredTrades.forEach(t => { pairPnL[t.pair] = (pairPnL[t.pair] || 0) + t.pnl; });
    const entries = Object.entries(pairPnL);
    const best = entries.reduce((a, b) => a[1] > b[1] ? a : b);
    const worst = entries.reduce((a, b) => a[1] < b[1] ? a : b);
    return { best: { pair: best[0], pnl: best[1] }, worst: { pair: worst[0], pnl: worst[1] } };
  }, [filteredTrades]);

  const avgConfidence = useMemo(() => {
    if (filteredTrades.length === 0) return 0;
    return filteredTrades.reduce((sum, t) => sum + t.confidenceLevel, 0) / filteredTrades.length;
  }, [filteredTrades]);

  const strategyPerformance = useMemo(() => {
    const map: Record<string, { wins: number; total: number; pnl: number; rrr: number }> = {};
    filteredTrades.forEach(t => {
      if (!map[t.strategy]) map[t.strategy] = { wins: 0, total: 0, pnl: 0, rrr: 0 };
      map[t.strategy].total++;
      map[t.strategy].pnl += t.pnl;
      map[t.strategy].rrr += t.rrr;
      if (t.outcome === 'WIN') map[t.strategy].wins++;
    });
    return Object.entries(map).map(([strategy, d]) => ({
      strategy,
      winRate: (d.wins / d.total) * 100,
      pnl: d.pnl,
      trades: d.total,
      avgRRR: d.rrr / d.total,
    })).sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  const sessionPerformance = useMemo(() => {
    const sessions = ['Asian', 'London', 'New York', 'London Close'];
    return sessions.map(session => {
      const trades = filteredTrades.filter(t => t.session === session);
      const pnl = trades.reduce((sum, t) => sum + t.pnl, 0);
      return { session, pnl, trades: trades.length };
    });
  }, [filteredTrades]);

  const mistakeFrequency = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTrades.forEach(t => t.mistakes.forEach(m => { map[m] = (map[m] || 0) + 1; }));
    return Object.entries(map).map(([mistake, count]) => ({ mistake, count })).sort((a, b) => b.count - a.count);
  }, [filteredTrades]);

  const psychCorrelation = useMemo(() => {
    const high = filteredTrades.filter(t => t.psychologyState >= 7);
    const low = filteredTrades.filter(t => t.psychologyState < 7);
    const highWinRate = high.length ? (high.filter(t => t.outcome === 'WIN').length / high.length) * 100 : 0;
    const lowWinRate = low.length ? (low.filter(t => t.outcome === 'WIN').length / low.length) * 100 : 0;
    return { highWinRate, lowWinRate, highCount: high.length, lowCount: low.length };
  }, [filteredTrades]);

  const sessionBarColors = ['hsl(200, 70%, 50%)', 'hsl(145, 63%, 49%)', 'hsl(35, 90%, 55%)', 'hsl(280, 60%, 55%)'];

  if (tradesLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  // Empty state
  if (allTrades.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
            <LayoutDashboard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Welcome back, Trader.</p>
          </div>
        </div>
        <SessionPanel />
        <Card className={glassCard}>
          <CardContent className="pt-12 pb-12 flex flex-col items-center gap-4">
            <LayoutDashboard className="w-16 h-16 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold">কোনো trade নেই!</h2>
            <p className="text-muted-foreground text-sm text-center max-w-md">
              তোমার প্রথম trade entry করো — Dashboard এ সব statistics, equity curve, psychology correlation দেখা যাবে।
            </p>
            <a href="/new-trade" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Star className="w-4 h-4" /> প্রথম Trade Entry করো
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SectionVisibilityProvider pageKey="dashboard">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Premium Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
            <LayoutDashboard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Welcome back, Trader. Here's your overview.</p>
          </div>
        </div>
        <ToggleGroup type="single" value={dateRange} onValueChange={(v) => v && setDateRange(v as DateRange)} className="bg-muted/30 rounded-lg p-1 border border-border/30">
          <ToggleGroupItem value="7d" className="text-xs px-3 py-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md">
            <Calendar className="w-3 h-3 mr-1" />7 Days
          </ToggleGroupItem>
          <ToggleGroupItem value="30d" className="text-xs px-3 py-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md">
            <Calendar className="w-3 h-3 mr-1" />30 Days
          </ToggleGroupItem>
          <ToggleGroupItem value="all" className="text-xs px-3 py-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md">
            <Calendar className="w-3 h-3 mr-1" />All Time
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <SessionPanel />

      {/* Pending Trades Alert */}
      {allTrades.filter(t => t.status === 'PENDING').length > 0 && (
        <Card className={`${glassCard} bg-gradient-to-br from-warning/10 to-transparent border-warning/30`}>
          <CardContent className="pt-5 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <div>
                <p className="text-sm font-medium">{allTrades.filter(t => t.status === 'PENDING').length} টি trade pending আছে</p>
                <p className="text-xs text-muted-foreground">Trade close হলে Journal এ গিয়ে finalize করো</p>
              </div>
            </div>
            <a href="/journal" className="text-xs text-primary hover:underline font-medium">Journal →</a>
          </CardContent>
        </Card>
      )}

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
              {filteredTrades.filter(t => t.date === today).length} trades today
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
              {filteredTrades.filter(t => t.outcome === 'WIN').length}W / {filteredTrades.filter(t => t.outcome === 'LOSS').length}L
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
              {((stats.maxDrawdown / accountSettings.startingBalance) * 100).toFixed(1)}% of starting balance
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
            <p className="text-sm font-medium">{ruleOfDay?.text ?? 'কোনো rule যোগ করোনি এখনো'}</p>
          </CardContent>
        </Card>

        <Card className={`${glassCard} bg-gradient-to-br from-violet-500/10 to-transparent`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-violet-400" />
              <p className="text-sm text-muted-foreground">Today's Mental State</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{latestPsych?.overallScore ?? '-'}/10</p>
              <div className="flex flex-wrap gap-1">
                {latestPsych?.emotions.map(e => (
                  <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Trade */}
      {lastTrade && (
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
                <PairWithFlags pair={lastTrade.pair} className="font-semibold" />
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
      )}

      {/* Performance Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${glassCard} bg-gradient-to-br from-cyan-500/10 to-transparent`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Avg RRR</p>
              <Crosshair className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-3xl font-bold mt-1">{avgRRR.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {avgRRR >= 2 ? '✅ Excellent' : avgRRR >= 1.5 ? '⚠️ Good' : '❌ Needs improvement'}
            </p>
          </CardContent>
        </Card>

        <Card className={`${glassCard} bg-gradient-to-br from-emerald-500/10 to-transparent`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Plan Adherence</p>
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <p className="text-3xl font-bold mt-1">{planAdherencePercent.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredTrades.filter(t => t.planAdherence).length}/{filteredTrades.length} trades followed plan
            </p>
          </CardContent>
        </Card>

        <Card className={`${glassCard} bg-gradient-to-br from-yellow-500/10 to-transparent`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Best / Worst Pair</p>
              <BarChart3 className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-profit font-bold">{bestWorstPair.best.pair}</span>
                <span className="text-xs text-profit">+${bestWorstPair.best.pnl.toFixed(0)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-loss font-bold">{bestWorstPair.worst.pair}</span>
                <span className="text-xs text-loss">${bestWorstPair.worst.pnl.toFixed(0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassCard} bg-gradient-to-br from-pink-500/10 to-transparent`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Avg Confidence</p>
              <Gauge className="w-4 h-4 text-pink-400" />
            </div>
            <p className="text-3xl font-bold mt-1">{avgConfidence.toFixed(1)}/10</p>
            <p className="text-xs text-muted-foreground mt-1">
              {avgConfidence >= 7 ? '✅ High conviction' : '⚠️ Low conviction trades'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Performance Table */}
      {strategyPerformance.length > 0 && (
        <Card className={glassCard}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-3 h-3 text-primary" />
              </div>
              Strategy Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strategy</TableHead>
                  <TableHead className="text-center">Trades</TableHead>
                  <TableHead className="text-center">Win Rate</TableHead>
                  <TableHead className="text-center">Avg RRR</TableHead>
                  <TableHead className="text-right">Total P&L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strategyPerformance.map(s => (
                  <TableRow key={s.strategy}>
                    <TableCell className="font-medium">{s.strategy}</TableCell>
                    <TableCell className="text-center">{s.trades}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={s.winRate >= 60 ? 'default' : s.winRate >= 40 ? 'secondary' : 'destructive'}>
                        {s.winRate.toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{s.avgRRR.toFixed(2)}</TableCell>
                    <TableCell className={`text-right font-bold ${s.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Session Performance + Mistake Frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className={glassCard}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                <Activity className="w-3 h-3 text-primary" />
              </div>
              Session Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionPerformance}>
                  <XAxis dataKey="session" tick={{ fontSize: 11, fill: 'hsl(0, 0%, 55%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(0, 0%, 45%)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`$${value.toFixed(0)}`, 'P&L']} />
                  <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                    {sessionPerformance.map((_, i) => (
                      <Cell key={i} fill={sessionBarColors[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className={glassCard}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-loss/10 flex items-center justify-center">
                <AlertTriangle className="w-3 h-3 text-loss" />
              </div>
              Mistake Frequency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mistakeFrequency.length === 0 ? (
                <p className="text-sm text-muted-foreground">No mistakes recorded! 🎯</p>
              ) : (
                mistakeFrequency.map(m => (
                  <div key={m.mistake} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{m.mistake}</span>
                      <span className="text-muted-foreground">{m.count}x</span>
                    </div>
                    <Progress value={(m.count / filteredTrades.length) * 100} className="h-2" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Psychology Correlation */}
      <Card className={`${glassCard} bg-gradient-to-br from-violet-500/5 to-transparent`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center">
              <Brain className="w-3 h-3 text-violet-400" />
            </div>
            Psychology & Performance Correlation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">High Mental State (7+)</p>
              <p className="text-3xl font-bold text-profit">{psychCorrelation.highWinRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Win Rate from {psychCorrelation.highCount} trades</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Low Mental State (&lt;7)</p>
              <p className="text-3xl font-bold text-loss">{psychCorrelation.lowWinRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Win Rate from {psychCorrelation.lowCount} trades</p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/20">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Insight:</strong> {psychCorrelation.highWinRate > psychCorrelation.lowWinRate
                ? `তোমার mental state ভালো থাকলে win rate ${(psychCorrelation.highWinRate - psychCorrelation.lowWinRate).toFixed(0)}% বেশি। Psychology maintain করা critical!`
                : 'Mental state আর performance এর মধ্যে correlation track করতে আরো data দরকার।'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
