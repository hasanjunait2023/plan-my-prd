import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Moon, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTradingRules } from '@/hooks/useTradingRules';
import { useRuleCategories } from '@/hooks/useRuleCategories';
import { useTodayAdherence, useTodayTradesCount, useSubmitCheckin } from '@/hooks/useDailyAdherence';
import { toast } from 'sonner';

const MOODS = ['Calm', 'Confident', 'Anxious', 'Greedy', 'Frustrated', 'FOMO', 'Tired'];
const REASONS = ['FOMO', 'Revenge trade', 'Overconfidence', 'Distraction', 'Forgot', 'Emotion-driven', 'Market noise', 'Other'];

interface RowState {
  followed: boolean | null;
  reason: string;
}

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function DailyCheckinTab() {
  const { data: rules = [] } = useTradingRules();
  const { data: categoryRows = [] } = useRuleCategories();
  const { data: existing } = useTodayAdherence();
  const { data: tradesToday = 0 } = useTodayTradesCount();
  const submit = useSubmitCheckin();

  const activeRules = useMemo(() => rules.filter(r => r.active), [rules]);
  const colorMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of categoryRows) m[c.name] = c.color;
    return m;
  }, [categoryRows]);

  const [state, setState] = useState<Record<string, RowState>>({});
  const [mood, setMood] = useState<string>('Calm');
  const [tradesCount, setTradesCount] = useState<number>(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (existing) {
      setMood(existing.mood);
      setTradesCount(existing.trades_count);
      setNote(existing.general_note);
    } else {
      setTradesCount(tradesToday);
    }
  }, [existing, tradesToday]);

  const setRow = (id: string, patch: Partial<RowState>) => {
    setState(prev => ({ ...prev, [id]: { ...(prev[id] ?? { followed: null, reason: '' }), ...patch } }));
  };

  const followedCount = Object.values(state).filter(s => s.followed === true).length;
  const violatedCount = Object.values(state).filter(s => s.followed === false).length;
  const totalAnswered = followedCount + violatedCount;
  const score = totalAnswered > 0 ? Math.round((followedCount / totalAnswered) * 100) : 0;
  const allAnswered = activeRules.length > 0 && totalAnswered === activeRules.length;

  const handleSubmit = async () => {
    const followed_rule_ids = activeRules.filter(r => state[r.id]?.followed === true).map(r => r.id);
    const violations = activeRules
      .filter(r => state[r.id]?.followed === false)
      .map(r => ({
        rule_id: r.id,
        rule_text_snapshot: r.text,
        category_snapshot: r.category || 'General',
        reason: state[r.id]?.reason || '',
      }));

    try {
      await submit.mutateAsync({
        date: todayStr(),
        mood,
        trades_count: tradesCount,
        general_note: note,
        followed_rule_ids,
        violations,
      });
      toast.success(`Saved — ${score}% adherence`, {
        description: violations.length > 0
          ? `${violations.length} violation(s) logged. AI coach will use this.`
          : '🎯 Perfect day — every rule followed!',
      });
    } catch (e) {
      toast.error('Failed to save', { description: (e as Error).message });
    }
  };

  if (activeRules.length === 0) {
    return (
      <Card className="border-dashed border-border/50 bg-card/30">
        <CardContent className="p-12 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Add some active rules first to start the daily check-in.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header card */}
      <Card className="border-border/40 bg-gradient-to-br from-indigo-500/10 via-card to-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-500/60 via-primary/40 to-transparent" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-400" />
            Tonight's Rule Check-in
            {existing && (
              <Badge variant="secondary" className="ml-auto bg-primary/15 text-primary border-primary/30 text-[10px]">
                Already submitted — re-saving will update
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Mood</label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger className="h-9 bg-background/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Trades today</label>
              <input
                type="number"
                min={0}
                value={tradesCount}
                onChange={(e) => setTradesCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background/60 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Live score</label>
              <div className="h-9 flex items-center px-3 rounded-md border border-border/40 bg-background/60">
                <span className={cn(
                  "text-sm font-bold",
                  score >= 90 && "text-emerald-400",
                  score >= 70 && score < 90 && "text-primary",
                  score >= 50 && score < 70 && "text-amber-400",
                  score < 50 && totalAnswered > 0 && "text-rose-400",
                  totalAnswered === 0 && "text-muted-foreground"
                )}>
                  {totalAnswered > 0 ? `${followedCount}/${totalAnswered} = ${score}%` : '—'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules list */}
      <div className="space-y-2">
        {activeRules.map((rule) => {
          const row = state[rule.id] ?? { followed: null, reason: '' };
          const color = colorMap[rule.category || 'General'] || '#00C9A7';
          return (
            <Card
              key={rule.id}
              className={cn(
                "border-border/40 bg-card/60 overflow-hidden transition-all",
                row.followed === true && "ring-1 ring-emerald-500/30 bg-emerald-500/5",
                row.followed === false && "ring-1 ring-rose-500/30 bg-rose-500/5"
              )}
            >
              <div className="flex items-start gap-3 p-3">
                <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{rule.text}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{rule.category}</p>

                  {row.followed === false && (
                    <div className="mt-3 space-y-2">
                      <Select value={row.reason} onValueChange={(v) => setRow(rule.id, { reason: v })}>
                        <SelectTrigger className="h-8 text-xs bg-background/60">
                          <SelectValue placeholder="Why did you break this?" />
                        </SelectTrigger>
                        <SelectContent>
                          {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex gap-1.5 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant={row.followed === true ? 'default' : 'outline'}
                    onClick={() => setRow(rule.id, { followed: true, reason: '' })}
                    className={cn("h-8 px-2.5 gap-1", row.followed === true && "bg-emerald-500 hover:bg-emerald-500/90 text-white border-0")}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-xs">Followed</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={row.followed === false ? 'default' : 'outline'}
                    onClick={() => setRow(rule.id, { followed: false })}
                    className={cn("h-8 px-2.5 gap-1", row.followed === false && "bg-rose-500 hover:bg-rose-500/90 text-white border-0")}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span className="text-xs">Broke</span>
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Note + submit */}
      <Card className="border-border/40 bg-card/60">
        <CardContent className="p-4 space-y-3">
          <Textarea
            placeholder="Optional note about today's session — what went well, what you'd change, surprises..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[80px] bg-background/60 resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {totalAnswered}/{activeRules.length} answered
              {!allAnswered && <span className="text-amber-400 ml-2">· Mark every rule before submitting</span>}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || submit.isPending}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
            >
              <Sparkles className="w-4 h-4" />
              {submit.isPending ? 'Saving…' : existing ? 'Update Today' : 'Submit Daily Review'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
