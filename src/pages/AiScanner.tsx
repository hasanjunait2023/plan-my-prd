import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Loader2, AlertTriangle, Activity, TrendingUp, TrendingDown, Minus, RefreshCw, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { MARKET_SESSIONS, getSessionHours, isSessionActive } from '@/lib/timezone';

const TOTAL_PAIRS = 28;

const FLAG_CODES: Record<string, string> = {
  USD: 'US', EUR: 'EU', GBP: 'GB', JPY: 'JP',
  AUD: 'AU', NZD: 'NZ', CAD: 'CA', CHF: 'CH',
};

// --- Utility functions ---

function getBarGradient(score: number): string {
  if (score >= 4) return 'from-emerald-500 to-emerald-400';
  if (score >= 2) return 'from-emerald-600 to-yellow-500';
  if (score >= 0) return 'from-yellow-500 to-yellow-400';
  if (score >= -2) return 'from-yellow-500 to-yellow-400';
  if (score >= -4) return 'from-yellow-500 to-orange-500';
  return 'from-orange-500 to-red-500';
}

function getBarWidth(score: number): number {
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

function getDefaultTab(): string {
  const now = new Date();
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const sessions = MARKET_SESSIONS.map(s => ({
    name: s.name,
    ...getSessionHours(s, now),
  }));
  const active = sessions.filter(s => isSessionActive(s.start, s.end, h, m));
  const priority = ['New York', 'London', 'Tokyo', 'Sydney'];
  for (const p of priority) {
    if (active.some(a => a.name === p)) {
      if (p === 'New York') return 'New York';
      if (p === 'London') return 'London';
      return 'Asian';
    }
  }
  return 'London';
}

// Map session tab to timeframe values stored in currency_strength
function getTimeframeVariants(session: string): string[] {
  switch (session) {
    case 'New York': return ['New York', 'Strength On New York'];
    case 'London': return ['1H'];
    case 'Asian': return ['Asian', '1H_Asian'];
    default: return ['1H'];
  }
}

// Map session tab to the timeframe param for edge function
function getEdgeFunctionTimeframe(session: string): string {
  switch (session) {
    case 'New York': return '1H';
    case 'London': return '1H';
    case 'Asian': return '1H';
    default: return '1H';
  }
}

const UTC_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatUtcTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = UTC_MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours24 = date.getUTCHours();
  const hours12 = String(((hours24 + 11) % 12) + 1).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  return `${day} ${month} ${year}, ${hours12}:${minutes} ${meridiem}`;
}

// --- Hooks ---

function useSessionStrength(session: string, selectedDate: Date) {
  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const timeframeVariants = getTimeframeVariants(session);

  return useQuery({
    queryKey: ['ai-scanner-strength', session, dateKey],
    queryFn: async () => {
      const dayStart = `${dateKey}T00:00:00.000Z`;
      const dayEnd = `${dateKey}T23:59:59.999Z`;
      const { data, error } = await supabase
        .from('currency_strength')
        .select('*')
        .in('timeframe', timeframeVariants)
        .gte('recorded_at', dayStart)
        .lte('recorded_at', dayEnd)
        .order('recorded_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const latestTime = data[0].recorded_at;
      return data.filter(r => r.recorded_at === latestTime);
    },
    refetchInterval: 60000,
  });
}

function usePreviousSession(session: string, selectedDate: Date) {
  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const lookbackKey = format(subDays(selectedDate, 7), 'yyyy-MM-dd');

  // Get the "opposite" session for comparison
  const oppositeVariants = session === 'New York'
    ? ['1H']
    : session === 'London'
      ? ['New York', 'Strength On New York']
      : ['1H']; // Asian compares to London

  return useQuery({
    queryKey: ['ai-scanner-prev', session, dateKey],
    queryFn: async () => {
      const rangeStart = `${lookbackKey}T00:00:00.000Z`;
      const rangeEnd = `${dateKey}T23:59:59.999Z`;
      const { data, error } = await supabase
        .from('currency_strength')
        .select('*')
        .in('timeframe', oppositeVariants)
        .gte('recorded_at', rangeStart)
        .lte('recorded_at', rangeEnd)
        .order('recorded_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const latestTime = data[0].recorded_at;
      return data.filter(r => r.recorded_at === latestTime);
    },
  });
}

// --- Components ---

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
      <span className={`text-lg font-bold w-6 text-center ${getRankColor(rank)}`}>{rank}</span>
      <div className="flex items-center gap-2 w-20">
        <span className="text-sm font-bold text-muted-foreground">{FLAG_CODES[currency]}</span>
        <span className="font-bold text-foreground">{currency}</span>
      </div>
      <div className="flex-1 h-8 bg-white/[0.03] rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getBarGradient(score)} transition-all duration-700 ease-out shadow-lg`}
          style={{ width: `${getBarWidth(score)}%` }}
        />
      </div>
      <span className={`font-mono font-bold text-lg w-10 text-right ${getScoreColor(score)}`}>
        {score > 0 ? '+' : ''}{score}
      </span>
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
      <div className="w-5 flex justify-center">
        {isUp && <TrendingUp className="h-4 w-4 text-emerald-400" />}
        {isDown && <TrendingDown className="h-4 w-4 text-red-400" />}
        {!isUp && !isDown && <Minus className="h-3 w-3 text-muted-foreground/30" />}
      </div>
      <Badge variant="outline" className={`text-xs font-semibold min-w-[80px] justify-center ${getCategoryStyle(category)}`}>
        {category}
      </Badge>
    </div>
  );
}

// --- Main ---

