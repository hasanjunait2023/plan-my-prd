import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Moon, AlertCircle, Sparkles, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTradingRules } from '@/hooks/useTradingRules';
import { useRuleCategories } from '@/hooks/useRuleCategories';
import { useTodayAdherence, useTodayTradesCount, useSubmitCheckin } from '@/hooks/useDailyAdherence';
import { toast } from 'sonner';

const MOODS = ['Calm', 'Confident', 'Anxious', 'Greedy', 'Frustrated', 'FOMO', 'Tired'];
const REASONS = ['FOMO', 'Revenge trade', 'Overconfidence', 'Distraction', 'Forgot', 'Emotion-driven', 'Market noise', 'Other'];

type Mode = 'unset' | 'all-followed' | 'partial';

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

  const [mode, setMode] = useState<Mode>('unset');
  const [violatedIds, setViolatedIds] = useState<Set<string>>(new Set());
  const [reasons, setReasons] = useState<Record<string, string>>({});
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

  const toggleViolated = (id: string) => {
    setViolatedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const violatedCount = violatedIds.size;
  const followedCount = activeRules.length - violatedCount;
  const score = activeRules.length > 0
    ? (mode === 'all-followed' ? 100 : Math.round((followedCount / activeRules.length) * 100))
    : 0;

  const grouped = useMemo(() => {
    const groups: Record<string, typeof activeRules> = {};
    for (const r of activeRules) {
      const cat = r.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(r);
    }
    return groups;
  }, [activeRules]);

  const handleSubmit = async () => {
    const followed_rule_ids = mode === 'all-followed'
      ? activeRules.map(r => r.id)
      : activeRules.filter(r => !violatedIds.has(r.id)).map(r => r.id);

    const violations = mode === 'all-followed'
      ? []
      : activeRules
          .filter(r => violatedIds.has(r.id))
          .map(r => ({
            rule_id: r.id,
            rule_text_snapshot: r.text,
            category_snapshot: r.category || 'General',
            reason: reasons[r.id] || '',
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

  // ============ STEP 1: Yes/No Question ============
  if (mode === 'unset') {
    return (
      <div className="space-y-5">
        <Card className="border-border/40 bg-gradient-to-br from-indigo-500/10 via-card to-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-indigo-500/60 via-primary/40 to-transparent" />
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              Tonight's Rule Check-in
              {existing && (
                <Badge variant="secondary" className="ml-auto bg-primary/15 text-primary border-primary/30 text-[10px]">
                  Already submitted today
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-10 text-center space-y-8">
            <div className="space-y-2">
              <p className="text-2xl font-bold leading-snug">
                আজকে কি সব rules<br />maintain করেছ? 🎯
              </p>
              <p className="text-sm text-muted-foreground">
                {activeRules.length} active rules · {tradesToday} trades today
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 max-w-md mx-auto">
              <Button
                size="lg"
                onClick={() => { setViolatedIds(new Set()); setMode('all-followed'); }}
                className="flex-1 h-14 gap-2 bg-emerald-500 hover:bg-emerald-500/90 text-white border-0 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">হ্যাঁ, সব mark করো</span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setMode('partial')}
                className="flex-1 h-14 gap-2 border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <XCircle className="w-5 h-5" />
                <span className="font-semibold">না, কিছু broke করেছি</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ STEP 2: Form (all-followed OR partial) ============
  return (
    <div className="space-y-5">
      {/* Header card */}
      <Card className="border-border/40 bg-gradient-to-br from-indigo-500/10 via-card to-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-500/60 via-primary/40 to-transparent" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 -ml-2"
              onClick={() => { setMode('unset'); setViolatedIds(new Set()); setReasons({}); }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>
            <Moon className="w-4 h-4 text-indigo-400" />
            {mode === 'all-followed' ? 'All rules maintained ✅' : 'Mark broken rules'}
            <Badge
              variant="secondary"
              className={cn(
                "ml-auto text-[10px]",
                mode === 'all-followed' && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                mode === 'partial' && "bg-rose-500/15 text-rose-400 border-rose-500/30"
              )}
            >
              {mode === 'all-followed' ? '100%' : `${violatedCount} broken / ${activeRules.length} total`}
            </Badge>
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
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Score</label>
              <div className="h-9 flex items-center px-3 rounded-md border border-border/40 bg-background/60">
                <span className={cn(
                  "text-sm font-bold",
                  score >= 90 && "text-emerald-400",
                  score >= 70 && score < 90 && "text-primary",
                  score >= 50 && score < 70 && "text-amber-400",
                  score < 50 && "text-rose-400",
                )}>
                  {followedCount}/{activeRules.length} = {score}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partial mode: rule selection list */}
      {mode === 'partial' && (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground px-1">
            👇 শুধু সেগুলোতে tap করো যেগুলো তুমি <span className="text-rose-400 font-semibold">break করেছ</span>। বাকিগুলো default-ভাবে followed হিসেবে count হবে।
          </div>
          {Object.entries(grouped).map(([cat, catRules]) => {
            const color = colorMap[cat] || '#00C9A7';
            return (
              <div key={cat} className="space-y-1.5">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }} />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{cat}</span>
                </div>
                {catRules.map((rule) => {
                  const isBroken = violatedIds.has(rule.id);
                  return (
                    <Card
                      key={rule.id}
                      onClick={() => toggleViolated(rule.id)}
                      className={cn(
                        "border-border/40 bg-card/60 overflow-hidden transition-all cursor-pointer hover:border-border/60",
                        isBroken && "ring-1 ring-rose-500/40 bg-rose-500/5 border-rose-500/30"
                      )}
                    >
                      <div className="flex items-start gap-3 p-3">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 shrink-0 transition-all",
                            isBroken ? "border-rose-500 bg-rose-500" : "border-muted-foreground/30 bg-background"
                          )}
                        >
                          {isBroken && <XCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm leading-snug", isBroken && "text-rose-300")}>{rule.text}</p>
                          {isBroken && (
                            <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={reasons[rule.id] || ''}
                                onValueChange={(v) => setReasons(prev => ({ ...prev, [rule.id]: v }))}
                              >
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
                      </div>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* All-followed mode: celebration */}
      {mode === 'all-followed' && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-emerald-300">All {activeRules.length} rules will be marked as followed</p>
            <p className="text-xs text-muted-foreground">Add a note below if you want, then submit. Perfect day!</p>
          </CardContent>
        </Card>
      )}

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
              {mode === 'all-followed'
                ? '✅ All rules followed'
                : `${violatedCount} broken, ${followedCount} followed`}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submit.isPending}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
            >
              <Sparkles className="w-4 h-4" />
              {submit.isPending ? 'Saving…' : existing ? 'Update Today' : 'Submit Check-in'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
