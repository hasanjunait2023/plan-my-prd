import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Repeat, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TradingRule } from '@/types/trade';
import { useRuleMemorization, RuleMemorization } from '@/hooks/useRuleMemorization';

interface ConfidenceOverviewProps {
  rules: TradingRule[];
  colorFor: (cat: string) => string;
}

const formatRelative = (iso: string | null) => {
  if (!iso) return 'Never';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
};

const ConfidenceDots = ({ score }: { score: number }) => (
  <div className="flex items-center gap-1">
    {[0, 1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className={cn(
          'w-2 h-2 rounded-full transition-all',
          i < score
            ? 'bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.6)]'
            : 'bg-muted-foreground/20'
        )}
      />
    ))}
  </div>
);

const confidenceLabel = (s: number) => {
  if (s >= 5) return { text: 'Mastered', tone: 'text-primary' };
  if (s >= 3) return { text: 'Strong', tone: 'text-foreground' };
  if (s >= 1) return { text: 'Learning', tone: 'text-muted-foreground' };
  return { text: 'New', tone: 'text-muted-foreground/70' };
};

export const ConfidenceOverview = ({ rules, colorFor }: ConfidenceOverviewProps) => {
  const { data: memos = [], isLoading } = useRuleMemorization();

  const memoMap = useMemo(() => {
    const m = new Map<string, RuleMemorization>();
    for (const x of memos) m.set(x.rule_id, x);
    return m;
  }, [memos]);

  const enriched = useMemo(() => {
    return rules.map((r) => {
      const m = memoMap.get(r.id);
      return {
        ...r,
        confidence: m?.confidence_score ?? 0,
        repeats: m?.repeat_count ?? 0,
        lastShown: m?.last_shown_at ?? null,
      };
    });
  }, [rules, memoMap]);

  // Stats
  const stats = useMemo(() => {
    const total = enriched.length;
    const mastered = enriched.filter((e) => e.confidence >= 5).length;
    const learning = enriched.filter((e) => e.confidence >= 1 && e.confidence < 5).length;
    const newRules = enriched.filter((e) => e.confidence === 0).length;
    const totalReps = enriched.reduce((s, e) => s + e.repeats, 0);
    const avgConf = total > 0 ? enriched.reduce((s, e) => s + e.confidence, 0) / total : 0;
    return { total, mastered, learning, new: newRules, totalReps, avgConf };
  }, [enriched]);

  // Sort: lowest confidence first, then by least recently shown
  const sorted = useMemo(() => {
    return [...enriched].sort((a, b) => {
      if (a.confidence !== b.confidence) return a.confidence - b.confidence;
      const aT = a.lastShown ? new Date(a.lastShown).getTime() : 0;
      const bT = b.lastShown ? new Date(b.lastShown).getTime() : 0;
      return aT - bT;
    });
  }, [enriched]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <Card className="border-dashed border-border/50 bg-card/30">
        <CardContent className="p-12 text-center">
          <Brain className="w-10 h-10 text-primary/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Add rules first to track your memorization progress.
          </p>
        </CardContent>
      </Card>
    );
  }

  const masteredPct = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground/80 text-[10px] uppercase tracking-wider font-medium">
              <Sparkles className="w-3 h-3" /> Mastered
            </div>
            <div className="text-2xl font-bold text-primary mt-1">
              {stats.mastered}
              <span className="text-sm font-normal text-muted-foreground ml-1">/ {stats.total}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                style={{ width: `${masteredPct}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground/80 text-[10px] uppercase tracking-wider font-medium">
              <TrendingUp className="w-3 h-3" /> Avg confidence
            </div>
            <div className="text-2xl font-bold mt-1">
              {stats.avgConf.toFixed(1)}
              <span className="text-sm font-normal text-muted-foreground ml-1">/ 5</span>
            </div>
            <div className="mt-2.5">
              <ConfidenceDots score={Math.round(stats.avgConf)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground/80 text-[10px] uppercase tracking-wider font-medium">
              <Repeat className="w-3 h-3" /> Total reviews
            </div>
            <div className="text-2xl font-bold mt-1">{stats.totalReps}</div>
            <div className="text-xs text-muted-foreground mt-2">across all rules</div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground/80 text-[10px] uppercase tracking-wider font-medium">
              <Brain className="w-3 h-3" /> Learning
            </div>
            <div className="text-2xl font-bold mt-1">{stats.learning}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {stats.new} new
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-rule list */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              Per-rule progress
            </h3>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Sorted: weakest first
            </span>
          </div>
          <div className="divide-y divide-border/20">
            {sorted.map((r) => {
              const color = colorFor(r.category || 'General');
              const lbl = confidenceLabel(r.confidence);
              return (
                <div
                  key={r.id}
                  className={cn(
                    'group flex items-center gap-3 px-4 py-3 hover:bg-background/50 transition-colors',
                    !r.active && 'opacity-50'
                  )}
                >
                  {/* Category dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-background"
                    style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }}
                    title={r.category}
                  />

                  {/* Rule text */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm leading-snug truncate',
                        !r.active && 'line-through text-muted-foreground'
                      )}
                    >
                      {r.text}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Repeat className="w-3 h-3" /> {r.repeats}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatRelative(r.lastShown)}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[9px] h-4 px-1.5 font-normal bg-background/50"
                      >
                        {r.category || 'General'}
                      </Badge>
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <ConfidenceDots score={r.confidence} />
                    <span className={cn('text-[10px] font-medium uppercase tracking-wider', lbl.tone)}>
                      {lbl.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
