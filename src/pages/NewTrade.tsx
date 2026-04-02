import { useState, useEffect, useMemo } from 'react';
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

function detectCurrentSession(): Session {
  const now = new Date();
  const h = now.getUTCHours();
  // London: 07-16 UTC, New York: 13-22 UTC, Asian: 00-09 UTC, London Close: 15-17 UTC
  if (h >= 15 && h < 17) return 'London Close';
  if (h >= 13 && h < 22) return 'New York';
  if (h >= 7 && h < 16) return 'London';
  return 'Asian';
}

const DRAFT_KEY = 'tradevault-new-trade-draft';

interface DraftData {
  direction: Direction;
  pair: string;
  session: string;
  timeframe: string;
  strategy: string;
  entryPrice: string;
  exitPrice: string;
  stopLoss: string;
  takeProfit: string;
  lotSize: string;
  selectedSmcTags: string[];
  selectedMistakes: string[];
  psychState: string;
  psychEmotion: string;
  planAdherence: boolean;
  partialCloses: { lots: string; price: string }[];
  reasonForEntry: string;
  confidenceLevel: number[];
  preSituation: string;
  duringSituation: string;
  postSituation: string;
  whatWentWell: string;
  improvementNotes: string;
}

function loadDraft(): Partial<DraftData> {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

const NewTrade = () => {
  const insertTrade = useInsertTrade();
  const navigate = useNavigate();
  const draft = loadDraft();

  const [direction, setDirection] = useState<Direction>(draft.direction || 'LONG');
  const [pair, setPair] = useState(draft.pair || '');
  const [session, setSession] = useState<string>(draft.session || detectCurrentSession());
  const [timeframe, setTimeframe] = useState<string>(draft.timeframe || '15M');
  const [strategy, setStrategy] = useState(draft.strategy || '');
  const [entryPrice, setEntryPrice] = useState(draft.entryPrice || '');
  const [exitPrice, setExitPrice] = useState(draft.exitPrice || '0');
  const [stopLoss, setStopLoss] = useState(draft.stopLoss || '');
  const [takeProfit, setTakeProfit] = useState(draft.takeProfit || '');
  const [lotSize, setLotSize] = useState(draft.lotSize || '');
  const [selectedSmcTags, setSelectedSmcTags] = useState<string[]>(draft.selectedSmcTags || []);
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>(draft.selectedMistakes || []);
  const [psychState, setPsychState] = useState(draft.psychState || '7');
  const [psychEmotion, setPsychEmotion] = useState<string>(draft.psychEmotion || '');
  const [planAdherence, setPlanAdherence] = useState(draft.planAdherence ?? true);
  const [partialCloses, setPartialCloses] = useState<{ lots: string; price: string }[]>(draft.partialCloses || []);

  const [entryScreenshots, setEntryScreenshots] = useState<string[]>([]);
  const [exitScreenshots, setExitScreenshots] = useState<string[]>([]);
  const [lastAddedImage, setLastAddedImage] = useState<string | null>(null);

  const [reasonForEntry, setReasonForEntry] = useState(draft.reasonForEntry || '');
  const [confidenceLevel, setConfidenceLevel] = useState(draft.confidenceLevel || [7]);
  const [preSituation, setPreSituation] = useState(draft.preSituation || '');
  const [duringSituation, setDuringSituation] = useState(draft.duringSituation || '');
  const [postSituation, setPostSituation] = useState(draft.postSituation || '');
  const [whatWentWell, setWhatWentWell] = useState(draft.whatWentWell || '');
  const [improvementNotes, setImprovementNotes] = useState(draft.improvementNotes || '');

  // Auto-save draft on every change
  useEffect(() => {
    const draftData: DraftData = {
      direction, pair, session, timeframe, strategy, entryPrice, exitPrice,
      stopLoss, takeProfit, lotSize, selectedSmcTags, selectedMistakes,
      psychState, psychEmotion, planAdherence, partialCloses,
      reasonForEntry, confidenceLevel, preSituation, duringSituation,
      postSituation, whatWentWell, improvementNotes,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
  }, [direction, pair, session, timeframe, strategy, entryPrice, exitPrice,
    stopLoss, takeProfit, lotSize, selectedSmcTags, selectedMistakes,
    psychState, psychEmotion, planAdherence, partialCloses,
    reasonForEntry, confidenceLevel, preSituation, duringSituation,
    postSituation, whatWentWell, improvementNotes]);

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
    // Fuzzy pair matching: normalize and find closest match
    if (data.pair) {
      const normalized = data.pair.toUpperCase().replace(/\s/g, '');
      // Try exact match first
      let match = pairOptions.find(p => p === normalized);
      // Try without slash: "EURUSD" → "EUR/USD"
      if (!match) {
        const noSlash = normalized.replace('/', '');
        match = pairOptions.find(p => p.replace('/', '') === noSlash);
      }
      if (match) setPair(match);
    }

    if (data.direction) setDirection(data.direction);

    // Timeframe matching with common format conversions
    if (data.timeframe) {
      const tf = data.timeframe.toUpperCase().replace(/\s/g, '');
      const tfMap: Record<string, string> = {
        '1MIN': '1M', '5MIN': '5M', '15MIN': '15M', '30MIN': '30M',
        '1HOUR': '1H', '4HOUR': '4H', '1HOURS': '1H', '4HOURS': '4H',
        'DAILY': 'D', 'WEEKLY': 'W', 'H1': '1H', 'H4': '4H',
        'M1': '1M', 'M5': '5M', 'M15': '15M', 'M30': '30M',
        'D1': 'D', 'W1': 'W',
      };
      const mapped = tfMap[tf] || tf;
      const tfMatch = timeframes.find(t => t === mapped);
      if (tfMatch) setTimeframe(tfMatch);
    }

    // Session is NOT set from AI — always use auto-detected current session

    if (data.entryPrice) setEntryPrice(String(data.entryPrice));
    if (data.exitPrice) setExitPrice(String(data.exitPrice));
    if (data.stopLoss) setStopLoss(String(data.stopLoss));
    if (data.takeProfit) setTakeProfit(String(data.takeProfit));
    if (data.lotSize) setLotSize(String(data.lotSize));
  };

  const handleSubmit = async () => {
    if (!pair || !entryPrice || !stopLoss) {
      toast.error('Required fields পূরণ করো: Pair, Entry Price, Stop Loss');
      return;
    }
    const outcome = 'BREAKEVEN' as const;
    try {
      await insertTrade.mutateAsync({
        date: format(new Date(), 'yyyy-MM-dd'),
        pair,
        direction,
        session: (session || 'London') as any,
        timeframe: (timeframe || '15M') as any,
        strategy: strategy || '',
        entryPrice: entry,
        exitPrice: 0,
        stopLoss: sl,
        takeProfit: tp,
        lotSize: lots,
        riskPercent: 0,
        riskDollars: riskDollars,
        rrr: 0,
        pnl: 0,
        pips: 0,
        outcome,
        smcTags: selectedSmcTags,
        mistakes: selectedMistakes,
        psychologyState: parseInt(psychState) || 5,
        psychologyEmotion: (psychEmotion || 'Calm') as any,
        planAdherence,
        preTradeNotes: '',
        postTradeNotes: '',
        reasonForEntry,
        confidenceLevel: confidenceLevel[0],
        preSituation,
        duringSituation: '',
        postSituation: '',
        whatWentWell: '',
        improvementNotes: '',
        entryScreenshots,
        exitScreenshots: [],
        screenshots: [],
        partialCloses: partialCloses.map((pc, i) => ({
          id: `p${i}`,
          lots: parseFloat(pc.lots) || 0,
          exitPrice: parseFloat(pc.price) || 0,
          pnl: 0,
        })),
        starred: false,
        status: 'PENDING',
        ruleChecklist: [],
        ruleScore: 0,
        revisionNotes: '',
        revisionTakeaway: '',
        revisionWouldTakeAgain: null,
        revisionRating: null,
        revisedAt: null,
      });
      localStorage.removeItem(DRAFT_KEY);
      toast.success('Trade entry সফল! Pending হিসেবে Journal এ দেখা যাবে।');
      navigate('/journal');
    } catch {
      toast.error('Trade save করতে সমস্যা হয়েছে');
    }
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><Label>Entry Price *</Label><Input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="0.00" /></div>
            <div><Label>Stop Loss *</Label><Input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder="0.00" /></div>
            <div><Label>Take Profit</Label><Input type="number" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} placeholder="0.00" /></div>
            <div><Label>Lot Size</Label><Input type="number" value={lotSize} onChange={e => setLotSize(e.target.value)} placeholder="0.01" /></div>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-gradient-to-r from-primary/10 to-transparent rounded-lg p-3 border border-border/20">
              <p className="text-[10px] text-muted-foreground uppercase">Risk Pips</p>
              <p className="font-bold">{riskPips.toFixed(1)}</p>
            </div>
            <div className="bg-gradient-to-r from-red-500/10 to-transparent rounded-lg p-3 border border-border/20">
              <p className="text-[10px] text-muted-foreground uppercase">Risk $</p>
              <p className="font-bold">${riskDollars.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-r from-blue-500/10 to-transparent rounded-lg p-3 border border-border/20">
              <p className="text-[10px] text-muted-foreground uppercase">Potential RRR</p>
              <p className="font-bold">{rrr.toFixed(2)}</p>
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

      {/* SMC Tags */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">🏷️ SMC Tags</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {smcTagOptions.map(tag => (
              <Badge key={tag} variant={selectedSmcTags.includes(tag) ? 'default' : 'outline'}
                className="cursor-pointer" onClick={() => toggleTag(tag, selectedSmcTags, setSelectedSmcTags)}>
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Psychology */}
      <Card className={glassCard}>
        <CardHeader><CardTitle className="text-sm">🧠 Entry Psychology</CardTitle></CardHeader>
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

      <Button onClick={handleSubmit} disabled={insertTrade.isPending} className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-[0_0_20px_hsla(145,63%,49%,0.2)]" size="lg">
        {insertTrade.isPending ? 'Saving...' : '📥 Trade Entry করো (Pending)'}
      </Button>
    </div>
  );
};

export default NewTrade;
