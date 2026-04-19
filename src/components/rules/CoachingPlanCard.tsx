import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Target, CheckCircle2, RefreshCw, Brain, AlertCircle } from 'lucide-react';
import { useLatestCoachingPlan, useGenerateCoachingPlan } from '@/hooks/useCoachingPlan';
import { useTradingRules } from '@/hooks/useTradingRules';
import { useRuleCategories } from '@/hooks/useRuleCategories';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function CoachingPlanCard() {
  const { data: plan, isLoading } = useLatestCoachingPlan();
  const { data: rules = [] } = useTradingRules();
  const { data: categoryRows = [] } = useRuleCategories();
  const generate = useGenerateCoachingPlan();

  const colorMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of categoryRows) m[c.name] = c.color;
    return m;
  }, [categoryRows]);

  const focusRules = useMemo(() => {
    if (!plan) return [];
    return plan.focus_rule_ids
      .map(id => rules.find(r => r.id === id))
      .filter(Boolean);
  }, [plan, rules]);

  const handleGenerate = async () => {
    try {
      await generate.mutateAsync();
      toast.success('Coaching plan generated', {
        description: 'AI analyzed your week and built a focused plan.',
      });
    } catch (e) {
      toast.error('Failed to generate', { description: (e as Error).message });
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/40 bg-card/60">
        <CardContent className="p-12 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card className="border-dashed border-border/50 bg-gradient-to-br from-primary/5 via-card to-card">
        <CardContent className="p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
            <Brain className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold mb-1">No coaching plan yet</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            Submit a few daily check-ins, then generate a personalized weekly plan based on your patterns.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
          >
            <Sparkles className="w-4 h-4" />
            {generate.isPending ? 'Analyzing…' : 'Generate first plan'}
          </Button>
          <p className="text-[10px] text-muted-foreground mt-3">Powered by OpenAI · gpt-4o-mini</p>
        </CardContent>
      </Card>
    );
  }

  const weekLabel = new Date(plan.week_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const items = Array.isArray(plan.action_items) ? plan.action_items : [];
  const metrics = plan.metrics ?? {};

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="border-border/40 bg-gradient-to-br from-primary/15 via-card to-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary/70 via-primary/40 to-transparent" />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Weekly Coaching Plan
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-1">Week of {weekLabel} · {plan.model}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generate.isPending}
              className="gap-1.5 shrink-0"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', generate.isPending && 'animate-spin')} />
              {generate.isPending ? 'Analyzing…' : 'Regenerate'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metrics strip */}
          <div className="grid grid-cols-3 gap-2">
            <MiniMetric label="Adherence" value={`${metrics.adherence_avg ?? '—'}%`} />
            <MiniMetric label="Days logged" value={String(metrics.days_logged ?? 0)} />
            <MiniMetric label="Target" value={`${metrics.weekly_target ?? 90}%`} accent="text-primary" />
          </div>

          {/* Summary */}
          {plan.summary && (
            <div className="p-3 rounded-lg bg-background/40 border border-border/20">
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{plan.summary}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Focus rules */}
      {focusRules.length > 0 && (
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              This week's focus rules
              <Badge variant="secondary" className="ml-auto bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]">
                Boosted in Memorize Mode
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {focusRules.map((r, i) => {
              const color = colorMap[r!.category || 'General'] || '#00C9A7';
              return (
                <div key={r!.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-background/40 border border-amber-500/10">
                  <span className="text-xs font-bold text-amber-400 w-5 text-center">{i + 1}</span>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }} />
                  <span className="text-xs flex-1">{r!.text}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{r!.category}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Action items */}
      {items.length > 0 && (
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Action items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-background/40 border border-border/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-400/60 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{item.title}</p>
                  {item.detail && <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{item.detail}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Top violations */}
      {Array.isArray(metrics.top_violated_rules) && metrics.top_violated_rules.length > 0 && (
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              Most violated this week
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.top_violated_rules.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground w-5 text-right tabular-nums">{r.count}×</span>
                <span className="flex-1 truncate">{r.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MiniMetric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-background/40 border border-border/20">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className={cn('text-base font-bold mt-0.5 tabular-nums', accent)}>{value}</div>
    </div>
  );
}
