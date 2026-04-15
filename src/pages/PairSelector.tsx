import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Play, TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle2, XCircle, BarChart3 } from "lucide-react";
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

const PairSelector = () => {
  const [session, setSession] = useState("London");
  const [isRunning, setIsRunning] = useState(false);
  const [liveResult, setLiveResult] = useState<ScanResult | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Fetch latest history from DB
  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ["pair-selector-history", session],
    queryFn: async () => {
      const { data } = await supabase
        .from("session_pair_recommendations")
        .select("*")
        .eq("session", session)
        .eq("is_qualified", true)
        .order("scanned_at", { ascending: false })
        .limit(20);
      return (data as DbRecommendation[] | null) || [];
    },
  });

  const runAnalysis = async () => {
    setIsRunning(true);
    setLiveResult(null);
    setProgress(0);

    // Simulate progress (actual run takes ~5 min)
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 1, 95));
    }, 3200); // ~5 min to reach 95%

    try {
      const { data, error } = await supabase.functions.invoke("session-pair-selector", {
        body: { session, sendTelegram: true },
      });

      clearInterval(interval);
      setProgress(100);

      if (error) throw error;
      setLiveResult(data as ScanResult);
      refetchHistory();

      toast({
        title: "Analysis Complete ✅",
        description: `${data.qualified?.length || 0} pairs qualified out of ${data.pairs_analyzed}`,
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

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 70) return "text-emerald-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getAtrBadge = (status: string) => {
    switch (status) {
      case "ACTIVE": return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">ACTIVE</Badge>;
      case "NORMAL": return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">NORMAL</Badge>;
      case "SLEEPING": return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">SLEEPING</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Group history by scan_batch_id
  const historyBatches = history?.reduce((acc, rec) => {
    if (!acc[rec.scan_batch_id]) acc[rec.scan_batch_id] = [];
    acc[rec.scan_batch_id].push(rec);
    return acc;
  }, {} as Record<string, DbRecommendation[]>);

  return (
    <div className="space-y-6 p-4 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">🎯 Pair Selector</h1>
        <p className="text-sm text-muted-foreground mt-1">
          6-Layer Analysis — Session শুরুতে Top 3-4 pair BUY/SELL bias সহ
        </p>
      </div>

      {/* Controls */}
      <Card className="border-primary/20">
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Session</label>
              <Select value={session} onValueChange={setSession} disabled={isRunning}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asian">🌏 Asian (5AM-9AM BDT)</SelectItem>
                  <SelectItem value="London">🇪🇺 London (1PM-5PM BDT)</SelectItem>
                  <SelectItem value="New York">🇺🇸 New York (6PM-10PM BDT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runAnalysis} disabled={isRunning} className="gap-2">
              <Play className="h-4 w-4" />
              {isRunning ? "Analyzing..." : "Run Analysis"}
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>28 pairs × 2 timeframes scanning...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">⏱ ~5 min লাগবে (56 API calls)</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Results */}
      {liveResult && (
        <div className="space-y-4">
          {/* Currency Scores Summary */}
          {liveResult.currency_scores && (
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Currency Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(liveResult.currency_scores)
                    .sort((a, b) => b[1] - a[1])
                    .map(([currency, score]) => (
                      <div key={currency} className="text-center p-2 rounded-lg bg-muted/50">
                        <span className="text-lg">{FLAGS[currency]}</span>
                        <p className="text-xs font-medium">{currency}</p>
                        <p className={`text-sm font-bold ${score >= 4 ? "text-green-400" : score <= -4 ? "text-red-400" : "text-muted-foreground"}`}>
                          {score > 0 ? "+" : ""}{score}
                        </p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Qualified Pairs */}
          <div>
            <h2 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Qualified Pairs ({liveResult.qualified.length})
            </h2>
            {liveResult.qualified.length === 0 ? (
              <Card className="border-yellow-500/30">
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  কোনো pair qualify করেনি। সব pair filtered out হয়েছে।
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {liveResult.qualified.slice(0, 4).map((pair) => (
                  <QualifiedPairCard key={pair.pair} pair={pair} getScoreColor={getScoreColor} getAtrBadge={getAtrBadge} />
                ))}
              </div>
            )}
          </div>

          {/* Skipped Summary */}
          <Card className="border-red-500/20">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-red-400">
                <XCircle className="h-4 w-4" />
                Skipped: {liveResult.skipped_count} pairs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-xs text-muted-foreground">
                Differential &lt; 5, 4H conflict, overextended, বা score &lt; 70 এর কারণে skip হয়েছে।
              </p>
            </CardContent>
          </Card>

          {/* Errors */}
          {liveResult.errors && liveResult.errors.length > 0 && (
            <Card className="border-orange-500/20">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-orange-400 mb-1">⚠️ Errors ({liveResult.errors.length}):</p>
                {liveResult.errors.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{e}</p>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* History */}
      {!liveResult && historyBatches && Object.keys(historyBatches).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Previous Scans
          </h2>
          <div className="space-y-3">
            {Object.entries(historyBatches).slice(0, 3).map(([batchId, recs]) => (
              <Card key={batchId} className="border-muted">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(recs[0].scanned_at).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </span>
                    <Badge variant="outline" className="text-xs">{recs.length} qualified</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recs.sort((a, b) => a.rank - b.rank).map(r => (
                      <Badge
                        key={r.id}
                        className={r.direction === "BUY"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                        }
                      >
                        {r.direction === "BUY" ? "📈" : "📉"} {r.pair} ({r.total_score})
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!liveResult && (!history || history.length === 0) && !isRunning && (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">
            Session select করে "Run Analysis" press করো
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            6-layer analysis চালিয়ে Top 3-4 pair recommend করবে
          </p>
        </div>
      )}
    </div>
  );
};

// ====== Qualified Pair Card ======
function QualifiedPairCard({
  pair,
  getScoreColor,
  getAtrBadge,
}: {
  pair: QualifiedPair;
  getScoreColor: (s: number) => string;
  getAtrBadge: (s: string) => React.ReactNode;
}) {
  const base = pair.pair.substring(0, 3);
  const quote = pair.pair.length >= 7 ? pair.pair.substring(4, 7) : pair.pair.substring(3, 6);

  return (
    <Card className={`border-l-4 ${pair.direction === "BUY" ? "border-l-green-500" : "border-l-red-500"}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{FLAGS[base]}{FLAGS[quote]}</span>
            <div>
              <p className="font-bold text-foreground">{pair.pair}</p>
              <p className="text-xs text-muted-foreground">#{pair.rank}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={pair.direction === "BUY"
              ? "bg-green-500/20 text-green-400 border-green-500/40"
              : "bg-red-500/20 text-red-400 border-red-500/40"
            }>
              {pair.direction === "BUY" ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {pair.direction}
            </Badge>
            <span className={`text-lg font-bold ${getScoreColor(pair.score)}`}>
              {pair.score}
            </span>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div className="bg-muted/50 rounded p-2">
            <p className="text-xs text-muted-foreground">Differential</p>
            <p className={`text-sm font-bold ${pair.differential > 0 ? "text-green-400" : "text-red-400"}`}>
              {pair.differential > 0 ? "+" : ""}{pair.differential}
            </p>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <p className="text-xs text-muted-foreground">ADR Left</p>
            <p className="text-sm font-bold text-foreground">{pair.adrRemaining}%</p>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <p className="text-xs text-muted-foreground">Overext</p>
            <p className="text-sm font-bold text-foreground">{pair.overextPct}%</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
            4H {pair.bias4h}
          </Badge>
          {getAtrBadge(pair.atrStatus)}
        </div>

        {/* Score bar */}
        <div className="mt-3">
          <Progress value={(pair.score / 105) * 100} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-1">{pair.score}/105 pts</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default PairSelector;
