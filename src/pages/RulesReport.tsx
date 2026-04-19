import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, Download } from 'lucide-react';
import { toast } from 'sonner';
import { AdherenceReport } from '@/components/rules/AdherenceReport';
import { CoachingPlanCard } from '@/components/rules/CoachingPlanCard';
import { DateRangeSelector, type RangePreset } from '@/components/rules/DateRangeSelector';
import { useAdherenceHistory, useViolationsHistory, type DateRange } from '@/hooks/useDailyAdherence';
import { useTradingRules } from '@/hooks/useTradingRules';
import { exportAdherencePdf } from '@/lib/exportAdherencePdf';

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const initialRange = (): DateRange => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: fmt(from), to: fmt(to) };
};

const RulesReport = () => {
  const [preset, setPreset] = useState<RangePreset>('30d');
  const [range, setRange] = useState<DateRange>(initialRange);

  const { data: history = [] } = useAdherenceHistory(range);
  const { data: violations = [] } = useViolationsHistory(range);
  const { data: rules = [] } = useTradingRules();

  const windowDays = useMemo(() => {
    const from = new Date(range.from);
    const to = new Date(range.to);
    return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  }, [range]);

  const exportData = useMemo(() => {
    const recentSlice = history.slice(0, Math.min(7, history.length));
    const avg = (arr: typeof history) =>
      arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + Number(b.adherence_score), 0) / arr.length);
    let perfectStreak = 0;
    for (const h of history) {
      if (Number(h.adherence_score) === 100) perfectStreak++;
      else break;
    }
    const stats = {
      last7Avg: avg(recentSlice),
      last30Avg: avg(history),
      perfectStreak,
      totalLogs: history.length,
    };

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
    const ruleBreakdown = Array.from(counts.values())
      .map(r => ({ ...r, adherencePct: Math.round(((totalDays - r.violations) / totalDays) * 100) }))
      .sort((a, b) => b.violations - a.violations);

    const patterns: string[] = [];
    if (history.length > 0) {
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
        patterns.push(`Violations spike when mood = "${moodEntries[0].mood}" (avg ${moodEntries[0].avg.toFixed(1)} per day)`);
      }
      const highTradeDays = history.filter(h => h.trades_count >= 3);
      if (highTradeDays.length >= 2) {
        const avgV = highTradeDays.reduce((a, b) => a + b.violated_count, 0) / highTradeDays.length;
        if (avgV > 0.5) patterns.push(`Days with 3+ trades average ${avgV.toFixed(1)} violations — overtrading risk`);
      }
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const byDow = new Map<number, { violations: number; days: number }>();
      for (const h of history) {
        const dow = new Date(h.date).getDay();
        const m = byDow.get(dow) ?? { violations: 0, days: 0 };
        m.days++;
        m.violations += h.violated_count;
        byDow.set(dow, m);
      }
      const worstDow = Array.from(byDow.entries())
        .filter(([, v]) => v.days >= 2)
        .map(([k, v]) => ({ day: dayNames[k], avg: v.violations / v.days }))
        .sort((a, b) => b.avg - a.avg)[0];
      if (worstDow && worstDow.avg > 0.5) {
        patterns.push(`${worstDow.day}s show the most violations (avg ${worstDow.avg.toFixed(1)})`);
      }
    }

    return { stats, ruleBreakdown, patterns };
  }, [history, violations, rules]);

  const handleExport = () => {
    if (history.length === 0) {
      toast.error('No data to export in this range');
      return;
    }
    try {
      exportAdherencePdf({
        history: history.map(h => ({
          date: h.date,
          adherence_score: Number(h.adherence_score),
          followed_count: h.followed_count,
          violated_count: h.violated_count,
          total_rules: h.total_rules,
          trades_count: h.trades_count,
          mood: h.mood,
          general_note: h.general_note,
        })),
        ruleBreakdown: exportData.ruleBreakdown,
        patterns: exportData.patterns,
        stats: exportData.stats,
        rangeLabel: `${range.from} → ${range.to} (${windowDays}d)`,
      });
      toast.success('Report downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to export PDF');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8 shadow-lg">
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg ring-1 ring-primary/40">
                <BarChart3 className="w-7 h-7 text-primary-foreground" strokeWidth={2.2} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                Adherence Report
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Deep dive into your discipline patterns & coaching insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleExport}
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/rules">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
            </Button>
          </div>
        </div>

        {/* Date range selector */}
        <div className="relative mt-5 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground">
            Showing <span className="text-foreground font-medium">{windowDays} days</span> · {range.from} → {range.to}
          </p>
          <DateRangeSelector
            preset={preset}
            range={range}
            onChange={(p, r) => {
              setPreset(p);
              setRange(r);
            }}
          />
        </div>
      </div>

      {/* Full report */}
      <AdherenceReport range={range} />

      {/* Coaching plan below */}
      <CoachingPlanCard />
    </div>
  );
};

export default RulesReport;