export default function AiScanner() {
  const [activeTab, setActiveTab] = useState(getDefaultTab);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [scanning, setScanning] = useState(false);
  const [pairsScanned, setPairsScanned] = useState(0);
  const [lastPair, setLastPair] = useState('');
  const [scanErrors, setScanErrors] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useSessionStrength(activeTab, selectedDate);
  const { data: prevData } = usePreviousSession(activeTab, selectedDate);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('ai-scanner-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'currency_strength',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['ai-scanner-strength'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Cleanup scan channel on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const runScan = async () => {
    setScanning(true);
    setPairsScanned(0);
    setLastPair('');
    setScanErrors([]);

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel('scan-progress')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_scan_results' },
        (payload) => {
          setPairsScanned(prev => prev + 1);
          setLastPair(payload.new.pair || '');
        }
      )
      .subscribe();
    channelRef.current = channel;

    try {
      const { data: result, error } = await supabase.functions.invoke('ai-currency-scanner', {
        body: { action: 'scan', timeframe: getEdgeFunctionTimeframe(activeTab), session: activeTab },
      });
      if (error) throw error;
      setPairsScanned(result.pairs_scanned || TOTAL_PAIRS);
      if (result.errors?.length) setScanErrors(result.errors);
      refetch();
      toast({ title: 'Scan Complete ✅', description: `${result.pairs_scanned} pairs analyzed for ${activeTab}` });
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
    const variants = getTimeframeVariants(activeTab);
    for (let i = 0; i < 36; i++) {
      await new Promise(r => setTimeout(r, 10000));
      const { data: polled } = await supabase
        .from('currency_strength')
        .select('*')
        .in('timeframe', variants)
        .order('recorded_at', { ascending: false })
        .limit(8);
      if (polled && polled.length > 0) {
        const latestTime = new Date(polled[0].recorded_at).getTime();
        if (Date.now() - latestTime < 2 * 60 * 1000) {
          refetch();
          setPairsScanned(TOTAL_PAIRS);
          toast({ title: 'Scan Complete ✅', description: `Results ready for ${activeTab}` });
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
  const prevScoreMap = useMemo(() => {
    const map = new Map<string, number>();
    prevData?.forEach(item => map.set(item.currency, item.strength));
    return map;
  }, [prevData]);

  // Sort by strength descending
  const sortedData = useMemo(() => {
    return data ? [...data].sort((a, b) => b.strength - a.strength) : [];
  }, [data]);

  const lastUpdated = data?.[0]?.recorded_at;
  const hasData = !isLoading && sortedData.length > 0;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-[0_0_20px_hsla(142,71%,45%,0.1)]">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              FX Currency Strength
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              {isLoading
                ? 'ডেটা লোড হচ্ছে...'
                : lastUpdated
                  ? `আপডেট (UTC): ${formatUtcTimestamp(lastUpdated)}`
                  : `${format(selectedDate, 'dd MMM yyyy')} — কোনো ডেটা নেই`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/80 text-xs font-medium"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                {format(selectedDate, 'dd MMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                disabled={{ after: new Date() }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/80 text-xs font-medium"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Session Tabs + Scan Button */}
      <Card className="border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-muted/20 border border-border/30">
                <TabsTrigger value="London" className="text-xs font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">London</TabsTrigger>
                <TabsTrigger value="New York" className="text-xs font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">New York</TabsTrigger>
                <TabsTrigger value="Asian" className="text-xs font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Asian</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button onClick={runScan} disabled={scanning} className="gap-2" size="sm">
              {scanning ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Scanning...</>
              ) : (
                <><Play className="h-4 w-4" />Run Scan</>
              )}
            </Button>
          </div>

          {/* Progress */}
          {scanning && (
            <div className="space-y-2 mt-4 animate-in fade-in duration-300">
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
        </CardContent>
      </Card>

      {/* Strength Ranking */}
      <Card className="border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-primary" />
              </div>
              <CardTitle className="text-base font-bold tracking-tight">Strength Ranking</CardTitle>
            </div>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                {formatUtcTimestamp(lastUpdated)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-8 w-full rounded-lg bg-muted/10 animate-pulse" />
              ))}
            </div>
          ) : hasData ? (
            <div className="divide-y divide-white/[0.04]">
              {sortedData.map((item, i) => (
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
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-muted/10 flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-base font-semibold mb-1">কোনো ডেটা নেই</p>
              <p className="text-xs">এই session/তারিখে কোনো scan data পাওয়া যায়নি। "Run Scan" চাপুন।</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan Errors */}
      {scanErrors.length > 0 && (
        <Card className="border-destructive/20">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-destructive flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              {scanErrors.length} errors during scan
            </p>
            <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
              {scanErrors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card className="border-border/30 bg-card/30 backdrop-blur-sm">
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { color: 'hsl(142, 71%, 45%)', label: 'STRONG', range: '+5 to +7' },
              { color: 'hsl(48, 96%, 53%)', label: 'NEUTRAL', range: '-3 to +4' },
              { color: 'hsl(25, 95%, 53%)', label: 'MID WEAK', range: '-6 to -4' },
              { color: 'hsl(0, 84%, 60%)', label: 'WEAK', range: '-7' },
            ].map(item => (
              <div key={item.label} className="space-y-1.5">
                <div
                  className="w-3 h-3 rounded-full mx-auto"
                  style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}40` }}
                />
                <p className="font-bold text-foreground text-[11px] tracking-wider">{item.label}</p>
                <p className="text-muted-foreground text-[10px] font-medium">{item.range}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
