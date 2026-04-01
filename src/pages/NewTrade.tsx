import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pairOptions, strategyOptions, smcTagOptions, mistakeOptions } from '@/data/mockData';
import { Direction, Session, Timeframe, PsychEmotion, PartialClose } from '@/types/trade';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

const sessions: Session[] = ['Asian', 'London', 'New York', 'London Close'];
const timeframes: Timeframe[] = ['1M', '5M', '15M', '1H', '4H', 'D', 'W'];
const emotions: PsychEmotion[] = ['Confident', 'Fearful', 'Greedy', 'Calm', 'Anxious', 'Revenge', 'FOMO', 'Patient', 'Frustrated'];

const NewTrade = () => {
  const [direction, setDirection] = useState<Direction>('LONG');
  const [pair, setPair] = useState('');
  const [session, setSession] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('');
  const [strategy, setStrategy] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [selectedSmcTags, setSelectedSmcTags] = useState<string[]>([]);
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);
  const [psychState, setPsychState] = useState('7');
  const [psychEmotion, setPsychEmotion] = useState<string>('');
  const [planAdherence, setPlanAdherence] = useState(true);
  const [preNotes, setPreNotes] = useState('');
  const [postNotes, setPostNotes] = useState('');
  const [partialCloses, setPartialCloses] = useState<{ lots: string; price: string }[]>([]);

  // Auto-calculations
  const entry = parseFloat(entryPrice) || 0;
  const exit = parseFloat(exitPrice) || 0;
  const sl = parseFloat(stopLoss) || 0;
  const tp = parseFloat(takeProfit) || 0;
  const lots = parseFloat(lotSize) || 0;

  const riskPips = entry && sl ? Math.abs(entry - sl) * (pair.includes('JPY') ? 100 : 10000) : 0;
  const rewardPips = entry && tp ? Math.abs(tp - entry) * (pair.includes('JPY') ? 100 : 10000) : 0;
  const rrr = riskPips ? rewardPips / riskPips : 0;
  const pips = entry && exit ? (direction === 'LONG' ? exit - entry : entry - exit) * (pair.includes('JPY') ? 100 : 10000) : 0;
  const pipValue = pair.includes('JPY') ? lots * 1000 / 100 : lots * 100000 * 0.0001;
  const pnl = pips * (pipValue || 10);
  const riskDollars = riskPips * (pipValue || 10);

  const toggleTag = (tag: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag]);
  };

  const addPartialClose = () => setPartialCloses([...partialCloses, { lots: '', price: '' }]);
  const removePartialClose = (i: number) => setPartialCloses(partialCloses.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    if (!pair || !entryPrice || !exitPrice || !stopLoss) {
      toast.error('Please fill required fields: Pair, Entry, Exit, Stop Loss');
      return;
    }
    toast.success('Trade logged successfully! (Mock — no backend yet)');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Trade Entry</h1>
        <p className="text-sm text-muted-foreground">Log your trade with full details</p>
      </div>

      {/* Direction Toggle */}
      <div className="flex gap-2">
        <Button
          variant={direction === 'LONG' ? 'default' : 'outline'}
          onClick={() => setDirection('LONG')}
          className={direction === 'LONG' ? 'bg-profit hover:bg-profit/90 text-primary-foreground' : ''}
        >
          ↑ LONG
        </Button>
        <Button
          variant={direction === 'SHORT' ? 'default' : 'outline'}
          onClick={() => setDirection('SHORT')}
          className={direction === 'SHORT' ? 'bg-loss hover:bg-loss/90 text-foreground' : ''}
        >
          ↓ SHORT
        </Button>
      </div>

      {/* Core Trade Info */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Trade Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Pair *</Label>
              <Select value={pair} onValueChange={setPair}>
                <SelectTrigger><SelectValue placeholder="Select pair" /></SelectTrigger>
                <SelectContent>{pairOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Session</Label>
              <Select value={session} onValueChange={setSession}>
                <SelectTrigger><SelectValue placeholder="Session" /></SelectTrigger>
                <SelectContent>{sessions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger><SelectValue placeholder="TF" /></SelectTrigger>
                <SelectContent>{timeframes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Strategy</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger><SelectValue placeholder="Strategy" /></SelectTrigger>
                <SelectContent>{strategyOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prices */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Prices & Position</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div><Label>Entry Price *</Label><Input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="0.00" /></div>
            <div><Label>Exit Price *</Label><Input type="number" value={exitPrice} onChange={e => setExitPrice(e.target.value)} placeholder="0.00" /></div>
            <div><Label>Stop Loss *</Label><Input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder="0.00" /></div>
            <div><Label>Take Profit</Label><Input type="number" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} placeholder="0.00" /></div>
            <div><Label>Lot Size</Label><Input type="number" value={lotSize} onChange={e => setLotSize(e.target.value)} placeholder="0.01" /></div>
          </div>

          {/* Auto-calculated values */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-accent/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Risk Pips</p>
              <p className="font-bold">{riskPips.toFixed(1)}</p>
            </div>
            <div className="bg-accent/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Risk $</p>
              <p className="font-bold">${riskDollars.toFixed(2)}</p>
            </div>
            <div className="bg-accent/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">RRR</p>
              <p className="font-bold">{rrr.toFixed(2)}</p>
            </div>
            <div className="bg-accent/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Pips</p>
              <p className={`font-bold ${pips >= 0 ? 'text-profit' : 'text-loss'}`}>{pips.toFixed(1)}</p>
            </div>
            <div className="bg-accent/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">P&L</p>
              <p className={`font-bold ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partial Closes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Partial Closes</CardTitle>
            <Button variant="outline" size="sm" onClick={addPartialClose}><Plus className="w-3 h-3 mr-1" />Add</Button>
          </div>
        </CardHeader>
        {partialCloses.length > 0 && (
          <CardContent>
            {partialCloses.map((pc, i) => (
              <div key={i} className="flex gap-3 items-end mb-2">
                <div className="flex-1"><Label>Lots</Label><Input type="number" value={pc.lots} onChange={e => { const c = [...partialCloses]; c[i].lots = e.target.value; setPartialCloses(c); }} /></div>
                <div className="flex-1"><Label>Exit Price</Label><Input type="number" value={pc.price} onChange={e => { const c = [...partialCloses]; c[i].price = e.target.value; setPartialCloses(c); }} /></div>
                <Button variant="ghost" size="icon" onClick={() => removePartialClose(i)}><Trash2 className="w-4 h-4 text-loss" /></Button>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* SMC Tags & Mistakes */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Tags & Mistakes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">SMC Tags</Label>
            <div className="flex flex-wrap gap-2">
              {smcTagOptions.map(tag => (
                <Badge key={tag} variant={selectedSmcTags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer" onClick={() => toggleTag(tag, selectedSmcTags, setSelectedSmcTags)}>
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Mistakes</Label>
            <div className="flex flex-wrap gap-2">
              {mistakeOptions.map(m => (
                <Badge key={m} variant={selectedMistakes.includes(m) ? 'destructive' : 'outline'}
                  className="cursor-pointer" onClick={() => toggleTag(m, selectedMistakes, setSelectedMistakes)}>
                  {m}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Psychology */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Psychology</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Mental State (1-10)</Label>
              <Input type="number" min="1" max="10" value={psychState} onChange={e => setPsychState(e.target.value)} />
            </div>
            <div>
              <Label>Emotion</Label>
              <Select value={psychEmotion} onValueChange={setPsychEmotion}>
                <SelectTrigger><SelectValue placeholder="Emotion" /></SelectTrigger>
                <SelectContent>{emotions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={planAdherence} onCheckedChange={setPlanAdherence} />
              <Label>Plan Followed</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Trade Notes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Pre-Trade Reasoning</Label>
            <Textarea value={preNotes} onChange={e => setPreNotes(e.target.value)} placeholder="Why are you taking this trade?" rows={3} />
          </div>
          <div>
            <Label>Post-Trade Review</Label>
            <Textarea value={postNotes} onChange={e => setPostNotes(e.target.value)} placeholder="What did you learn from this trade?" rows={3} />
          </div>
          <div>
            <Label>Screenshots</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
              📸 Screenshot upload will be available with backend integration
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} className="w-full" size="lg">
        Log Trade
      </Button>
    </div>
  );
};

export default NewTrade;
