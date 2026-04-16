import { Card, CardContent } from '@/components/ui/card';
import { Flame, TrendingUp, Minus, TrendingDown, AlertTriangle, BookOpen } from 'lucide-react';

type Tier = {
  key: string;
  label: string;
  range: string;
  color: string; // HSL string
  icon: typeof Flame;
  short: string; // one-liner
  details: string; // detailed Bengali explanation
  action: string; // trade action guidance
};

const TIERS: Tier[] = [
  {
    key: 'STRONG',
    label: 'STRONG',
    range: '+5 to +10',
    color: 'hsl(142, 71%, 45%)',
    icon: Flame,
    short: 'Currency খুবই শক্তিশালী — bullish momentum dominant',
    details:
      'এই currency major counterparts এর বিরুদ্ধে clearly উপরে আছে। Buyers control নিচ্ছে, fundamentals + technicals দুটোই align হয়েছে। এর মানে সবগুলো pair এ এই currency base হিসেবে থাকলে BUY এবং quote হিসেবে থাকলে SELL signal পাচ্ছ।',
    action: '✅ এই currency কে BUY side এ রাখো — STRONG vs WEAK pair হলো best trade setup',
  },
  {
    key: 'MID_STRONG',
    label: 'MID STRONG',
    range: '+2 to +4',
    color: 'hsl(160, 60%, 45%)',
    icon: TrendingUp,
    short: 'মাঝারি শক্তি — উপরের দিকে drift হচ্ছে',
    details:
      'Currency সামান্য bullish bias দেখাচ্ছে কিন্তু এখনো dominant হয়নি। Confirmation দরকার — যদি নিচের ranking এ একটা WEAK currency থাকে, তাহলে সেটার বিরুদ্ধে long entry consider করতে পারো।',
    action: '⚠️ একা trade না — STRONG/WEAK divergence এর সাথে combine করো',
  },
  {
    key: 'NEUTRAL',
    label: 'NEUTRAL',
    range: '-2 to +1',
    color: 'hsl(48, 50%, 55%)',
    icon: Minus,
    short: 'কোনো clear direction নেই — sideways / chop',
    details:
      'Currency consolidation এ আছে, buyers/sellers balanced। এই অবস্থায় trade করলে false signal বেশি হবে। Setup form হওয়া পর্যন্ত wait করা best।',
    action: '🛑 NEUTRAL pair avoid করো — momentum না আসা পর্যন্ত sit out',
  },
  {
    key: 'MID_WEAK',
    label: 'MID WEAK',
    range: '-3 to -4',
    color: 'hsl(25, 95%, 53%)',
    icon: TrendingDown,
    short: 'মাঝারি দুর্বল — selling pressure বাড়ছে',
    details:
      'Currency নিচে drift হচ্ছে কিন্তু এখনো collapse হয়নি। উপরের দিকে STRONG currency এর সাথে pair করলে valid SHORT setup পাবে। সাবধানে position size ছোট রেখে enter করো।',
    action: '⚠️ এই currency কে SELL side এ consider করো STRONG counterparty এর বিরুদ্ধে',
  },
  {
    key: 'WEAK',
    label: 'WEAK',
    range: '-5 to -10',
    color: 'hsl(0, 84%, 60%)',
    icon: AlertTriangle,
    short: 'Currency খুবই দুর্বল — bearish momentum dominant',
    details:
      'Sellers পুরো control নিয়ে নিয়েছে। যেসব pair এ এই currency base হিসেবে আছে সেগুলোতে SELL signal, quote হিসেবে থাকলে BUY signal। STRONG currency এর সাথে pair করে trade করলে highest probability setup পাবে।',
    action: '✅ এই currency কে SELL side এ রাখো — WEAK vs STRONG = trade of the day',
  },
];

export function TierLegend() {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md shadow-[0_8px_32px_hsla(0,0%,0%,0.4)] overflow-hidden">
      <div className="relative px-5 py-4 border-b border-border/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shadow-[0_0_16px_hsla(142,71%,45%,0.2)]">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-extrabold tracking-tight text-foreground">Strength Tier Guide</h3>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              প্রতিটা tier এর বিস্তারিত — কখন কোন signal কাজ করে
            </p>
          </div>
        </div>
      </div>

      <CardContent className="p-3 sm:p-4 space-y-2.5">
        {TIERS.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.key}
              className="relative rounded-xl border overflow-hidden transition-all hover:scale-[1.005]"
              style={{
                borderColor: `${t.color}33`,
                background: `linear-gradient(135deg, ${t.color}10 0%, transparent 70%)`,
                boxShadow: `0 0 18px ${t.color}10, inset 0 1px 0 ${t.color}15`,
              }}
            >
              {/* Left accent stripe */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ background: `linear-gradient(180deg, ${t.color}, ${t.color}66)`, boxShadow: `0 0 8px ${t.color}` }}
              />

              <div className="pl-4 pr-3 py-3 sm:py-3.5">
                {/* Header row */}
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${t.color}1f`,
                      border: `1px solid ${t.color}40`,
                      boxShadow: `0 0 12px ${t.color}30`,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: t.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-black text-sm tracking-widest uppercase"
                        style={{ color: t.color, textShadow: `0 0 12px ${t.color}66` }}
                      >
                        {t.label}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md tabular-nums"
                        style={{
                          color: t.color,
                          backgroundColor: `${t.color}18`,
                          border: `1px solid ${t.color}30`,
                        }}
                      >
                        {t.range}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground/80 font-semibold mt-0.5 leading-snug">
                      {t.short}
                    </p>
                  </div>
                </div>

                {/* Details body */}
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed mb-2 pl-0.5">
                  {t.details}
                </p>

                {/* Action chip */}
                <div
                  className="text-[10px] sm:text-[11px] font-bold px-2.5 py-1.5 rounded-md inline-block"
                  style={{
                    color: t.color,
                    backgroundColor: `${t.color}14`,
                    border: `1px dashed ${t.color}40`,
                  }}
                >
                  {t.action}
                </div>
              </div>
            </div>
          );
        })}

        {/* Pro tip footer */}
        <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
            <Flame className="w-3 h-3 text-primary" />
          </div>
          <div className="text-[11px] sm:text-xs text-foreground/85 leading-relaxed">
            <span className="font-extrabold text-primary">Pro tip:</span> সবচেয়ে বড় opportunity আসে যখন
            একটা <span className="font-bold text-foreground">STRONG currency</span> আর একটা{' '}
            <span className="font-bold text-foreground">WEAK currency</span> একসাথে pair হয় — যেমন
            যদি EUR STRONG আর JPY WEAK থাকে তাহলে EURJPY long = best probability trade।
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
