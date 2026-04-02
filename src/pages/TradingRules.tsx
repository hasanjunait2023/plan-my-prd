import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Plus, Trash2, TrendingUp, AlertTriangle, CheckCircle2, Target, BarChart3 } from 'lucide-react';
import { useTradingRules, useInsertRule, useDeleteRule, useToggleRule } from '@/hooks/useTradingRules';
import { useTrades } from '@/hooks/useTrades';
import { RuleCheck } from '@/types/trade';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from 'recharts';

const glassCard = "border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]";

const TradingRules = () => {
  const { data: rules = [] } = useTradingRules();
  const insertRule = useInsertRule();
  const deleteRule = useDeleteRule();
  const toggleRule = useToggleRule();
  const { data: trades = [] } = useTrades();
  const [newRule, setNewRule] = useState('');

  const closedTrades = useMemo(() => trades.filter(t => t.status === 'CLOSED'), [trades]);

  // Summary stats
  const stats = useMemo(() => {
    const totalRules = rules.length;
    const activeRules = rules.filter(r => r.active).length;
    const scores = closedTrades.filter(t => t.ruleScore > 0).map(t => t.ruleScore);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // Longest streak of 100% score
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
      id,
      name: data.text.length > 30 ? data.text.slice(0, 30) + '…' : data.text,
      fullText: data.text,
      adherence: data.total > 0 ? Math.round((data.followed / data.total) * 100) : 0,
      total: data.total,
      followed: data.followed,
      violated: data.total - data.followed,
      violations: data.violations,
    })).sort((a, b) => a.adherence - b.adherence);
  }, [closedTrades]);

  // Score trend over time
  const scoreTrend = useMemo(() => {
    return [...closedTrades]
      .filter(t => t.ruleScore > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((t, i) => ({
        trade: `#${i + 1}`,
        date: t.date,
        score: t.ruleScore,
        pair: t.pair,
      }));
  }, [closedTrades]);

  // Most violated rules
  const mostViolated = useMemo(() => {
    return ruleAdherenceData.filter(r => r.violated > 0).sort((a, b) => b.violated - a.violated).slice(0, 5);
  }, [ruleAdherenceData]);

  const handleAddRule = async () => {
    if (!newRule.trim()) return;
    try {
      await insertRule.mutateAsync(newRule.trim());
      setNewRule('');
    } catch {
      toast.error('Failed to add rule');
    }
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
          <p className="text-sm text-muted-foreground">Your trading commandments & adherence analytics</p>
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
                      `${value}% (${entry.payload.followed}/${entry.payload.total} trades)`,
                      'Adherence'
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
                    formatter={(value: number, _name: string, entry: any) => [
                      `${value}% — ${entry.payload.pair}`,
                      'Rule Score'
                    ]}
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
                    <Badge variant="outline" className="text-[10px] border-loss/30 text-loss bg-loss/5">
                      #{i + 1}
                    </Badge>
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
                    {rule.violations.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">+{rule.violations.length - 3} more</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state for analytics */}
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
