import { useState } from 'react';
import { Trade } from '@/types/trade';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useUpdateTrade } from '@/hooks/useTrades';
import { toast } from 'sonner';
import { ChevronDown, BookOpen, Save } from 'lucide-react';
import { format } from 'date-fns';

interface RevisionSectionProps {
  trade: Trade;
}

const RevisionSection = ({ trade }: RevisionSectionProps) => {
  const updateTrade = useUpdateTrade();
  const hasRevision = !!trade.revisedAt;

  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(trade.revisionNotes || '');
  const [takeaway, setTakeaway] = useState(trade.revisionTakeaway || '');
  const [wouldTakeAgain, setWouldTakeAgain] = useState<boolean>(trade.revisionWouldTakeAgain ?? true);
  const [rating, setRating] = useState<number>(trade.revisionRating ?? 5);

  const handleSave = () => {
    updateTrade.mutate(
      {
        id: trade.id,
        revisionNotes: notes,
        revisionTakeaway: takeaway,
        revisionWouldTakeAgain: wouldTakeAgain,
        revisionRating: rating,
        revisedAt: new Date().toISOString(),
      },
      {
        onSuccess: () => toast.success('Revision সেভ হয়েছে!'),
      }
    );
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-border/50">
        <CollapsibleTrigger className="w-full">
          <CardContent className="pt-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">📝 Revision</span>
              {hasRevision ? (
                <Badge variant="secondary" className="text-[10px]">
                  Done — {format(new Date(trade.revisedAt!), 'MMM d')}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Pending
                </Badge>
              )}
              {trade.revisionRating && (
                <Badge variant="secondary" className="text-[10px]">
                  Rating: {trade.revisionRating}/10
                </Badge>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-5 space-y-4">
            {/* Key Takeaway */}
            <div>
              <label className="text-xs text-muted-foreground uppercase mb-1.5 block">
                🎯 Key Takeaway (এই trade থেকে মূল শিক্ষা)
              </label>
              <Input
                placeholder="এক লাইনে এই trade এর মূল শিক্ষা..."
                value={takeaway}
                onChange={(e) => setTakeaway(e.target.value)}
              />
            </div>

            {/* Revision Notes */}
            <div>
              <label className="text-xs text-muted-foreground uppercase mb-1.5 block">
                📖 Revision Notes
              </label>
              <Textarea
                placeholder="আবার chart দেখে কি শিখলে, কি ভিন্নভাবে করতে..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Would Take Again */}
            <div className="flex items-center justify-between">
              <label className="text-sm">এই trade আবার নিতাম?</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{wouldTakeAgain ? 'হ্যাঁ' : 'না'}</span>
                <Switch checked={wouldTakeAgain} onCheckedChange={setWouldTakeAgain} />
              </div>
            </div>

            {/* Revised Rating */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground uppercase">
                  Revised Rating
                </label>
                <span className="font-bold text-sm">{rating}/10</span>
              </div>
              <Slider
                value={[rating]}
                onValueChange={([v]) => setRating(v)}
                min={1}
                max={10}
                step={1}
              />
            </div>

            {/* Save */}
            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateTrade.isPending}
                className="gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Save Revision
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default RevisionSection;
