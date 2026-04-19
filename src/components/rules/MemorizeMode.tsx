import { useEffect, useMemo, useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCw,
  Pause,
  Play,
  Shuffle,
  X,
} from 'lucide-react';
import { TradingRule } from '@/types/trade';
import { useRuleMemorization, useUpdateMemorization } from '@/hooks/useRuleMemorization';
import { useLogMemorizeSession } from '@/hooks/useMemorizeStreak';
import { cn } from '@/lib/utils';

interface MemorizeModeProps {
  open: boolean;
  onClose: () => void;
  rules: TradingRule[];
  colorFor: (cat: string) => string;
}

const AUTO_ADVANCE_MS = 8000;

export function MemorizeMode({ open, onClose, rules, colorFor }: MemorizeModeProps) {
  const { data: memos = [] } = useRuleMemorization();
  const updateMemo = useUpdateMemorization();
  const logSession = useLogMemorizeSession();

  // Log session once when dialog opens
  useEffect(() => {
    if (open) logSession.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [shuffle, setShuffle] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Active rules only
  const activeRules = useMemo(() => rules.filter((r) => r.active), [rules]);

  // Spaced repetition: weight by (5 - confidence) so weak rules show more
  const ordered = useMemo(() => {
    if (activeRules.length === 0) return [];
    const memoMap = new Map(memos.map((m) => [m.rule_id, m.confidence_score]));

    if (!shuffle) {
      return [...activeRules];
    }

    // Build a weighted pool
    const pool: TradingRule[] = [];
    for (const r of activeRules) {
      const conf = memoMap.get(r.id) ?? 0;
      const weight = Math.max(1, 6 - conf); // 1..6
      for (let i = 0; i < weight; i++) pool.push(r);
    }
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    // De-duplicate consecutive
    const out: TradingRule[] = [];
    for (const r of pool) {
      if (out.length === 0 || out[out.length - 1].id !== r.id) out.push(r);
    }
    return out;
  }, [activeRules, memos, shuffle, open]);

  // Reset on open
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Auto-advance
  useEffect(() => {
    if (!open || !autoPlay || ordered.length <= 1) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      setIndex((i) => (i + 1) % ordered.length);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [open, autoPlay, index, ordered.length]);

  if (ordered.length === 0) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-muted-foreground">
              No active rules to memorize. Add or activate rules first.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const current = ordered[index % ordered.length];
  const cat = current.category || 'General';
  const color = colorFor(cat);
  const memo = memos.find((m) => m.rule_id === current.id);
  const confidence = memo?.confidence_score ?? 0;

  const next = () => setIndex((i) => (i + 1) % ordered.length);
  const prev = () => setIndex((i) => (i - 1 + ordered.length) % ordered.length);

  const handleKnow = async () => {
    try {
      await updateMemo.mutateAsync({ ruleId: current.id, delta: 'know' });
    } catch {/* silent */}
    next();
  };

  const handleRepeat = async () => {
    try {
      await updateMemo.mutateAsync({ ruleId: current.id, delta: 'repeat' });
    } catch {/* silent */}
    next();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-2xl border-border/40 p-0 overflow-hidden"
        style={{ background: 'hsl(var(--card))' }}
      >
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b border-border/30"
          style={{ borderTop: `3px solid ${color}` }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <Badge variant="secondary" className="text-[11px]">
              {cat}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {(index % ordered.length) + 1} / {ordered.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title={shuffle ? 'Shuffle on' : 'Sequential'}
              onClick={() => setShuffle((s) => !s)}
            >
              <Shuffle
                className={cn('w-3.5 h-3.5', shuffle ? 'text-primary' : 'text-muted-foreground')}
              />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title={autoPlay ? 'Pause' : 'Auto-play'}
              onClick={() => setAutoPlay((p) => !p)}
            >
              {autoPlay ? (
                <Pause className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Play className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Card body */}
        <div className="px-8 py-12 min-h-[280px] flex flex-col items-center justify-center text-center">
          <p className="text-xl sm:text-2xl font-medium leading-relaxed text-foreground max-w-xl">
            "{current.text}"
          </p>

          {/* Confidence dots */}
          <div className="flex items-center gap-1.5 mt-6">
            <span className="text-[11px] text-muted-foreground mr-1">Confidence</span>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  i < confidence ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div className="px-5 pb-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={handleRepeat}
              className="border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Repeat
            </Button>
            <Button
              size="lg"
              onClick={handleKnow}
              className="bg-emerald-500/90 text-white hover:bg-emerald-500"
            >
              <Check className="w-4 h-4 mr-2" />
              I know this
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <Button size="sm" variant="ghost" onClick={prev}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <Progress
              value={((index % ordered.length) + 1) * (100 / ordered.length)}
              className="flex-1 mx-3 h-1.5"
            />
            <Button size="sm" variant="ghost" onClick={next}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
