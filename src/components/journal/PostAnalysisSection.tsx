import { useState, useEffect } from 'react';
import { Trade, RuleCheck } from '@/types/trade';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTradingRules } from '@/hooks/useTradingRules';
import { useUpdateTrade } from '@/hooks/useTrades';
import { toast } from 'sonner';
import { ClipboardCheck, Save } from 'lucide-react';

interface PostAnalysisSectionProps {
  trade: Trade;
}

const PostAnalysisSection = ({ trade }: PostAnalysisSectionProps) => {
  const { data: rules = [] } = useTradingRules();
  const updateTrade = useUpdateTrade();
  const activeRules = rules.filter(r => r.active);

  const draftKey = `tradevault-postanalysis-draft-${trade.id}`;
  const [checklist, setChecklist] = useState<RuleCheck[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Try draft first, then saved trade data, then init from rules
    const draftStr = localStorage.getItem(draftKey);
    if (draftStr) {
      try {
        const parsed = JSON.parse(draftStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChecklist(parsed);
          return;
        }
      } catch {}
    }
    if (trade.ruleChecklist && trade.ruleChecklist.length > 0) {
      setChecklist(trade.ruleChecklist);
      setSaved(true);
    } else if (activeRules.length > 0) {
      setChecklist(activeRules.map(r => ({
        ruleId: r.id,
        ruleText: r.text,
        followed: true,
        explanation: '',
      })));
    }
  }, [activeRules.length, trade.ruleChecklist]);

  // Auto-save draft when checklist changes
  useEffect(() => {
    if (checklist.length > 0 && !saved) {
      localStorage.setItem(draftKey, JSON.stringify(checklist));
    }
  }, [checklist, saved, draftKey]);

  const toggleRule = (idx: number) => {
    setSaved(false);
    setChecklist(prev => prev.map((item, i) =>
      i === idx ? { ...item, followed: !item.followed, explanation: !item.followed ? '' : item.explanation } : item
    ));
  };

  const setExplanation = (idx: number, text: string) => {
    setSaved(false);
    setChecklist(prev => prev.map((item, i) =>
      i === idx ? { ...item, explanation: text } : item
    ));
  };

  const followedCount = checklist.filter(r => r.followed).length;
  const totalCount = checklist.length;
  const score = totalCount > 0 ? Math.round((followedCount / totalCount) * 100) : 0;

  const handleSave = () => {
    updateTrade.mutate(
      { id: trade.id, ruleChecklist: checklist, ruleScore: score },
      {
        onSuccess: () => {
          toast.success('Post Analysis সেভ হয়েছে!');
          setSaved(true);
        },
      }
    );
  };

  if (activeRules.length === 0 && checklist.length === 0) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="pt-5 pb-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            📋 Post Analysis
          </h3>
          <p className="text-sm text-muted-foreground italic">
            Settings এ গিয়ে Trading Rules যোগ করো — তাহলে এখানে checklist দেখাবে।
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/30">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            📋 Post Analysis — Rules Checklist
          </h3>
          <div className="flex items-center gap-2">
            <Badge
              variant={score >= 80 ? 'default' : score >= 50 ? 'secondary' : 'destructive'}
              className={score >= 80 ? 'bg-profit text-primary-foreground' : ''}
            >
              Score: {score}%
            </Badge>
            <span className="text-xs text-muted-foreground">
              {followedCount}/{totalCount} rules
            </span>
          </div>
        </div>

        {/* Score bar */}
        <div className="h-2 rounded-full bg-secondary overflow-hidden mb-5">
          <div
            className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-profit' : score >= 50 ? 'bg-warning' : 'bg-loss'}`}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Rules list */}
        <div className="space-y-3">
          {checklist.map((item, idx) => (
            <div key={item.ruleId} className="space-y-1.5">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={item.followed}
                  onCheckedChange={() => toggleRule(idx)}
                  className="mt-0.5"
                />
                <span className={`text-sm ${item.followed ? 'text-foreground' : 'text-loss line-through'}`}>
                  {item.ruleText}
                </span>
              </div>
              {!item.followed && (
                <div className="ml-7">
                  <Input
                    placeholder="কেন এই rule মানা হয়নি?"
                    value={item.explanation}
                    onChange={(e) => setExplanation(idx, e.target.value)}
                    className="text-xs h-8 border-loss/30 bg-loss/5"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Save */}
        <div className="mt-5 flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateTrade.isPending || saved}
            className="gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {saved ? 'সেভ হয়েছে ✓' : 'Save Post Analysis'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostAnalysisSection;
