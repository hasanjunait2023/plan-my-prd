import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CurrencyStrengthRecord } from '@/types/correlation';
import { StrengthMeter } from '@/components/correlation/StrengthMeter';
import { SummaryCards } from '@/components/correlation/SummaryCards';
import { PairSuggestions } from '@/components/correlation/PairSuggestions';
import { StrengthTrendChart } from '@/components/correlation/StrengthTrendChart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RefreshCw, TrendingUp, CalendarIcon, Activity, Zap, Globe } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { SessionPanel } from '@/components/correlation/SessionPanel';
import { toast } from 'sonner';

function useCurrencyStrength(timeframe: string, selectedDate: Date, session: string) {
  return useQuery({
    queryKey: ['currency-strength', timeframe, selectedDate.toISOString(), session],
    queryFn: async () => {
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = endOfDay(selectedDate).toISOString();

      let query = supabase
        .from('currency_strength')
        .select('*')
        .gte('recorded_at', dayStart)
        .lte('recorded_at', dayEnd)
        .order('recorded_at', { ascending: false });

      // For session tabs: London/New York filter by timeframe name, Latest = any
      if (session === 'Latest') {
        // Get most recent regardless of timeframe
      } else if (session === 'London' || session === 'New York') {
        query = query.eq('timeframe', session);
      } else {
        // Default timeframe tabs (1H, 15M, 3M)
        query = query.eq('timeframe', timeframe);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) return [];
      const latestTime = data[0].recorded_at;
      return data.filter(d => d.recorded_at === latestTime) as CurrencyStrengthRecord[];
    },
    refetchInterval: 60000,
  });
}

export default function CurrencyStrength() {
  const [activeTab, setActiveTab] = useState('1H');
  const [sessionTab, setSessionTab] = useState('Latest');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');

  const effectiveTimeframe = sessionTab === 'London' || sessionTab === 'New York' || sessionTab === 'Latest' ? sessionTab : activeTab;
  const { data, isLoading, refetch, isFetching } = useCurrencyStrength(activeTab, selectedDate, sessionTab);

  const lastUpdated = data?.[0]?.recorded_at;

  const runLiveAnalysis = async () => {
    setIsScanning(true);
    try {
      // Determine session based on UTC time
      const utcHour = new Date().getUTCHours();
      const session = utcHour >= 13 ? 'New York' : 'London';

      // Batch 1
      setScanProgress(`Batch 1/2 — Scanning pairs 1-14... (~2 min)`);
      const resp1 = await supabase.functions.invoke('market-correlation-analysis', {
        body: { batch: 1, session }
      });

      if (resp1.error) throw new Error(resp1.error.message || 'Batch 1 failed');
      const scanId = resp1.data?.scan_id;
      if (!scanId) throw new Error('No scan_id returned');

      toast.success(`Batch 1 complete: ${resp1.data?.pairs_fetched || 0} pairs fetched`);

      // Batch 2
      setScanProgress(`Batch 2/2 — Scanning pairs 15-28 + AI analysis... (~2 min)`);
      const resp2 = await supabase.functions.invoke('market-correlation-analysis', {
        body: { batch: 2, session, scan_id: scanId }
      });

      if (resp2.error) throw new Error(resp2.error.message || 'Batch 2 failed');

      toast.success(`${session} Session analysis complete! ${resp2.data?.pairs_total || 0} pairs analyzed`);
      setSessionTab(session);
      refetch();
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error(`Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsScanning(false);
      setScanProgress('');
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-[0_0_20px_hsla(142,71%,45%,0.1)]">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Currency Strength
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              {lastUpdated
                ? `আপডেট: ${format(new Date(lastUpdated), 'dd MMM yyyy, hh:mm a')}`
                : 'ডেটা লোড হচ্ছে...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Picker */}
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
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            রিফ্রেশ
          </Button>
        </div>
      </div>

      {/* Session Tabs + Run Analysis */}
      <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-primary" />
              <Tabs value={sessionTab} onValueChange={setSessionTab}>
                <TabsList className="bg-muted/20 border border-border/30">
                  <TabsTrigger value="Latest" className="text-xs font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Latest</TabsTrigger>
                  <TabsTrigger value="London" className="text-xs font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">London</TabsTrigger>
                  <TabsTrigger value="New York" className="text-xs font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">New York</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <Button
              size="sm"
              onClick={runLiveAnalysis}
              disabled={isScanning}
              className="gap-2 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-primary-foreground font-bold text-xs shadow-[0_0_15px_hsla(142,71%,45%,0.2)]"
            >
              <Zap className={`w-3.5 h-3.5 ${isScanning ? 'animate-pulse' : ''}`} />
              {isScanning ? scanProgress || 'Scanning...' : 'Run Live Analysis'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <SessionPanel />

      {/* Summary Cards */}
      {!isLoading && data && data.length > 0 && <SummaryCards data={data} />}

      {/* Strength Meter */}
      <Card className="border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-primary" />
              </div>
              <CardTitle className="text-base font-bold tracking-tight">Strength Ranking</CardTitle>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-muted/20 border border-border/30">
                <TabsTrigger value="1H" className="text-xs font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">1H</TabsTrigger>
                <TabsTrigger value="15M" className="text-xs font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">15M</TabsTrigger>
                <TabsTrigger value="3M" className="text-xs font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">3M</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-lg" />
              ))}
            </div>
          ) : data && data.length > 0 ? (
            <StrengthMeter data={data} />
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-muted/10 flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-base font-semibold mb-1">কোনো ডেটা নেই</p>
              <p className="text-xs">এই তারিখে কোনো currency strength data পাওয়া যায়নি।</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pair Suggestions */}
      {!isLoading && data && data.length > 0 && <PairSuggestions data={data} />}

      {/* Trend Chart */}
      <Card className="border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
            </div>
            <CardTitle className="text-base font-bold tracking-tight">Strength Trend</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <StrengthTrendChart timeframe={activeTab} />
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-border/30 bg-card/30 backdrop-blur-sm">
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-5 gap-3 text-center">
            {[
              { color: 'hsl(142, 71%, 45%)', label: 'STRONG', range: '+7 to +10' },
              { color: 'hsl(100, 60%, 45%)', label: 'MID STRONG', range: '+4 to +6' },
              { color: 'hsl(48, 96%, 53%)', label: 'NEUTRAL', range: '-3 to +3' },
              { color: 'hsl(25, 95%, 53%)', label: 'MID WEAK', range: '-6 to -4' },
              { color: 'hsl(0, 84%, 60%)', label: 'WEAK', range: '-10 to -7' },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div
                  className="w-3 h-3 rounded-full mx-auto"
                  style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}40` }}
                />
                <p className="font-bold text-foreground text-[10px] tracking-wider">{item.label}</p>
                <p className="text-muted-foreground text-[9px] font-medium">{item.range}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
