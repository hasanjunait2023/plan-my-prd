import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
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
import { RefreshCw, TrendingUp, CalendarIcon, Activity, Clock } from 'lucide-react';
import { format, startOfDay, endOfDay, formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { SessionPanel } from '@/components/correlation/SessionPanel';

function useCurrencyStrength(timeframe: string, selectedDate: Date) {
  return useQuery({
    queryKey: ['currency-strength', timeframe, selectedDate.toISOString()],
    queryFn: async () => {
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = endOfDay(selectedDate).toISOString();

      // First try: get data for the selected date
      let { data, error } = await supabase
        .from('currency_strength')
        .select('*')
        .eq('timeframe', timeframe)
        .gte('recorded_at', dayStart)
        .lte('recorded_at', dayEnd)
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      // If no data for today, get the latest available data for this timeframe
      if (!data || data.length === 0) {
        const { data: latestData, error: latestError } = await supabase
          .from('currency_strength')
          .select('*')
          .eq('timeframe', timeframe)
          .order('recorded_at', { ascending: false })
          .limit(8);

        if (latestError) throw latestError;
        return (latestData || []) as CurrencyStrengthRecord[];
      }

      const latestTime = data[0].recorded_at;
      return data.filter(d => d.recorded_at === latestTime) as CurrencyStrengthRecord[];
    },
    refetchInterval: 60000,
  });
}

export default function CurrencyStrength() {
  const [activeTab, setActiveTab] = useState('1H');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isFetching } = useCurrencyStrength(activeTab, selectedDate);

  // Realtime subscription — auto-refetch on new inserts
  useEffect(() => {
    const channel = supabase
      .channel('currency-strength-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'currency_strength',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['currency-strength'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const lastUpdated = data?.[0]?.recorded_at;

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
                <TabsTrigger value="1H" className="text-xs font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">London</TabsTrigger>
                <TabsTrigger value="New York" className="text-xs font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">New York</TabsTrigger>
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
          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { color: 'hsl(142, 71%, 45%)', label: 'STRONG', range: '+5 to +10' },
              { color: 'hsl(48, 96%, 53%)', label: 'NEUTRAL', range: '-3 to +4' },
              { color: 'hsl(25, 95%, 53%)', label: 'MID WEAK', range: '-6 to -4' },
              { color: 'hsl(0, 84%, 60%)', label: 'WEAK', range: '-10 to -7' },
            ].map((item) => (
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
