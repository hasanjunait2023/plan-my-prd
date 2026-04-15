import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Brain, Play, Loader2, CheckCircle2, AlertTriangle, Clock, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TOTAL_PAIRS = 28;

const FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
  AUD: '🇦🇺', NZD: '🇳🇿', CAD: '🇨🇦', CHF: '🇨🇭',
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

export default function AiScanner() {
  const [timeframe, setTimeframe] = useState('1H');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [pairsScanned, setPairsScanned] = useState(0);
  const [lastPair, setLastPair] = useState('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { toast } = useToast();

  // Fetch latest scan history
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

  // Clean up realtime subscription on unmount
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

    // Subscribe to ai_scan_results inserts for real-time progress
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('scan-progress')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_scan_results',
        },
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
      // Edge function timeout — check if scan is still running via DB
      if (err.message?.includes('context canceled') || err.message?.includes('timed out')) {
        toast({
          title: 'Scan Running in Background',
          description: 'Edge function timed out but scan continues. Results will appear automatically.',
        });
        // Poll for completion
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
    // Poll every 10s for up to 6 minutes
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
        const now = Date.now();
        // If recorded within last 2 minutes, scan is done
        if (now - latestTime < 2 * 60 * 1000) {
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'STRONG': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'MID STRONG': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      case 'NEUTRAL': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'MID WEAK': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'WEAK': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 5) return 'text-emerald-400';
    if (score >= 1) return 'text-emerald-300';
    if (score === 0) return 'text-yellow-400';
    if (score >= -3) return 'text-orange-300';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Currency Scanner
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            EMA(200) Pure Math — 28 pairs currency strength analysis
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

              <Button
                onClick={runScan}
                disabled={scanning}
                className="gap-2"
                size="lg"
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Scan
                  </>
                )}
              </Button>
            </div>

            {/* Real-time Progress Bar */}
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
                  {lastPair && (
                    <span className="font-mono text-foreground/70">
                      Latest: {lastPair}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scan Result */}
      {scanResult && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Scan Result — {scanResult.timeframe}
              <Badge variant="outline" className="ml-2">
                {scanResult.pairs_scanned} pairs
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(scanResult.currencies)
                .sort(([, a], [, b]) => b.score - a.score)
                .map(([currency, { score, category }]) => (
                  <div
                    key={currency}
                    className="rounded-lg border p-3 bg-card/50 flex flex-col items-center gap-1"
                  >
                    <span className="text-2xl">{FLAGS[currency]}</span>
                    <span className="font-bold">{currency}</span>
                    <span className={`text-xl font-mono font-bold ${getScoreColor(score)}`}>
                      {score > 0 ? '+' : ''}{score}
                    </span>
                    <Badge variant="outline" className={getCategoryColor(category)}>
                      {category}
                    </Badge>
                  </div>
                ))}
            </div>

            {scanResult.errors && scanResult.errors.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-medium text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {scanResult.errors.length} errors during scan
                </p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  {scanResult.errors.map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Latest {timeframe} Scan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history && history.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Recorded: {new Date(history[0].recorded_at).toLocaleString()}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border p-3 bg-card/50 flex flex-col items-center gap-1"
                  >
                    <span className="text-xl">{FLAGS[item.currency]}</span>
                    <span className="font-semibold text-sm">{item.currency}</span>
                    <span className={`text-lg font-mono font-bold ${getScoreColor(item.strength)}`}>
                      {item.strength > 0 ? '+' : ''}{item.strength}
                    </span>
                    <Badge variant="outline" className={`text-xs ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </Badge>
                  </div>
                ))}
              </div>
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
