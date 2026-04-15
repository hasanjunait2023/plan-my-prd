import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Play, Loader2, AlertTriangle, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TOTAL_PAIRS = 28;

const FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
  AUD: '🇦🇺', NZD: '🇳🇿', CAD: '🇨🇦', CHF: '🇨🇭',
};

const FLAG_CODES: Record<string, string> = {
  USD: 'US', EUR: 'EU', GBP: 'GB', JPY: 'JP',
  AUD: 'AU', NZD: 'NZ', CAD: 'CA', CHF: 'CH',
};

interface CurrencyResult {
  score: number;
  category: string;
}

interface ScanResponse {
  success: boolean;
  scan_batch_id: string;
  timeframe: string;
  pairs_scanned: number;
  errors?: string[];
  currencies: Record<string, CurrencyResult>;
}

// Get bar gradient based on strength score (-7 to +7 range)
function getBarGradient(score: number): string {
  if (score >= 4) return 'from-emerald-500 to-emerald-400';
  if (score >= 2) return 'from-emerald-600 to-yellow-500';
  if (score >= 0) return 'from-yellow-500 to-yellow-400';
  if (score >= -2) return 'from-yellow-500 to-yellow-400';
  if (score >= -4) return 'from-yellow-500 to-orange-500';
  return 'from-orange-500 to-red-500';
}

function getBarWidth(score: number): number {
  // Map score from -7..+7 to 15%..85%
  const normalized = (score + 7) / 14;
  return Math.max(15, Math.min(85, normalized * 100));
}

