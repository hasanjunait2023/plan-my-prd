import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Shield, Plus, Trash2, TrendingUp, AlertTriangle, CheckCircle2, Target, BarChart3, Clock, AlertCircle, Crosshair, Save } from 'lucide-react';
import { useTradingRules, useInsertRule, useDeleteRule, useToggleRule } from '@/hooks/useTradingRules';
import { useTrades } from '@/hooks/useTrades';
import { useAccountSettings, useSaveAccountSettings } from '@/hooks/useAccountSettings';
import { RuleCheck, Session } from '@/types/trade';
import { defaultAccountSettings } from '@/data/mockData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from 'recharts';
import { format } from 'date-fns';

const glassCard = "border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]";
const allSessions: Session[] = ['Asian', 'London', 'New York', 'London Close'];

const TradingRules = () => {
  const { data: rules = [] } = useTradingRules();
  const insertRule = useInsertRule();
  const deleteRule = useDeleteRule();
  const toggleRule = useToggleRule();
  const { data: trades = [] } = useTrades();
  const { data: accountSettings } = useAccountSettings();
  const saveSettings = useSaveAccountSettings();
  const [newRule, setNewRule] = useState('');

  const settings = accountSettings || defaultAccountSettings;

  // Editable parameter states
  const [editingSessions, setEditingSessions] = useState<string[] | null>(null);
  const [editingRisk, setEditingRisk] = useState<Record<string, string> | null>(null);
  const [editingLimits, setEditingLimits] = useState<Record<string, string> | null>(null);
  const [editingConditions, setEditingConditions] = useState<Record<string, string> | null>(null);

  const currentSessions = editingSessions || settings.allowedSessions;
  const currentRisk = editingRisk || {
    maxRiskPercent: String(settings.maxRiskPercent),
    dailyLossLimit: String(settings.dailyLossLimit),
    maxLotSize: String(settings.maxLotSize),
    maxDrawdownPercent: String(settings.maxDrawdownPercent),
  };
  const currentLimits = editingLimits || {
    maxTradesPerDay: String(settings.maxTradesPerDay),
    maxWinningTrades: String(settings.maxWinningTrades),
    maxLosingTrades: String(settings.maxLosingTrades),
  };
  const currentConditions = editingConditions || {
    minConfidence: String(settings.minConfidence),
    minRrr: String(settings.minRrr),
    minSmcTags: String(settings.minSmcTags),
  };

  const closedTrades = useMemo(() => trades.filter(t => t.status === 'CLOSED'), [trades]);

  // Today's trade counts
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayTrades = useMemo(() => closedTrades.filter(t => t.date === todayStr), [closedTrades, todayStr]);
  const todayWins = todayTrades.filter(t => t.outcome === 'WIN').length;
  const todayLosses = todayTrades.filter(t => t.outcome === 'LOSS').length;
  const todayTotal = todayTrades.length;

  // Summary stats
  const stats = useMemo(() => {
    const totalRules = rules.length;
    const activeRules = rules.filter(r => r.active).length;
    const scores = closedTrades.filter(t => t.ruleScore > 0).map(t => t.ruleScore);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    let maxStreak = 0, currentStreak = 0;
    const sorted = [...closedTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const t of sorted) {
      if (t.ruleScore === 100) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
      else { currentStreak = 0; }
    }
    return { totalRules, activeRules, avgScore, maxStreak };
  }, [rules, closedTrades]);

  // Per-rule adherence data
  const ruleAdherenceData = useMemo(() => {
    const ruleMap = new Map<string, { text: string; followed: number; total: number; violations: string[] }>();
    for (const trade of closedTrades) {
      const checklist = trade.ruleChecklist as RuleCheck[];
      if (!Array.isArray(checklist)) continue;
      for (const rc of checklist) {
        const existing = ruleMap.get(rc.ruleId) || { text: rc.ruleText, followed: 0, total: 0, violations: [] };
        existing.total++;
        if (rc.followed) existing.followed++;
        else if (rc.explanation) existing.violations.push(rc.explanation);
        ruleMap.set(rc.ruleId, existing);
      }
    }
    return Array.from(ruleMap.entries()).map(([id, data]) => ({
      id, name: data.text.length > 30 ? data.text.slice(0, 30) + '…' : data.text,
      fullText: data.text,
      adherence: data.total > 0 ? Math.round((data.followed / data.total) * 100) : 0,
      total: data.total, followed: data.followed, violated: data.total - data.followed,
      violations: data.violations,
    })).sort((a, b) => a.adherence - b.adherence);
  }, [closedTrades]);

  const scoreTrend = useMemo(() => {
    return [...closedTrades].filter(t => t.ruleScore > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((t, i) => ({ trade: `#${i + 1}`, date: t.date, score: t.ruleScore, pair: t.pair }));
  }, [closedTrades]);

  const mostViolated = useMemo(() => {
    return ruleAdherenceData.filter(r => r.violated > 0).sort((a, b) => b.violated - a.violated).slice(0, 5);
  }, [ruleAdherenceData]);

  const handleAddRule = async () => {
    if (!newRule.trim()) return;
    try { await insertRule.mutateAsync(newRule.trim()); setNewRule(''); }
    catch { toast.error('Failed to add rule'); }
  };

  const toggleSession = (s: string) => {
    const curr = editingSessions || [...settings.allowedSessions];
    setEditingSessions(curr.includes(s) ? curr.filter(x => x !== s) : [...curr, s]);
  };

  const saveSection = async (section: 'sessions' | 'risk' | 'limits' | 'conditions') => {
    try {
      const updated = { ...settings };
      if (section === 'sessions') {
        updated.allowedSessions = editingSessions || settings.allowedSessions;
      } else if (section === 'risk') {
        const r = currentRisk;
        updated.maxRiskPercent = parseFloat(r.maxRiskPercent) || settings.maxRiskPercent;
        updated.dailyLossLimit = parseFloat(r.dailyLossLimit) || settings.dailyLossLimit;
        updated.maxLotSize = parseFloat(r.maxLotSize) || settings.maxLotSize;
        updated.maxDrawdownPercent = parseFloat(r.maxDrawdownPercent) || settings.maxDrawdownPercent;
      } else if (section === 'limits') {
        const l = currentLimits;
        updated.maxTradesPerDay = parseInt(l.maxTradesPerDay) || settings.maxTradesPerDay;
        updated.maxWinningTrades = parseInt(l.maxWinningTrades) || settings.maxWinningTrades;
        updated.maxLosingTrades = parseInt(l.maxLosingTrades) || settings.maxLosingTrades;
      } else if (section === 'conditions') {
        const c = currentConditions;
        updated.minConfidence = parseInt(c.minConfidence) || settings.minConfidence;
        updated.minRrr = parseFloat(c.minRrr) || settings.minRrr;
        updated.minSmcTags = parseInt(c.minSmcTags) || settings.minSmcTags;
      }
      await saveSettings.mutateAsync(updated);
      if (section === 'sessions') setEditingSessions(null);
      else if (section === 'risk') setEditingRisk(null);
      else if (section === 'limits') setEditingLimits(null);
      else if (section === 'conditions') setEditingConditions(null);
      toast.success('Saved!');
    } catch { toast.error('Failed to save'); }
  };

  const sessionTimes: Record<string, string> = {
    Asian: '00:00–09:00 UTC',
    London: '07:00–16:00 UTC',
    'New York': '13:00–22:00 UTC',
    'London Close': '15:00–17:00 UTC',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trading Rules</h1>
          <p className="text-sm text-muted-foreground">Your trading commandments, limits & adherence analytics</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={glassCard}>
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{stats.totalRules}</p>
            <p className="text-xs text-muted-foreground">Total Rules</p>
          </CardContent>
        </Card>
        <Card className={glassCard}>
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold">{stats.activeRules}</p>
            <p className="text-xs text-muted-foreground">Active Rules</p>
          </CardContent>
        </Card>
        <Card className={glassCard}>
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold">{stats.avgScore}%</p>
            <p className="text-xs text-muted-foreground">Avg Rule Score</p>
          </CardContent>
        </Card>
        <Card className={glassCard}>
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
              <Target className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold">{stats.maxStreak}</p>
            <p className="text-xs text-muted-foreground">Best 100% Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Allowed Trading Sessions ═══ */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Clock className="w-3 h-3 text-blue-400" />
            </div>
            Allowed Trading Sessions
          </CardTitle>
          <CardDescription>Toggle which sessions you're allowed to trade in</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {allSessions.map(s => {
              const active = currentSessions.includes(s);
              return (
                <button key={s} onClick={() => toggleSession(s)}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    active
                      ? 'border-primary/50 bg-primary/10 shadow-[0_0_15px_hsla(var(--primary)/0.15)]'
                      : 'border-border/30 bg-muted/20 opacity-50'
                  }`}>
                  <p className="text-sm font-semibold">{s}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{sessionTimes[s]}</p>
                  <Badge variant={active ? 'default' : 'outline'} className="mt-2 text-[10px]">
                    {active ? 'Active' : 'Disabled'}
                  </Badge>
                </button>
              );
            })}
          </div>
          {editingSessions && (
            <Button size="sm" onClick={() => saveSection('sessions')} disabled={saveSettings.isPending}>
              <Save className="w-3 h-3 mr-1" /> Save Sessions
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ═══ Risk Parameters ═══ */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-3 h-3 text-red-400" />
            </div>
            Risk Parameters
          </CardTitle>
          <CardDescription>Define your maximum risk exposure limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'maxRiskPercent', label: 'Max Risk/Trade', suffix: '%' },
              { key: 'dailyLossLimit', label: 'Max Daily Loss', prefix: '$' },
              { key: 'maxLotSize', label: 'Max Lot Size', suffix: ' lots' },
              { key: 'maxDrawdownPercent', label: 'Max Drawdown', suffix: '%' },
            ].map(({ key, label, suffix, prefix }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{label}</label>
                <div className="relative">
                  {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
                  <Input
                    type="number"
                    step="0.01"
                    value={currentRisk[key]}
                    className={`${prefix ? 'pl-6' : ''} h-9 text-sm`}
                    onChange={e => setEditingRisk({ ...currentRisk, [key]: e.target.value })}
                  />
                  {suffix && !prefix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
                </div>
              </div>
            ))}
          </div>
          {editingRisk && (
            <Button size="sm" className="mt-4" onClick={() => saveSection('risk')} disabled={saveSettings.isPending}>
              <Save className="w-3 h-3 mr-1" /> Save Risk Parameters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ═══ Daily Trade Limits ═══ */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
              <BarChart3 className="w-3 h-3 text-amber-400" />
            </div>
            Daily Trade Limits
          </CardTitle>
          <CardDescription>Set and track your daily trading limits — today's progress shown below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: 'maxTradesPerDay', label: 'Max Total Trades', current: todayTotal, color: 'primary' },
              { key: 'maxWinningTrades', label: 'Max Winning Trades', current: todayWins, color: 'emerald' },
              { key: 'maxLosingTrades', label: 'Max Losing Trades', current: todayLosses, color: 'red' },
            ].map(({ key, label, current, color }) => {
              const limit = parseInt(currentLimits[key]) || 0;
              const pct = limit > 0 ? Math.min(100, (current / limit) * 100) : 0;
              const exceeded = current >= limit && limit > 0;
              return (
                <div key={key} className="space-y-2.5 p-3 rounded-lg border border-border/20 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">{label}</label>
                    <Input
                      type="number"
                      value={currentLimits[key]}
                      className="w-16 h-7 text-xs text-center"
                      onChange={e => setEditingLimits({ ...currentLimits, [key]: e.target.value })}
                    />
                  </div>
                  <Progress value={pct} className={`h-2 ${exceeded ? '[&>div]:bg-destructive' : ''}`} />
                  <div className="flex justify-between text-[10px]">
                    <span className={exceeded ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                      Today: {current}
                    </span>
                    <span className="text-muted-foreground">Limit: {limit}</span>
                  </div>
                  {exceeded && (
                    <p className="text-[10px] text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Limit reached!
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {editingLimits && (
            <Button size="sm" onClick={() => saveSection('limits')} disabled={saveSettings.isPending}>
              <Save className="w-3 h-3 mr-1" /> Save Limits
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ═══ Trade Entry Conditions ═══ */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Crosshair className="w-3 h-3 text-emerald-400" />
            </div>
            Trade Entry Conditions
          </CardTitle>
          <CardDescription>Minimum requirements that must be met before taking any trade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: 'minConfidence', label: 'Min Confidence Level', hint: '1–10 scale', icon: '🎯' },
              { key: 'minRrr', label: 'Min Risk:Reward', hint: 'e.g. 1.5', icon: '📊' },
              { key: 'minSmcTags', label: 'Min SMC Tags', hint: 'Confluence count', icon: '🏷️' },
            ].map(({ key, label, hint, icon }) => (
              <div key={key} className="p-3 rounded-lg border border-border/20 bg-muted/10 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{icon}</span>
                  <div>
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{hint}</p>
                  </div>
                </div>
                <Input
                  type="number"
                  step={key === 'minRrr' ? '0.1' : '1'}
                  value={currentConditions[key]}
                  className="h-9 text-sm"
                  onChange={e => setEditingConditions({ ...currentConditions, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          {editingConditions && (
            <Button size="sm" className="mt-4" onClick={() => saveSection('conditions')} disabled={saveSettings.isPending}>
              <Save className="w-3 h-3 mr-1" /> Save Conditions
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Rules Management */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Shield className="w-3 h-3 text-emerald-400" />
            </div>
            Rules I Never Break
          </CardTitle>
          <CardDescription>Add, toggle, or remove your trading commandments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No rules yet — add your first trading commandment below</p>
          )}
          {rules.map(rule => (
            <div key={rule.id} className="flex items-center gap-3 group">
              <Switch checked={rule.active} onCheckedChange={() => toggleRule.mutate({ id: rule.id, active: !rule.active })} />
              <span className={`flex-1 text-sm ${!rule.active ? 'text-muted-foreground line-through' : ''}`}>{rule.text}</span>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteRule.mutate(rule.id)}>
                <Trash2 className="w-3 h-3 text-loss" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input placeholder="Add a new rule..." value={newRule} onChange={e => setNewRule(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddRule()} />
            <Button variant="outline" onClick={handleAddRule} disabled={insertRule.isPending}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Per-Rule Adherence Chart */}
      {ruleAdherenceData.length > 0 && (
        <Card className={glassCard}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="w-3 h-3 text-blue-400" />
              </div>
              Rule Adherence
            </CardTitle>
            <CardDescription>How well you followed each rule across all trades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ruleAdherenceData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number, _name: string, entry: any) => [
                      `${value}% (${entry.payload.followed}/${entry.payload.total} trades)`, 'Adherence'
                    ]}
                  />
                  <Bar dataKey="adherence" radius={[0, 4, 4, 0]}>
                    {ruleAdherenceData.map((entry, i) => (
                      <Cell key={i} fill={entry.adherence >= 80 ? 'hsl(var(--primary))' : entry.adherence >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--loss))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rule Score Trend */}
      {scoreTrend.length > 0 && (
        <Card className={glassCard}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-primary" />
              </div>
              Rule Score Trend
            </CardTitle>
            <CardDescription>Your rule compliance score over time — track your improvement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreTrend} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="trade" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number, _name: string, entry: any) => [`${value}% — ${entry.payload.pair}`, 'Rule Score']}
                    labelFormatter={(label) => `Trade ${label}`}
                  />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Most Violated Rules */}
      {mostViolated.length > 0 && (
        <Card className={glassCard}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-3 h-3 text-red-400" />
              </div>
              Most Violated Rules
            </CardTitle>
            <CardDescription>Rules you break most often — focus on improving these</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mostViolated.map((rule, i) => (
              <div key={rule.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] border-loss/30 text-loss bg-loss/5">#{i + 1}</Badge>
                    <span className="text-sm font-medium">{rule.fullText}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-loss font-medium">{rule.violated} violations</span>
                    <span className="text-xs text-muted-foreground">/ {rule.total} trades</span>
                  </div>
                </div>
                {rule.violations.length > 0 && (
                  <div className="ml-8 space-y-1">
                    {rule.violations.slice(0, 3).map((v, vi) => (
                      <p key={vi} className="text-xs text-muted-foreground italic">"{v}"</p>
                    ))}
                    {rule.violations.length > 3 && <p className="text-[10px] text-muted-foreground">+{rule.violations.length - 3} more</p>}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {closedTrades.length === 0 && (
        <Card className={glassCard}>
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Complete some trades with Post Analysis to see rule adherence analytics here</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TradingRules;
