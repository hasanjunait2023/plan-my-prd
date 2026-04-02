import { useState } from 'react';
import { Trade } from '@/types/trade';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { mistakeOptions } from '@/data/mockData';
import { useUpdateTrade } from '@/hooks/useTrades';
import { toast } from 'sonner';
import ImageUpload from './ImageUpload';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import { PairWithFlags } from '@/lib/pairFlags';

interface TradeCompleteFormProps {
  trade: Trade;
}

const glassCard = "border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]";

const TradeCompleteForm = ({ trade }: TradeCompleteFormProps) => {
  const updateTrade = useUpdateTrade();
  const [exitPrice, setExitPrice] = useState('');
  const [exitScreenshots, setExitScreenshots] = useState<string[]>(trade.exitScreenshots || []);
  const [duringSituation, setDuringSituation] = useState(trade.duringSituation || '');
  const [postSituation, setPostSituation] = useState(trade.postSituation || '');
  const [whatWentWell, setWhatWentWell] = useState(trade.whatWentWell || '');
  const [improvementNotes, setImprovementNotes] = useState(trade.improvementNotes || '');
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>(trade.mistakes || []);
  const [partialCloses, setPartialCloses] = useState<{ lots: string; price: string }[]>([]);

  const toggleMistake = (m: string) => {
    setSelectedMistakes(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const handleFinalize = async () => {
    if (!exitPrice) {
      toast.error('Exit Price দিতে হবে!');
      return;
    }

    const exit = parseFloat(exitPrice);
    const entry = trade.entryPrice;
    const isJPY = trade.pair.includes('JPY');
    const multiplier = isJPY ? 100 : 10000;
    const pips = trade.direction === 'LONG' ? (exit - entry) * multiplier : (entry - exit) * multiplier;
    const pipValue = isJPY ? trade.lotSize * 1000 / 100 : trade.lotSize * 100000 * 0.0001;
    const pnl = pips * (pipValue || 10);
    const outcome = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN';
    const riskPips = Math.abs(entry - trade.stopLoss) * multiplier;
    const rrr = riskPips > 0 ? Math.abs(pips) / riskPips : 0;

    try {
      await updateTrade.mutateAsync({
        id: trade.id,
        exitPrice: exit,
        pnl,
        pips,
        outcome,
        rrr,
        status: 'CLOSED',
        exitScreenshots,
        duringSituation,
        postSituation,
        whatWentWell,
        improvementNotes,
        mistakes: selectedMistakes,
        partialCloses: partialCloses.map((pc, i) => ({
          id: `p${i}`,
          lots: parseFloat(pc.lots) || 0,
          exitPrice: parseFloat(pc.price) || 0,
          pnl: 0,
        })),
      });
      toast.success('Trade finalize হয়েছে! ✅');
    } catch {
      toast.error('Trade update করতে সমস্যা হয়েছে');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
          🟡 PENDING — Trade Close করো
        </Badge>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <PairWithFlags pair={trade.pair} />
          <span className="text-sm font-normal text-muted-foreground">
            {trade.direction} · Entry: {trade.entryPrice} · SL: {trade.stopLoss}
          </span>
        </h2>
      </div>

      {/* Exit Price */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">💰 Exit Price</CardTitle></CardHeader>
        <CardContent>
          <Input type="number" value={exitPrice} onChange={e => setExitPrice(e.target.value)} placeholder="Exit price দাও..." className="text-lg" />
        </CardContent>
      </Card>

      {/* During Situation */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">⏳ Trade চলাকালীন Situation</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={duringSituation} onChange={e => setDuringSituation(e.target.value)}
            placeholder="Trade চলাকালীন কি হয়েছিল?" rows={3} />
        </CardContent>
      </Card>

      {/* Exit Screenshots */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">📸 Exit Screenshots</CardTitle></CardHeader>
        <CardContent>
          <ImageUpload images={exitScreenshots} onImagesChange={setExitScreenshots} label="Exit screenshot upload করো" />
        </CardContent>
      </Card>

      {/* Post Situation */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">📍 Post-Trade Situation</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={postSituation} onChange={e => setPostSituation(e.target.value)}
            placeholder="Trade close এর পরে কি হলো?" rows={3} />
        </CardContent>
      </Card>

      {/* What Went Well */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">✅ কি ভালো হয়েছে</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={whatWentWell} onChange={e => setWhatWentWell(e.target.value)}
            placeholder="কি কি সঠিক করেছো?" rows={3} />
        </CardContent>
      </Card>

      {/* Mistakes */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">❌ Mistakes</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {mistakeOptions.map(m => (
              <Badge key={m} variant={selectedMistakes.includes(m) ? 'destructive' : 'outline'}
                className="cursor-pointer" onClick={() => toggleMistake(m)}>
                {m}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Improvement */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">🔧 Improvement Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={improvementNotes} onChange={e => setImprovementNotes(e.target.value)}
            placeholder="কোথায় improve করা যায়?" rows={3} />
        </CardContent>
      </Card>

      {/* Partial Closes */}
      <Card className={glassCard}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">📊 Partial Closes</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setPartialCloses([...partialCloses, { lots: '', price: '' }])}>
              <Plus className="w-3 h-3 mr-1" />Add
            </Button>
          </div>
        </CardHeader>
        {partialCloses.length > 0 && (
          <CardContent>
            {partialCloses.map((pc, i) => (
              <div key={i} className="flex gap-3 items-end mb-2">
                <div className="flex-1"><Label>Lots</Label><Input type="number" value={pc.lots} onChange={e => { const c = [...partialCloses]; c[i].lots = e.target.value; setPartialCloses(c); }} /></div>
                <div className="flex-1"><Label>Exit Price</Label><Input type="number" value={pc.price} onChange={e => { const c = [...partialCloses]; c[i].price = e.target.value; setPartialCloses(c); }} /></div>
                <Button variant="ghost" size="icon" onClick={() => setPartialCloses(partialCloses.filter((_, idx) => idx !== i))}>
                  <Trash2 className="w-4 h-4 text-loss" />
                </Button>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      <Button onClick={handleFinalize} disabled={updateTrade.isPending}
        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-[0_0_20px_hsla(145,63%,49%,0.2)]" size="lg">
        <CheckCircle className="w-4 h-4 mr-2" />
        {updateTrade.isPending ? 'Finalizing...' : 'Trade Finalize করো ✅'}
      </Button>
    </div>
  );
};

export default TradeCompleteForm;