function getCategoryStyle(category: string) {
  switch (category) {
    case 'STRONG': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    case 'MID STRONG': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    case 'NEUTRAL': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40';
    case 'MID WEAK': return 'bg-orange-500/15 text-orange-400 border-orange-500/40';
    case 'WEAK': return 'bg-red-500/15 text-red-400 border-red-500/40';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

function getRankColor(rank: number): string {
  if (rank <= 2) return 'text-emerald-400';
  if (rank <= 5) return 'text-yellow-400';
  if (rank <= 7) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreColor(score: number): string {
  if (score >= 4) return 'text-emerald-400';
  if (score >= 1) return 'text-emerald-300';
  if (score === 0) return 'text-yellow-400';
  if (score >= -3) return 'text-orange-400';
  return 'text-red-400';
}

interface StrengthRowProps {
  rank: number;
  currency: string;
  score: number;
  category: string;
  prevScore?: number;
}

function StrengthRow({ rank, currency, score, category, prevScore }: StrengthRowProps) {
  const change = prevScore !== undefined ? score - prevScore : undefined;
  const isUp = change !== undefined && change > 0;
  const isDown = change !== undefined && change < 0;

  return (
    <div className="flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
      {/* Rank */}
      <span className={`text-lg font-bold w-6 text-center ${getRankColor(rank)}`}>
        {rank}
      </span>

      {/* Flag + Currency */}
      <div className="flex items-center gap-2 w-20">
        <span className="text-sm font-bold text-muted-foreground">{FLAG_CODES[currency]}</span>
        <span className="font-bold text-foreground">{currency}</span>
      </div>

      {/* Bar */}
      <div className="flex-1 h-8 bg-white/[0.03] rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getBarGradient(score)} transition-all duration-700 ease-out shadow-lg`}
          style={{ width: `${getBarWidth(score)}%` }}
        />
      </div>

      {/* Score */}
      <span className={`font-mono font-bold text-lg w-10 text-right ${getScoreColor(score)}`}>
        {score > 0 ? '+' : ''}{score}
      </span>

      {/* Change badge */}
      <div className="w-10 flex justify-center">
        {change !== undefined && change !== 0 ? (
          <Badge variant="outline" className={`text-xs px-1.5 py-0 font-mono ${
            isUp ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'
          }`}>
            {isUp ? '↑' : '↓'}{Math.abs(change)}
          </Badge>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </div>

      {/* Arrow */}
      <div className="w-5 flex justify-center">
        {isUp && <TrendingUp className="h-4 w-4 text-emerald-400" />}
        {isDown && <TrendingDown className="h-4 w-4 text-red-400" />}
        {!isUp && !isDown && <Minus className="h-3 w-3 text-muted-foreground/30" />}
      </div>

      {/* Category */}
      <Badge variant="outline" className={`text-xs font-semibold min-w-[80px] justify-center ${getCategoryStyle(category)}`}>
        {category}
      </Badge>
    </div>
  );
}

export default function AiScanner() {
  const [timeframe, setTimeframe] = useState('1H');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [pairsScanned, setPairsScanned] = useState(0);
  const [lastPair, setLastPair] = useState('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { toast } = useToast();

  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ['ai-scan-history', timeframe],
    queryFn: async () => {
      const { data } = await supabase
        .from('currency_strength')
        .select('*')
        .eq('timeframe', timeframe)
        .order('recorded_at', { ascending: false })
        .limit(8);
      return data || [];
    },
  });

  // Fetch previous scan for change comparison
  const { data: prevHistory } = useQuery({
    queryKey: ['ai-scan-prev', timeframe],
    queryFn: async () => {
      // Get the second latest batch
      const { data: batches } = await supabase
        .from('currency_strength')
        .select('recorded_at')
        .eq('timeframe', timeframe)
        .order('recorded_at', { ascending: false })
        .limit(16);

      if (!batches || batches.length < 9) return [];

      const prevTime = batches[8]?.recorded_at;
      if (!prevTime) return [];

      const { data } = await supabase
        .from('currency_strength')
        .select('*')
        .eq('timeframe', timeframe)
        .eq('recorded_at', prevTime);

      return data || [];
    },
  });

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const runScan = async () => {
    setScanning(true);
    setScanResult(null);
    setPairsScanned(0);
    setLastPair('');

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('scan-progress')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_scan_results' },
        (payload) => {
          setPairsScanned((prev) => prev + 1);
          setLastPair(payload.new.pair || '');
        }
      )
      .subscribe();

    channelRef.current = channel;

    try {
      const { data, error } = await supabase.functions.invoke('ai-currency-scanner', {
        body: { action: 'scan', timeframe },
      });
      if (error) throw error;
      setScanResult(data as ScanResponse);
      setPairsScanned(data.pairs_scanned || TOTAL_PAIRS);
      refetchHistory();
      toast({ title: 'Scan Complete ✅', description: `${data.pairs_scanned} pairs analyzed for ${timeframe}` });
    } catch (err: any) {
      if (err.message?.includes('context canceled') || err.message?.includes('timed out')) {
        toast({ title: 'Scan Running in Background', description: 'Results will appear automatically.' });
        pollForResults();
        return;
      }
      toast({ title: 'Scan Failed', description: err.message, variant: 'destructive' });
      setScanning(false);
    } finally {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setScanning(false);
    }
  };

  const pollForResults = async () => {
    for (let i = 0; i < 36; i++) {
      await new Promise((r) => setTimeout(r, 10000));
      const { data } = await supabase
        .from('currency_strength')
        .select('*')
        .eq('timeframe', timeframe)
        .order('recorded_at', { ascending: false })
        .limit(8);

      if (data && data.length > 0) {
        const latestTime = new Date(data[0].recorded_at).getTime();
        if (Date.now() - latestTime < 2 * 60 * 1000) {
          refetchHistory();
          setPairsScanned(TOTAL_PAIRS);
          toast({ title: 'Scan Complete ✅', description: `Results ready for ${timeframe}` });
          break;
        }
      }
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setScanning(false);
  };

  const progressPercent = Math.round((pairsScanned / TOTAL_PAIRS) * 100);

  // Build previous score map
  const prevScoreMap = new Map<string, number>();
  prevHistory?.forEach((item) => prevScoreMap.set(item.currency, item.strength));

  // Sort history by strength descending for ranking
  const sortedHistory = history ? [...history].sort((a, b) => b.strength - a.strength) : [];

  // Sort scan result currencies
  const sortedScanCurrencies = scanResult
    ? Object.entries(scanResult.currencies).sort(([, a], [, b]) => b.score - a.score)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            FX Currency Strength
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            EMA(200) Pure Math — No AI
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-row gap-3 items-center">
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1H">1H</SelectItem>
                  <SelectItem value="15M">15M</SelectItem>
                  <SelectItem value="3M">3M</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={runScan} disabled={scanning} className="gap-2" size="lg">
                {scanning ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Scanning...</>
                ) : (
                  <><Play className="h-4 w-4" />Run Scan</>
                )}
              </Button>
            </div>

            {scanning && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
                    Scanning pairs...
                  </span>
                  <span className="font-mono font-semibold text-primary">
                    {pairsScanned}/{TOTAL_PAIRS}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-3" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{progressPercent}% complete</span>
                  {lastPair && <span className="font-mono text-foreground/70">Latest: {lastPair}</span>}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scan Result - Strength Ranking */}
      {scanResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Strength Ranking
              <Badge variant="outline" className="ml-auto text-xs text-muted-foreground">
                {scanResult.timeframe} • {scanResult.pairs_scanned} pairs
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-4">
            <div className="divide-y divide-white/[0.04]">
              {sortedScanCurrencies.map(([currency, { score, category }], i) => (
                <StrengthRow
                  key={currency}
                  rank={i + 1}
                  currency={currency}
                  score={score}
                  category={category}
                  prevScore={prevScoreMap.get(currency)}
                />
              ))}
            </div>

            {scanResult.errors && scanResult.errors.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-medium text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {scanResult.errors.length} errors during scan
                </p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  {scanResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History - Strength Ranking */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Strength Ranking
            {history && history.length > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {new Date(history[0].recorded_at).toLocaleString()}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-4">
          {sortedHistory.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {sortedHistory.map((item, i) => (
                <StrengthRow
                  key={item.id}
                  rank={i + 1}
                  currency={item.currency}
                  score={item.strength}
                  category={item.category}
                  prevScore={prevScoreMap.get(item.currency)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No scan data yet for {timeframe}. Run a scan to see results.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
