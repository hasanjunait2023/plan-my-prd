import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { pairOptions, strategyOptions, smcTagOptions, mistakeOptions } from '@/data/mockData';
import { Direction, Session, Timeframe, PsychEmotion } from '@/types/trade';
import { toast } from 'sonner';
import { Plus, Trash2, PlusCircle } from 'lucide-react';
import ImageUpload from '@/components/journal/ImageUpload';
import ScreenshotAnalyzer, { ExtractedTradeData } from '@/components/journal/ScreenshotAnalyzer';
import { formatPairWithFlags } from '@/lib/pairFlags';
import { SessionPanel } from '@/components/correlation/SessionPanel';
import { useInsertTrade } from '@/hooks/useTrades';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const sessions: Session[] = ['Asian', 'London', 'New York', 'London Close'];
const timeframes: Timeframe[] = ['1M', '5M', '15M', '1H', '4H', 'D', 'W'];
const emotions: PsychEmotion[] = ['Confident', 'Fearful', 'Greedy', 'Calm', 'Anxious', 'Revenge', 'FOMO', 'Patient', 'Frustrated'];

const glassCard = "border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]";

const NewTrade = () => {
  const insertTrade = useInsertTrade();
  const navigate = useNavigate();
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
  const [partialCloses, setPartialCloses] = useState<{ lots: string; price: string }[]>([]);

  const [entryScreenshots, setEntryScreenshots] = useState<string[]>([]);
  const [exitScreenshots, setExitScreenshots] = useState<string[]>([]);
  const [lastAddedImage, setLastAddedImage] = useState<string | null>(null);

  const [reasonForEntry, setReasonForEntry] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState([7]);
  const [preSituation, setPreSituation] = useState('');
  const [duringSituation, setDuringSituation] = useState('');
  const [postSituation, setPostSituation] = useState('');
  const [whatWentWell, setWhatWentWell] = useState('');
  const [improvementNotes, setImprovementNotes] = useState('');

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

  const handleDataExtracted = (data: ExtractedTradeData) => {
    if (data.pair && pairOptions.includes(data.pair)) setPair(data.pair);
    if (data.direction) setDirection(data.direction);
    if (data.timeframe && timeframes.includes(data.timeframe as Timeframe)) setTimeframe(data.timeframe);
    if (data.session && sessions.includes(data.session as Session)) setSession(data.session);
    if (data.entryPrice) setEntryPrice(String(data.entryPrice));
    if (data.exitPrice) setExitPrice(String(data.exitPrice));
    if (data.stopLoss) setStopLoss(String(data.stopLoss));
    if (data.takeProfit) setTakeProfit(String(data.takeProfit));
    if (data.lotSize) setLotSize(String(data.lotSize));
  };

  const handleSubmit = () => {
    if (!pair || !entryPrice || !exitPrice || !stopLoss) {
      toast.error('Required fields পূরণ করো: Pair, Entry, Exit, Stop Loss');
      return;
    }
    toast.success('Trade সফলভাবে log হয়েছে! (Mock — backend পরে যোগ হবে)');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Premium Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
          <PlusCircle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">নতুন Trade Entry</h1>
          <p className="text-sm text-muted-foreground">তোমার trade এর সব details লেখো</p>
        </div>
      </div>

      <SessionPanel />

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

      {/* Entry Screenshots */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">📸 Entry Situation Screenshots</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <ImageUpload
            images={entryScreenshots}
            onImagesChange={setEntryScreenshots}
            label="Entry এর সময়ের screenshot paste/upload করো"
            onImageAdded={(img) => setLastAddedImage(img)}
          />
          {lastAddedImage && entryScreenshots.includes(lastAddedImage) && (
            <ScreenshotAnalyzer
              imageBase64={lastAddedImage}
              onDataExtracted={handleDataExtracted}
            />
          )}
        </CardContent>
      </Card>

      {/* Core Trade Info */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">📊 Trade Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Pair *</Label>
              <Select value={pair} onValueChange={setPair}>
                <SelectTrigger><SelectValue placeholder="Select pair" /></SelectTrigger>
                <SelectContent>{pairOptions.map(p => <SelectItem key={p} value={p}>{formatPairWithFlags(p)}</SelectItem>)}</SelectContent>
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
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">💰 Prices & Position</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div><Label>Entry Price *</Label><Input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="0.00" /></div>
            <div><Label>Exit Price *</Label><Input type="number" value={exitPrice} onChange={e => setExitPrice(e.target.value)} placeholder="0.00" /></div>
            <div><Label>Stop Loss *</Label><Input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder="0.00" /></div>
            <div><Label>Take Profit</Label><Input type="number" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} placeholder="0.00" /></div>
            <div><Label>Lot Size</Label><Input type="number" value={lotSize} onChange={e => setLotSize(e.target.value)} placeholder="0.01" /></div>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-gradient-to-r from-primary/10 to-transparent rounded-lg p-3 border border-border/20">
              <p className="text-[10px] text-muted-foreground uppercase">Risk Pips</p>
              <p className="font-bold">{riskPips.toFixed(1)}</p>
            </div>
            <div className="bg-gradient-to-r from-red-500/10 to-transparent rounded-lg p-3 border border-border/20">
              <p className="text-[10px] text-muted-foreground uppercase">Risk $</p>
              <p className="font-bold">${riskDollars.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-r from-blue-500/10 to-transparent rounded-lg p-3 border border-border/20">
              <p className="text-[10px] text-muted-foreground uppercase">RRR</p>
              <p className="font-bold">{rrr.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-r from-emerald-500/10 to-transparent rounded-lg p-3 border border-border/20">
              <p className="text-[10px] text-muted-foreground uppercase">Pips</p>
              <p className={`font-bold ${pips >= 0 ? 'text-profit' : 'text-loss'}`}>{pips.toFixed(1)}</p>
            </div>
            <div className="bg-gradient-to-r from-emerald-500/10 to-transparent rounded-lg p-3 border border-border/20">
              <p className="text-[10px] text-muted-foreground uppercase">P&L</p>
              <p className={`font-bold ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reason for Entry */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">📝 Trade নেওয়ার কারণ (Reason for Entry)</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={reasonForEntry} onChange={e => setReasonForEntry(e.target.value)}
            placeholder="কেন এই trade নিচ্ছো? Setup কি ছিল? বাংলায় বা English এ লেখো..." rows={4} className="text-base" />
        </CardContent>
      </Card>

      {/* Confidence Level */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">🎯 Confidence Level</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Slider value={confidenceLevel} onValueChange={setConfidenceLevel} min={1} max={10} step={1} className="flex-1" />
            <span className="text-xl font-bold min-w-[3rem] text-center">{confidenceLevel[0]}/10</span>
          </div>
        </CardContent>
      </Card>

      {/* Pre-Trade Situation */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">📍 Entry এর আগে Situation (Pre-Trade)</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={preSituation} onChange={e => setPreSituation(e.target.value)}
            placeholder="Entry নেওয়ার আগে market এ কি situation ছিল? কি দেখেছিলে?" rows={4} className="text-base" />
        </CardContent>
      </Card>

      {/* During Trade Situation */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">⏳ Trade চলাকালীন Situation (During Trade)</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={duringSituation} onChange={e => setDuringSituation(e.target.value)}
            placeholder="Trade চলাকালীন কি হয়েছিল? Price কিভাবে move করেছিল?" rows={4} className="text-base" />
        </CardContent>
      </Card>

      {/* Exit Screenshots */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">📸 Exit Situation Screenshots</CardTitle></CardHeader>
        <CardContent>
          <ImageUpload images={exitScreenshots} onImagesChange={setExitScreenshots} label="Exit এর পরের screenshot paste/upload করো" />
        </CardContent>
      </Card>

      {/* Post-Trade Situation */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">📍 Trade এর পরে Situation (Post-Trade)</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={postSituation} onChange={e => setPostSituation(e.target.value)}
            placeholder="Trade close করার পরে কি হয়েছিল? Price কোথায় গেছে?" rows={4} className="text-base" />
        </CardContent>
      </Card>

      {/* What Went Well */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">✅ কি কি ভালো হয়েছে (What Went Well)</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={whatWentWell} onChange={e => setWhatWentWell(e.target.value)}
            placeholder="এই trade এ কি কি সঠিক করেছো?" rows={3} className="text-base" />
        </CardContent>
      </Card>

      {/* SMC Tags & Mistakes */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">🏷️ Tags & ❌ Mistakes</CardTitle></CardHeader>
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

      {/* Improvement Notes */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">🔧 Improvement Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={improvementNotes} onChange={e => setImprovementNotes(e.target.value)}
            placeholder="কোথায় আরো ভালো করতে পারতে? পরবর্তী বার কি করবে?" rows={3} className="text-base" />
        </CardContent>
      </Card>

      {/* Psychology */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">🧠 Psychology</CardTitle></CardHeader>
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
              <Label>Plan অনুসরণ করেছি</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partial Closes */}
      <Card className={glassCard}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">📊 Partial Closes</CardTitle>
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

      <Button onClick={handleSubmit} className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-[0_0_20px_hsla(145,63%,49%,0.2)]" size="lg">
        Trade Log করো
      </Button>
    </div>
  );
};

export default NewTrade;
