import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Play, TrendingUp, TrendingDown, Clock, AlertTriangle,
  CheckCircle2, XCircle, BarChart3, Shield, Zap, Target,
  ArrowUpRight, ArrowDownRight, Activity, Gauge, Layers,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QualifiedPair {
  pair: string;
  direction: string;
  score: number;
  differential: number;
  bias4h: string;
  overextPct: string;
  adrRemaining: string;
  atrStatus: string;
  reasoning: string;
  rank: number;
}

interface ScanResult {
  success: boolean;
  scan_batch_id: string;
  session: string;
  pairs_analyzed: number;
  qualified: QualifiedPair[];
  skipped_count: number;
  currency_scores: Record<string, number>;
  errors?: string[];
}

interface DbRecommendation {
  id: string;
  pair: string;
  session: string;
  direction: string;
  total_score: number;
  differential: number;
  bias_4h: string;
  overextension_pct: number;
  adr_remaining: number;
  atr_status: string;
  reasoning: string;
  is_qualified: boolean;
  rank: number;
  scan_batch_id: string;
  scanned_at: string;
}

const FLAGS: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵",
  AUD: "🇦🇺", NZD: "🇳🇿", CAD: "🇨🇦", CHF: "🇨🇭",
};

const SESSION_ICONS: Record<string, string> = {
  Asian: "🌏", London: "🏰", "New York": "🗽",
};

const SESSION_COLORS: Record<string, string> = {
  Asian: "from-amber-500/20 to-orange-500/10",
  London: "from-blue-500/20 to-indigo-500/10",
  "New York": "from-emerald-500/20 to-teal-500/10",
};

