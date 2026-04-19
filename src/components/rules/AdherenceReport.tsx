import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Flame, BarChart3, Target, Sparkles } from 'lucide-react';
import { useAdherenceHistory, useViolationsHistory, type DateRange } from '@/hooks/useDailyAdherence';
import { useTradingRules } from '@/hooks/useTradingRules';
import { cn } from '@/lib/utils';

const scoreClass = (s: number) => {
  if (s >= 90) return 'bg-emerald-500';
  if (s >= 70) return 'bg-primary';
  if (s >= 50) return 'bg-amber-500';
  if (s > 0) return 'bg-rose-500';
  return 'bg-muted/30';
};

const scoreText = (s: number) => {
  if (s >= 90) return 'text-emerald-400';
  if (s >= 70) return 'text-primary';
  if (s >= 50) return 'text-amber-400';
  return 'text-rose-400';
};

interface AdherenceReportProps {
  range?: DateRange | number;
}

export function AdherenceReport({ range = 30 }: AdherenceReportProps = {}) {
  const { data: history = [] } = useAdherenceHistory(range);
  const { data: violations = [] } = useViolationsHistory(range);
  const { data: rules = [] } = useTradingRules();

  // Calculate window length in days for heatmap & label
  const windowDays = useMemo(() => {
    if (typeof range === 'number') return range;
    const from = new Date(range.from);
    const to = new Date(range.to);
    return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  }, [range]);

  const rangeEndDate = useMemo(() => {
    if (typeof range === 'number') return new Date();
    return new Date(range.to);
  }, [range]);

  const stats = useMemo(() => {
    const last7 = history.slice(0, 7);
    const last30 = history;
    const avg = (arr: typeof history) =>
      arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + Number(b.adherence_score), 0) / arr.length);
    let perfectStreak = 0;
    for (const h of history) {
      if (Number(h.adherence_score) === 100) perfectStreak++;
      else break;
    }
    return {
      last7Avg: avg(last7),
      last30Avg: avg(last30),
      perfectStreak,
      totalLogs: history.length,
    };
  }, [history]);

  // 30-day heatmap (oldest to newest)
  const heatmap = useMemo(() => {
    const days: Array<{ date: string; score: number | null }> = [];
    const today = new Date();
    const map = new Map(history.map(h => [h.date, Number(h.adherence_score)]));
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: ds, score: map.has(ds) ? map.get(ds)! : null });
    }
    return days;
  }, [history]);

  // Per-rule breakdown
  const ruleBreakdown = useMemo(() => {
    const counts = new Map<string, { rule_id: string; text: string; category: string; violations: number }>();
    for (const r of rules) {
      counts.set(r.id, { rule_id: r.id, text: r.text, category: r.category || 'General', violations: 0 });
    }
    for (const v of violations) {
      const existing = counts.get(v.rule_id);
      if (existing) existing.violations++;
      else counts.set(v.rule_id, {
        rule_id: v.rule_id,
        text: v.rule_text_snapshot || '(deleted rule)',
        category: v.category_snapshot || 'General',
        violations: 1,
      });
    }
    const totalDays = Math.max(1, history.length);
    return Array.from(counts.values())
      .map(r => ({ ...r, adherencePct: Math.round(((totalDays - r.violations) / totalDays) * 100) }))
      .sort((a, b) => b.violations - a.violations);
  }, [rules, violations, history]);

  // Pattern insights
  const patterns = useMemo(() => {
    const out: string[] = [];
    if (history.length === 0) return out;

    // Mood correlation
    const byMood = new Map<string, { violations: number; days: number }>();
    for (const h of history) {
      const m = byMood.get(h.mood) ?? { violations: 0, days: 0 };
      m.days++;
      m.violations += h.violated_count;
      byMood.set(h.mood, m);
    }
    const moodEntries = Array.from(byMood.entries())
      .filter(([, v]) => v.days >= 2)
      .map(([k, v]) => ({ mood: k, avg: v.violations / v.days }))
      .sort((a, b) => b.avg - a.avg);
    if (moodEntries.length > 0 && moodEntries[0].avg > 0.5) {
      out.push(`Violations spike when mood = "${moodEntries[0].mood}" (avg ${moodEntries[0].avg.toFixed(1)} per day)`);
    }

    // High trade days
    const highTradeDays = history.filter(h => h.trades_count >= 3);
    if (highTradeDays.length >= 2) {
      const avgViolations = highTradeDays.reduce((a, b) => a + b.violated_count, 0) / highTradeDays.length;
      if (avgViolations > 0.5) {
        out.push(`Days with 3+ trades average ${avgViolations.toFixed(1)} violations — overtrading risk`);
      }
    }

    // Day-of-week
    const byDow = new Map<number, { violations: number; days: number }>();
    for (const h of history) {
      const dow = new Date(h.date).getDay();
      const m = byDow.get(dow) ?? { violations: 0, days: 0 };
      m.days++;
      m.violations += h.violated_count;
      byDow.set(dow, m);
    }
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const worstDow = Array.from(byDow.entries())
      .filter(([, v]) => v.days >= 2)
      .map(([k, v]) => ({ day: dayNames[k], avg: v.violations / v.days }))
      .sort((a, b) => b.avg - a.avg)[0];
    if (worstDow && worstDow.avg > 0.5) {
      out.push(`${worstDow.day}s show the most violations (avg ${worstDow.avg.toFixed(1)})`);
    }

    return out;
  }, [history]);

  if (history.length === 0) {
    return (
      <Card className="border-dashed border-border/50 bg-card/30">
        <CardContent className="p-12 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Submit your first daily check-in to see reports here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Flame className="w-4 h-4 text-amber-400" />} label="Perfect streak" value={`${stats.perfectStreak}d`} />
        <StatCard icon={<TrendingUp className="w-4 h-4 text-primary" />} label="7-day avg" value={`${stats.last7Avg}%`} accent={scoreText(stats.last7Avg)} />
        <StatCard icon={<Target className="w-4 h-4 text-indigo-400" />} label="30-day avg" value={`${stats.last30Avg}%`} accent={scoreText(stats.last30Avg)} />
        <StatCard icon={<BarChart3 className="w-4 h-4 text-emerald-400" />} label="Total logs" value={String(stats.totalLogs)} />
      </div>

      {/* Heatmap */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">30-day Adherence Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-15 gap-1.5" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
            {heatmap.map((d) => (
              <div
                key={d.date}
                title={`${d.date} — ${d.score === null ? 'no log' : `${d.score}%`}`}
                className={cn(
                  'aspect-square rounded-sm transition-all hover:scale-110',
                  d.score === null ? 'bg-muted/20 border border-dashed border-border/30' : scoreClass(d.score)
                )}
                style={d.score !== null ? { opacity: 0.4 + (d.score / 100) * 0.6 } : undefined}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4 text-[10px] text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              {[20, 40, 60, 80, 100].map(s => <div key={s} className={cn('w-3 h-3 rounded-sm', scoreClass(s))} style={{ opacity: 0.4 + (s / 100) * 0.6 }} />)}
            </div>
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Per-rule breakdown */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Per-Rule Adherence (sorted by most violated)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ruleBreakdown.slice(0, 12).map((r) => {
            const Icon = r.violations === 0 ? Minus : r.violations > 3 ? TrendingDown : TrendingUp;
            return (
              <div key={r.rule_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-background/40 border border-border/20">
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{r.text}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{r.category}</p>
                </div>
                <div className="w-24">
                  <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className={cn('h-full', scoreClass(r.adherencePct))}
                      style={{ width: `${r.adherencePct}%` }}
                    />
                  </div>
                </div>
                <Badge variant="outline" className={cn('text-[10px] tabular-nums shrink-0', r.violations === 0 ? 'text-emerald-400 border-emerald-500/30' : r.violations > 3 ? 'text-rose-400 border-rose-500/30' : 'text-amber-400 border-amber-500/30')}>
                  <Icon className="w-3 h-3 mr-1" />
                  {r.violations} broken
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Pattern insights */}
      {patterns.length > 0 && (
        <Card className="border-border/40 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Pattern Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {patterns.map((p, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-background/40 border border-primary/10">
                <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                <p className="text-xs leading-relaxed">{p}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <Card className="border-border/40 bg-card/60">
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
        </div>
        <div className={cn('text-2xl font-bold mt-1 tabular-nums', accent)}>{value}</div>
      </CardContent>
    </Card>
  );
}
