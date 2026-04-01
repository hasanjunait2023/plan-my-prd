import { Trade } from '@/types/trade';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Star, CheckCircle, XCircle, ArrowUp, ArrowDown } from 'lucide-react';
import ImageUpload from './ImageUpload';
import { format, parseISO } from 'date-fns';

interface TradeDocumentProps {
  trade: Trade;
  onBack?: () => void;
}

const TradeDocument = ({ trade, onBack }: TradeDocumentProps) => {
  const isWin = trade.outcome === 'WIN';
  const isLoss = trade.outcome === 'LOSS';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-3">
        {onBack && (
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← ফিরে যাও
          </button>
        )}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              📅 {format(parseISO(trade.date), 'MMMM d, yyyy')}
            </p>
            <h1 className="text-2xl font-bold flex items-center gap-3 mt-1">
              <span className="flex items-center gap-2">
                {trade.direction === 'LONG' ? (
                  <ArrowUp className="w-5 h-5 text-profit" />
                ) : (
                  <ArrowDown className="w-5 h-5 text-loss" />
                )}
                {trade.pair}
              </span>
              <Badge variant={isWin ? 'default' : isLoss ? 'destructive' : 'secondary'}
                className={isWin ? 'bg-profit text-primary-foreground' : ''}>
                {trade.outcome}
              </Badge>
              {trade.starred && <Star className="w-5 h-5 text-warning fill-current" />}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {trade.session} Session &middot; {trade.timeframe} &middot; {trade.strategy}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${trade.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              {trade.pips >= 0 ? '+' : ''}{trade.pips} pips &middot; RRR {trade.rrr.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Trade Data */}
      <Section emoji="📊" title="Trade Data">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DataCell label="Entry Price" value={trade.entryPrice.toString()} />
          <DataCell label="Exit Price" value={trade.exitPrice.toString()} />
          <DataCell label="Stop Loss" value={trade.stopLoss.toString()} />
          <DataCell label="Take Profit" value={trade.takeProfit.toString()} />
          <DataCell label="Lot Size" value={trade.lotSize.toString()} />
          <DataCell label="Risk" value={`${trade.riskPercent}% ($${trade.riskDollars})`} />
          <DataCell label="Pips" value={`${trade.pips >= 0 ? '+' : ''}${trade.pips}`} highlight={trade.pips >= 0 ? 'profit' : 'loss'} />
          <DataCell label="P&L" value={`${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}`} highlight={trade.pnl >= 0 ? 'profit' : 'loss'} />
        </div>
        {trade.smcTags.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">SMC Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {trade.smcTags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          </div>
        )}
        {trade.partialCloses.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Partial Closes</p>
            <div className="space-y-1">
              {trade.partialCloses.map(pc => (
                <p key={pc.id} className="text-sm">
                  {pc.lots} lots @ {pc.exitPrice} → <span className={pc.pnl >= 0 ? 'text-profit' : 'text-loss'}>${pc.pnl}</span>
                </p>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Screenshots */}
      <Section emoji="🖼️" title="Screenshots">
        <ImageUpload images={trade.screenshots} onImagesChange={() => {}} readOnly />
      </Section>

      {/* Reason for Entry */}
      <Section emoji="📝" title="Trade নেওয়ার কারণ (Reason for Entry)">
        <NoteBlock text={trade.reasonForEntry} />
      </Section>

      {/* Confidence */}
      <Section emoji="🎯" title="Confidence Level">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(trade.confidenceLevel / 10) * 100}%` }}
            />
          </div>
          <span className="font-bold text-lg">{trade.confidenceLevel}/10</span>
        </div>
      </Section>

      {/* Pre Situation */}
      <Section emoji="📍" title="Entry এর আগে Situation (Pre-Trade)">
        <NoteBlock text={trade.preSituation || trade.preTradeNotes} />
      </Section>

      {/* During Situation */}
      <Section emoji="⏳" title="Trade চলাকালীন Situation (During Trade)">
        <NoteBlock text={trade.duringSituation} />
      </Section>

      {/* Post Situation */}
      <Section emoji="📍" title="Trade এর পরে Situation (Post-Trade)">
        <NoteBlock text={trade.postSituation || trade.postTradeNotes} />
      </Section>

      {/* What went well */}
      <Section emoji="✅" title="কি কি ভালো হয়েছে (What Went Well)">
        <NoteBlock text={trade.whatWentWell} />
      </Section>

      {/* Mistakes */}
      <Section emoji="❌" title="কি কি ভুল হয়েছে (Mistakes)">
        {trade.mistakes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {trade.mistakes.map(m => (
              <Badge key={m} variant="destructive" className="text-xs">{m}</Badge>
            ))}
          </div>
        )}
        {trade.mistakes.length === 0 && (
          <p className="text-sm text-muted-foreground italic">কোনো mistake নেই — চমৎকার! 🎉</p>
        )}
      </Section>

      {/* Improvement */}
      <Section emoji="🔧" title="Improvement Notes">
        <NoteBlock text={trade.improvementNotes} />
      </Section>

      {/* Psychology */}
      <Section emoji="🧠" title="Psychology">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <DataCell label="Mental State" value={`${trade.psychologyState}/10`} />
          <DataCell label="Emotion" value={trade.psychologyEmotion} />
          <div className="flex items-center gap-2">
            {trade.planAdherence ? (
              <CheckCircle className="w-5 h-5 text-profit" />
            ) : (
              <XCircle className="w-5 h-5 text-loss" />
            )}
            <span className="text-sm">Plan {trade.planAdherence ? 'অনুসরণ করা হয়েছে' : 'অনুসরণ করা হয়নি'}</span>
          </div>
        </div>
      </Section>
    </div>
  );
};

const Section = ({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) => (
  <Card className="border-border/50">
    <CardContent className="pt-5 pb-4">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">
        {emoji} {title}
      </h3>
      {children}
    </CardContent>
  </Card>
);

const NoteBlock = ({ text }: { text?: string }) => (
  <div className="text-sm leading-relaxed whitespace-pre-wrap">
    {text || <span className="text-muted-foreground italic">কোনো নোট লেখা হয়নি</span>}
  </div>
);

const DataCell = ({ label, value, highlight }: { label: string; value: string; highlight?: 'profit' | 'loss' }) => (
  <div className="bg-secondary/50 rounded-lg p-3">
    <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
    <p className={`font-semibold ${highlight === 'profit' ? 'text-profit' : highlight === 'loss' ? 'text-loss' : ''}`}>
      {value}
    </p>
  </div>
);

export default TradeDocument;