const PairSelector = () => {
  const [session, setSession] = useState("London");
  const [isRunning, setIsRunning] = useState(false);
  const [liveResult, setLiveResult] = useState<ScanResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("results");
  const { toast } = useToast();

  // Fetch latest results from DB (all sessions)
  const { data: latestResults, refetch: refetchLatest } = useQuery({
    queryKey: ["pair-selector-latest"],
    queryFn: async () => {
      // Get latest scan batch per session
      const { data } = await supabase
        .from("session_pair_recommendations")
        .select("*")
        .order("scanned_at", { ascending: false })
        .limit(100);
      return (data as DbRecommendation[] | null) || [];
    },
  });

  // Group by session → latest batch only
  const latestBySession = useMemo(() => {
    if (!latestResults) return {};
    const grouped: Record<string, DbRecommendation[]> = {};
    const seenBatches: Record<string, string> = {};

    for (const rec of latestResults) {
      if (!seenBatches[rec.session]) {
        seenBatches[rec.session] = rec.scan_batch_id;
      }
      if (rec.scan_batch_id === seenBatches[rec.session]) {
        if (!grouped[rec.session]) grouped[rec.session] = [];
        grouped[rec.session].push(rec);
      }
    }
    return grouped;
  }, [latestResults]);

  // Get qualified + skipped for selected session
  const sessionData = latestBySession[session] || [];
  const qualifiedDb = sessionData.filter(r => r.is_qualified).sort((a, b) => a.rank - b.rank);
  const skippedDb = sessionData.filter(r => !r.is_qualified).sort((a, b) => b.total_score - a.total_score);
  const lastScanTime = sessionData[0]?.scanned_at;

  const runAnalysis = async () => {
    setIsRunning(true);
    setLiveResult(null);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 0.35, 95));
    }, 1000);

    try {
      const { data, error } = await supabase.functions.invoke("session-pair-selector", {
        body: { session, sendTelegram: true },
      });

      clearInterval(interval);
      setProgress(100);

      if (error) throw error;
      setLiveResult(data as ScanResult);
      refetchLatest();

      toast({
        title: "✅ Analysis Complete",
        description: `${data.qualified?.length || 0} pairs qualified — ${session}`,
      });
    } catch (err: any) {
      clearInterval(interval);
      setProgress(0);
      toast({
        title: "Error",
        description: err.message || "Analysis failed",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Decide what to show: live result or DB history
  const displayQualified: QualifiedPair[] = liveResult
    ? liveResult.qualified
    : qualifiedDb.map(r => ({
        pair: r.pair,
        direction: r.direction,
        score: r.total_score,
        differential: r.differential,
        bias4h: r.bias_4h,
        overextPct: r.overextension_pct.toFixed(2),
        adrRemaining: r.adr_remaining.toFixed(0),
        atrStatus: r.atr_status,
        reasoning: r.reasoning,
        rank: r.rank,
      }));

  const displaySkippedCount = liveResult ? liveResult.skipped_count : skippedDb.length;
  const displayCurrencyScores = liveResult?.currency_scores || null;
  const hasData = displayQualified.length > 0 || (liveResult && liveResult.pairs_analyzed > 0);

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* ===== HERO HEADER ===== */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${SESSION_COLORS[session]} border border-border/50 p-5`}>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{SESSION_ICONS[session]}</span>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  Pair Selector
                </h1>
                <p className="text-xs text-muted-foreground">
                  6-Layer Smart Analysis Engine
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span className="text-xs font-mono text-primary">v2.0</span>
            </div>
          </div>
          
          {lastScanTime && !liveResult && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last scan: {new Date(lastScanTime).toLocaleString("en-US", {
                month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
              })}
            </div>
          )}
        </div>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* ===== SESSION TABS + RUN ===== */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 flex gap-1 bg-card rounded-xl p-1 border border-border/50">
          {["Asian", "London", "New York"].map(s => (
            <button
              key={s}
              onClick={() => { setSession(s); setLiveResult(null); }}
              disabled={isRunning}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                session === s
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {SESSION_ICONS[s]} {s}
            </button>
          ))}
        </div>
        <Button
          onClick={runAnalysis}
          disabled={isRunning}
          size="sm"
          className="gap-1.5 rounded-xl shadow-lg shadow-primary/20 h-10 px-4"
        >
          {isRunning ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {isRunning ? "..." : "Run"}
        </Button>
      </div>

      {/* ===== PROGRESS BAR ===== */}
      {isRunning && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Activity className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-foreground font-medium">Analyzing 28 pairs...</span>
                  <span className="text-primary font-mono">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground pl-8">
              1H + 4H EMA200 → 6 Layer Filter → Score → Rank • ~5 min
            </p>
          </CardContent>
        </Card>
      )}

      {/* ===== CURRENCY STRENGTH STRIP ===== */}
      {displayCurrencyScores && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {Object.entries(displayCurrencyScores)
            .sort((a, b) => b[1] - a[1])
            .map(([currency, score]) => {
              const isStrong = score >= 4;
              const isWeak = score <= -4;
              return (
                <div
                  key={currency}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${
                    isStrong
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : isWeak
                      ? "bg-red-500/10 border-red-500/30 text-red-400"
                      : "bg-card border-border/50 text-muted-foreground"
                  }`}
                >
                  <span className="text-sm">{FLAGS[currency]}</span>
                  <span className="text-xs font-semibold">{currency}</span>
                  <span className={`text-xs font-bold font-mono ${
                    isStrong ? "text-emerald-400" : isWeak ? "text-red-400" : "text-foreground"
                  }`}>
                    {score > 0 ? "+" : ""}{score}
                  </span>
                </div>
              );
            })}
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      {hasData && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-card border border-border/50">
            <TabsTrigger value="results" className="flex-1 gap-1.5 text-xs">
              <Target className="h-3 w-3" /> Focus ({displayQualified.length})
            </TabsTrigger>
            <TabsTrigger value="skipped" className="flex-1 gap-1.5 text-xs">
              <XCircle className="h-3 w-3" /> Skipped ({displaySkippedCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="mt-3 space-y-3">
            {displayQualified.length === 0 ? (
              <EmptyQualified />
            ) : (
              displayQualified.slice(0, 4).map((pair, idx) => (
                <PremiumPairCard key={pair.pair} pair={pair} isTop={idx === 0} />
              ))
            )}
          </TabsContent>

          <TabsContent value="skipped" className="mt-3 space-y-2">
            {liveResult ? (
              <SkippedSummaryCard count={liveResult.skipped_count} />
            ) : (
              skippedDb.slice(0, 10).map(r => (
                <SkippedPairRow key={r.id} rec={r} />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* ===== ERRORS ===== */}
      {liveResult?.errors && liveResult.errors.length > 0 && (
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-orange-400 mb-1">
              ⚠️ {liveResult.errors.length} fetch errors
            </p>
            {liveResult.errors.slice(0, 3).map((e, i) => (
              <p key={i} className="text-[11px] text-muted-foreground truncate">{e}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ===== EMPTY STATE ===== */}
      {!hasData && !isRunning && (
        <div className="text-center py-16 space-y-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl scale-150" />
            <Target className="h-16 w-16 text-primary/30 relative" />
          </div>
          <div>
            <p className="text-foreground font-medium">Ready to Analyze</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[240px] mx-auto">
              Session select করো, তারপর <span className="text-primary font-medium">Run</span> press করো — 
              Top 3-4 pair BUY/SELL bias সহ পাবে
            </p>
          </div>
          <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> 6 Layers</span>
            <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> 28 Pairs</span>
            <span className="flex items-center gap-1"><Gauge className="h-3 w-3" /> 105 pts</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ====================================================================
// PREMIUM PAIR CARD
// ====================================================================
function PremiumPairCard({ pair, isTop }: { pair: QualifiedPair; isTop: boolean }) {
  const base = pair.pair.substring(0, 3);
  const quote = pair.pair.length >= 7 ? pair.pair.substring(4, 7) : pair.pair.substring(3, 6);
  const isBuy = pair.direction === "BUY";
  const scorePercent = Math.round((pair.score / 105) * 100);

  // Layer scores parsed from reasoning
  const layers = parseLayerScores(pair.reasoning);

  return (
    <Card className={`relative overflow-hidden border transition-all ${
      isTop
        ? isBuy
          ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 to-transparent shadow-lg shadow-emerald-500/10"
          : "border-red-500/40 bg-gradient-to-br from-red-500/5 to-transparent shadow-lg shadow-red-500/10"
        : "border-border/50"
    }`}>
      {/* Rank ribbon */}
      {isTop && (
        <div className={`absolute top-0 right-0 px-3 py-0.5 text-[10px] font-bold rounded-bl-lg ${
          isBuy ? "bg-emerald-500 text-black" : "bg-red-500 text-white"
        }`}>
          #1 PRIMARY
        </div>
      )}

      <CardContent className="p-4">
        {/* Row 1: Pair + Direction + Score */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Rank badge */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
              isBuy
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/15 text-red-400 border border-red-500/30"
            }`}>
              {pair.rank}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{FLAGS[base]}{FLAGS[quote]}</span>
                <span className="font-bold text-foreground text-lg tracking-tight">
                  {pair.pair.includes("/") ? pair.pair : `${base}/${quote}`}
                </span>
              </div>
            </div>
          </div>

          {/* Direction + Score */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
              isBuy
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}>
              {isBuy ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {pair.direction}
            </div>
          </div>
        </div>

        {/* Row 2: Score ring + Key metrics */}
        <div className="flex items-center gap-4 mb-4">
          {/* Score circle */}
          <div className="relative flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="hsl(var(--secondary))"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={isBuy ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)"}
                strokeWidth="3"
                strokeDasharray={`${scorePercent}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-sm font-bold ${isBuy ? "text-emerald-400" : "text-red-400"}`}>
                {pair.score}
              </span>
              <span className="text-[8px] text-muted-foreground">/ 105</span>
            </div>
          </div>

          {/* Key metrics grid */}
          <div className="flex-1 grid grid-cols-3 gap-2">
            <MetricBox
              label="Gap"
              value={`${pair.differential > 0 ? "+" : ""}${pair.differential}`}
              color={Math.abs(pair.differential) >= 7 ? "emerald" : Math.abs(pair.differential) >= 5 ? "blue" : "muted"}
            />
            <MetricBox
              label="ADR"
              value={`${pair.adrRemaining}%`}
              color={Number(pair.adrRemaining) >= 60 ? "emerald" : Number(pair.adrRemaining) >= 40 ? "amber" : "red"}
            />
            <MetricBox
              label="Ext"
              value={`${pair.overextPct}%`}
              color={Number(pair.overextPct) < 0.8 ? "emerald" : Number(pair.overextPct) < 1.5 ? "amber" : "red"}
            />
          </div>
        </div>

        {/* Row 3: 6-Layer bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>6 Layer Breakdown</span>
            <span className="font-mono">{pair.score}/105</span>
          </div>
          <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-secondary">
            <LayerSegment width={30} earned={layers.diff} color={isBuy ? "bg-emerald-500" : "bg-red-500"} />
            <LayerSegment width={25} earned={layers.bias} color="bg-blue-500" />
            <LayerSegment width={20} earned={layers.overext} color="bg-violet-500" />
            <LayerSegment width={15} earned={layers.structure} color="bg-amber-500" />
            <LayerSegment width={10} earned={layers.adr} color="bg-cyan-500" />
            <LayerSegment width={5} earned={layers.atr} color="bg-pink-500" />
          </div>
          <div className="flex gap-2 text-[9px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-0.5"><span className={`w-1.5 h-1.5 rounded-full ${isBuy ? "bg-emerald-500" : "bg-red-500"}`} /> Diff</span>
            <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> 4H</span>
            <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-violet-500" /> Ext</span>
            <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Struct</span>
            <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> ADR</span>
            <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-pink-500" /> ATR</span>
          </div>
        </div>

        {/* Row 4: Status badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <StatusBadge icon={<Shield className="h-2.5 w-2.5" />} label={`4H ${pair.bias4h}`} variant="success" />
          <StatusBadge
            icon={<Activity className="h-2.5 w-2.5" />}
            label={`ATR ${pair.atrStatus}`}
            variant={pair.atrStatus === "ACTIVE" ? "success" : pair.atrStatus === "NORMAL" ? "warning" : "danger"}
          />
          {isTop && (
            <StatusBadge icon={<Zap className="h-2.5 w-2.5" />} label="PRIMARY" variant="primary" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ====================================================================
// SUB-COMPONENTS
// ====================================================================

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    amber: "text-amber-400",
    red: "text-red-400",
    muted: "text-foreground",
  };
  return (
    <div className="text-center bg-secondary/50 rounded-lg p-1.5">
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold font-mono ${colorMap[color] || "text-foreground"}`}>{value}</p>
    </div>
  );
}

function LayerSegment({ width, earned, color }: { width: number; earned: boolean; color: string }) {
  return (
    <div
      className={`h-full transition-all ${earned ? color : "bg-transparent"}`}
      style={{ width: `${(width / 105) * 100}%` }}
    />
  );
}

function StatusBadge({ icon, label, variant }: { icon: React.ReactNode; label: string; variant: string }) {
  const styles: Record<string, string> = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    danger: "bg-red-500/10 text-red-400 border-red-500/20",
    primary: "bg-primary/10 text-primary border-primary/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${styles[variant] || styles.primary}`}>
      {icon} {label}
    </span>
  );
}

function EmptyQualified() {
  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardContent className="p-6 text-center">
        <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-amber-500/60" />
        <p className="text-sm font-medium text-foreground">কোনো Pair Qualify করেনি</p>
        <p className="text-xs text-muted-foreground mt-1">
          সব pair filtered out হয়েছে — Diff &lt; 5, 4H conflict, বা score &lt; 70
        </p>
        <p className="text-xs text-amber-400 mt-3 font-medium">
          ⏸ এই session এ trade নেওয়া safe না
        </p>
      </CardContent>
    </Card>
  );
}

function SkippedSummaryCard({ count }: { count: number }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 text-center">
        <XCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm text-foreground font-medium">{count} pairs skipped</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Differential &lt; 5 • 4H Conflict • Overextended • Low Score
        </p>
      </CardContent>
    </Card>
  );
}

function SkippedPairRow({ rec }: { rec: DbRecommendation }) {
  const base = rec.pair.substring(0, 3);
  const quote = rec.pair.length >= 6 ? rec.pair.substring(3, 6) : "???";

  // Determine primary skip reason
  const skipReason =
    rec.bias_4h === "CONFLICTING" ? "4H Conflict" :
    Math.abs(rec.differential) < 5 ? `Diff ${rec.differential}` :
    rec.total_score < 70 ? `Score ${rec.total_score}` :
    "Filtered";

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-card border border-border/30">
      <div className="flex items-center gap-2">
        <span className="text-xs">{FLAGS[base]}{FLAGS[quote]}</span>
        <span className="text-xs font-medium text-muted-foreground">
          {base}/{quote}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-mono">{rec.total_score}pts</span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-red-400/70 border-red-500/20">
          {skipReason}
        </Badge>
      </div>
    </div>
  );
}

// ====================================================================
// HELPERS
// ====================================================================

function parseLayerScores(reasoning: string): {
  diff: boolean; bias: boolean; overext: boolean;
  structure: boolean; adr: boolean; atr: boolean;
} {
  return {
    diff: reasoning.includes("Diff") && reasoning.includes("✅"),
    bias: reasoning.includes("aligned") && reasoning.includes("✅"),
    overext: reasoning.includes("Overext") && reasoning.includes("✅"),
    structure: reasoning.includes("structure") && reasoning.includes("✅"),
    adr: reasoning.includes("ADR") && reasoning.includes("✅"),
    atr: reasoning.includes("ATR") && reasoning.includes("✅"),
  };
}

export default PairSelector;
