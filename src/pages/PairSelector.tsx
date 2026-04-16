import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Play, Clock, AlertTriangle,
  XCircle, Target, Shield, Zap, Gauge, Layers,
  ArrowUpRight, ArrowDownRight, Activity,
  RefreshCw, History, Download, FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

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
            <TabsTrigger value="history" className="flex-1 gap-1.5 text-xs">
              <History className="h-3 w-3" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="mt-3 space-y-3">
            {displayQualified.length === 0 ? (
              <EmptyQualified />
            ) : (
              <>
                <PriorityBrief pairs={displayQualified} />
                {displayQualified.slice(0, 4).map((pair, idx) => (
                  <PremiumPairCard key={pair.pair} pair={pair} isTop={idx === 0} />
                ))}
              </>
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

          <TabsContent value="history" className="mt-3">
            <ScanHistoryPanel />
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
// PRIORITY BRIEF — BUY vs SELL split, ranked by priority
// ====================================================================
function PriorityBrief({ pairs }: { pairs: QualifiedPair[] }) {
  const top4 = [...pairs].sort((a, b) => a.rank - b.rank).slice(0, 4);

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
        <Target className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-bold text-foreground tracking-wide uppercase">Top Priority</span>
      </div>
      <div className="px-4 py-2.5 space-y-1">
        {top4.map(p => {
          const base = p.pair.substring(0, 3);
          const quote = p.pair.length >= 7 ? p.pair.substring(4, 7) : p.pair.substring(3, 6);
          const isBuy = p.direction === "BUY";
          return (
            <div key={p.pair} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                  isBuy ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                }`}>
                  {p.rank}
                </span>
                <span className="text-xs">{FLAGS[base]}{FLAGS[quote]}</span>
                <span className="text-sm font-semibold text-foreground">{base}/{quote}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  isBuy ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                }`}>
                  {p.direction}
                </span>
                <span className={`text-xs font-bold font-mono ${isBuy ? "text-emerald-400" : "text-red-400"}`}>
                  {p.score}<span className="text-muted-foreground text-[9px]">/105</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ====================================================================
// PREMIUM PAIR CARD — Simplified
// ====================================================================
function PremiumPairCard({ pair, isTop }: { pair: QualifiedPair; isTop: boolean }) {
  const base = pair.pair.substring(0, 3);
  const quote = pair.pair.length >= 7 ? pair.pair.substring(4, 7) : pair.pair.substring(3, 6);
  const isBuy = pair.direction === "BUY";
  const [expanded, setExpanded] = useState(false);
  const tvSymbol = `FX:${base}${quote}`;

  return (
    <>
      <Card className={`relative overflow-hidden border transition-all ${
        isTop
          ? isBuy
            ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 to-transparent shadow-lg shadow-emerald-500/10"
            : "border-red-500/40 bg-gradient-to-br from-red-500/5 to-transparent shadow-lg shadow-red-500/10"
          : "border-border/50"
      }`}>
        <CardContent className="p-0">
          {/* Header strip */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                isBuy
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/15 text-red-400 border border-red-500/30"
              }`}>
                {pair.rank}
              </div>
              <span className="text-sm">{FLAGS[base]}{FLAGS[quote]}</span>
              <span className="font-bold text-foreground text-base tracking-tight">
                {base}/{quote}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                isBuy
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}>
                {isBuy ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {pair.direction}
              </div>
              <span className={`text-sm font-bold font-mono ${isBuy ? "text-emerald-400" : "text-red-400"}`}>
                {pair.score}<span className="text-muted-foreground text-[10px]">/105</span>
              </span>
            </div>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-4 gap-px bg-border/30 border-y border-border/30">
            <MetricCell label="Diff" value={`${pair.differential > 0 ? "+" : ""}${pair.differential}`} accent={pair.differential >= 8 ? "green" : pair.differential >= 5 ? "yellow" : "muted"} />
            <MetricCell label="4H Bias" value={pair.bias4h} accent={pair.bias4h === "ALIGNED" ? "green" : pair.bias4h === "CONFLICTING" ? "red" : "muted"} />
            <MetricCell label="ADR Left" value={`${pair.adrRemaining}%`} accent={Number(pair.adrRemaining) >= 60 ? "green" : Number(pair.adrRemaining) >= 30 ? "yellow" : "red"} />
            <MetricCell label="ATR" value={pair.atrStatus} accent={pair.atrStatus === "NORMAL" ? "green" : pair.atrStatus === "HIGH" ? "yellow" : "red"} />
          </div>

          {/* Overext + Reasoning */}
          <div className="px-4 py-2 flex items-center justify-between border-b border-border/20">
            <span className="text-[10px] text-muted-foreground">
              Overext: <span className={`font-mono font-medium ${Number(pair.overextPct) > 85 ? "text-red-400" : "text-foreground"}`}>{pair.overextPct}%</span>
            </span>
            {pair.reasoning && (
              <span className="text-[10px] text-muted-foreground/70 truncate max-w-[55%] text-right">
                {pair.reasoning}
              </span>
            )}
          </div>

          {/* Live TradingView Chart */}
          <div
            className="cursor-pointer"
            onClick={() => setExpanded(true)}
          >
            <LiveAdvancedChart symbol={tvSymbol} height={450} />
          </div>
        </CardContent>
      </Card>

      {/* Expanded full-screen dialog */}
      {expanded && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-sm">{FLAGS[base]}{FLAGS[quote]}</span>
              <span className="font-bold text-foreground">{base}/{quote}</span>
              <Badge className={isBuy ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                {pair.direction}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
              ✕
            </Button>
          </div>
          <div className="flex-1">
            <LiveAdvancedChart symbol={tvSymbol} height="100%" />
          </div>
        </div>
      )}
    </>
  );
}

// ====================================================================
// LIVE ADVANCED CHART (EMA 9/15/200 + RSI, 15min)
// ====================================================================
function LiveAdvancedChart({ symbol, height }: { symbol: string; height: number | string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container";
    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";

    const widgetInner = document.createElement("div");
    widgetInner.className = "tradingview-widget-container__widget";
    widgetInner.style.height = "100%";
    widgetInner.style.width = "100%";
    widgetContainer.appendChild(widgetInner);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      symbol,
      interval: "15",
      theme: "dark",
      style: "1",
      locale: "en",
      timezone: "Etc/UTC",
      studies: [
        { id: "MAExp@tv-basicstudies", inputs: { length: 9 } },
        { id: "MAExp@tv-basicstudies", inputs: { length: 15 } },
        { id: "MAExp@tv-basicstudies", inputs: { length: 200 } },
        { id: "RSI@tv-basicstudies" },
      ],
      hide_top_toolbar: true,
      hide_legend: false,
      enable_publishing: false,
      withdateranges: false,
      hide_side_toolbar: true,
      details: false,
      calendar: false,
      show_popup_button: true,
      popup_width: "1200",
      popup_height: "800",
      allow_symbol_change: false,
      save_image: true,
      width: "100%",
      height: "100%",
      support_host: "https://www.tradingview.com",
    });

    widgetContainer.appendChild(script);
    containerRef.current.appendChild(widgetContainer);
  }, [symbol]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{ height: typeof height === "number" ? `${height}px` : height }}
    />
  );
}

// ====================================================================
// SCAN HISTORY PANEL — Filter by date/session + CSV export
// ====================================================================
function ScanHistoryPanel() {
  const [filterSession, setFilterSession] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [onlyQualified, setOnlyQualified] = useState(false);

  const { data: historyData, isLoading } = useQuery({
    queryKey: ["pair-selector-history", filterSession, filterDate],
    queryFn: async () => {
      let query = supabase
        .from("session_pair_recommendations")
        .select("*")
        .order("scanned_at", { ascending: false })
        .limit(500);

      if (filterSession !== "all") {
        query = query.eq("session", filterSession);
      }
      if (filterDate) {
        query = query.gte("scanned_at", `${filterDate}T00:00:00Z`).lte("scanned_at", `${filterDate}T23:59:59Z`);
      }

      const { data } = await query;
      return (data as DbRecommendation[] | null) || [];
    },
  });

  const displayData = useMemo(() => {
    if (!historyData) return [];
    return onlyQualified ? historyData.filter(r => r.is_qualified) : historyData;
  }, [historyData, onlyQualified]);

  // Group by scan batch for display
  const groupedByBatch = useMemo(() => {
    const groups: Record<string, { session: string; scannedAt: string; items: DbRecommendation[] }> = {};
    for (const rec of displayData) {
      if (!groups[rec.scan_batch_id]) {
        groups[rec.scan_batch_id] = { session: rec.session, scannedAt: rec.scanned_at, items: [] };
      }
      groups[rec.scan_batch_id].items.push(rec);
    }
    return Object.entries(groups).sort((a, b) => b[1].scannedAt.localeCompare(a[1].scannedAt));
  }, [displayData]);

  const exportCSV = useCallback(() => {
    if (!displayData.length) return;
    const headers = ["Scan Time", "Session", "Pair", "Direction", "Score", "Rank", "Qualified", "Differential", "4H Bias", "ADR Remaining %", "ATR Status", "Overextension %", "Reasoning"];
    const rows = displayData.map(r => [
      new Date(r.scanned_at).toLocaleString(),
      r.session,
      r.pair,
      r.direction,
      r.total_score,
      r.rank,
      r.is_qualified ? "YES" : "NO",
      r.differential,
      r.bias_4h,
      r.adr_remaining.toFixed(0),
      r.atr_status,
      r.overextension_pct.toFixed(2),
      `"${r.reasoning.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PairSelector_History_${filterSession}_${filterDate || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [displayData, filterSession, filterDate]);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={filterSession} onValueChange={setFilterSession}>
          <SelectTrigger className="w-[120px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            <SelectItem value="Asian">🌏 Asian</SelectItem>
            <SelectItem value="London">🏰 London</SelectItem>
            <SelectItem value="New York">🗽 New York</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="w-[150px] h-9 text-xs"
          placeholder="Filter by date"
        />
        <Button
          variant={onlyQualified ? "default" : "outline"}
          size="sm"
          className="h-9 text-xs gap-1"
          onClick={() => setOnlyQualified(!onlyQualified)}
        >
          <Target className="h-3 w-3" />
          Qualified Only
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs gap-1 ml-auto"
          onClick={exportCSV}
          disabled={!displayData.length}
        >
          <Download className="h-3 w-3" />
          CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 text-[11px] text-muted-foreground">
        <span>{displayData.length} records</span>
        <span>{groupedByBatch.length} scans</span>
        <span>{displayData.filter(r => r.is_qualified).length} qualified</span>
      </div>

      {/* Results by batch */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading history...</div>
      ) : groupedByBatch.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">কোনো scan history নেই</div>
      ) : (
        <div className="space-y-3">
          {groupedByBatch.map(([batchId, batch]) => {
            const qualified = batch.items.filter(r => r.is_qualified).sort((a, b) => a.rank - b.rank);
            const skipped = batch.items.filter(r => !r.is_qualified);
            return (
              <Card key={batchId} className="border-border/50">
                <CardContent className="p-3 space-y-2">
                  {/* Batch header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{SESSION_ICONS[batch.session]}</span>
                      <span className="text-xs font-semibold text-foreground">{batch.session}</span>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {qualified.length} qualified
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(batch.scannedAt).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Qualified pairs */}
                  {qualified.map(r => {
                    const base = r.pair.substring(0, 3);
                    const quote = r.pair.length >= 6 ? r.pair.substring(3, 6) : "???";
                    const isBuy = r.direction === "BUY";
                    return (
                      <div key={r.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-secondary/30 border border-border/20">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground w-4">#{r.rank}</span>
                          <span className="text-xs">{FLAGS[base]}{FLAGS[quote]}</span>
                          <span className="text-xs font-medium text-foreground">{base}/{quote}</span>
                          <Badge className={`text-[9px] px-1.5 py-0 h-4 ${isBuy ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                            {r.direction}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <span className={isBuy ? "text-emerald-400" : "text-red-400"}>{r.total_score}</span>
                          <span className="text-muted-foreground">D{r.differential > 0 ? "+" : ""}{r.differential}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Skipped count */}
                  {skipped.length > 0 && (
                    <p className="text-[10px] text-muted-foreground/60 pl-2">
                      + {skipped.length} skipped pairs
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ====================================================================
// METRIC CELL
// ====================================================================
function MetricCell({ label, value, accent }: { label: string; value: string; accent: "green" | "yellow" | "red" | "muted" }) {
  const colors = {
    green: "text-emerald-400",
    yellow: "text-amber-400",
    red: "text-red-400",
    muted: "text-muted-foreground",
  };
  return (
    <div className="bg-card/50 px-2.5 py-2 text-center">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">{label}</p>
      <p className={`text-xs font-bold font-mono ${colors[accent]}`}>{value}</p>
    </div>
  );
}

// ====================================================================
// REMAINING SUB-COMPONENTS
// ====================================================================

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

export default PairSelector;
