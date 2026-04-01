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
import { RefreshCw, TrendingUp, CalendarIcon } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils';

function useCurrencyStrength(timeframe: string, selectedDate: Date) {
  return useQuery({
    queryKey: ['currency-strength', timeframe, selectedDate.toISOString()],
    queryFn: async () => {
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = endOfDay(selectedDate).toISOString();

      const { data, error } = await supabase
        .from('currency_strength')
        .select('*')
        .eq('timeframe', timeframe)
        .gte('recorded_at', dayStart)
        .lte('recorded_at', dayEnd)
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      // Get only the latest batch for this timeframe+date
      if (!data || data.length === 0) return [];
      const latestTime = data[0].recorded_at;
      return data.filter(d => d.recorded_at === latestTime) as CurrencyStrengthRecord[];
    },
    refetchInterval: 60000,
  });
}

export default function CurrencyStrength() {
  const [activeTab, setActiveTab] = useState('1H');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { data, isLoading, refetch, isFetching } = useCurrencyStrength(activeTab, selectedDate);

  const lastUpdated = data?.[0]?.recorded_at;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">💱 Currency Strength</h1>
            <p className="text-sm text-muted-foreground">
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
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
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
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            রিফ্রেশ
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {!isLoading && data && data.length > 0 && <SummaryCards data={data} />}

      {/* Strength Meter */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Strength Ranking</CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="1H">1H</TabsTrigger>
                <TabsTrigger value="15M">15M</TabsTrigger>
                <TabsTrigger value="3M">3M</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full" />
              ))}
            </div>
          ) : data && data.length > 0 ? (
            <StrengthMeter data={data} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">কোনো ডেটা নেই</p>
              <p className="text-sm">এই তারিখে কোনো currency strength data পাওয়া যায়নি।</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pair Suggestions */}
      {!isLoading && data && data.length > 0 && <PairSuggestions data={data} />}

      {/* Legend */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4 text-center text-xs">
            <div className="space-y-1">
              <div className="w-3 h-3 rounded-full mx-auto" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />
              <p className="font-semibold text-foreground">STRONG</p>
              <p className="text-muted-foreground">+5 to +10</p>
            </div>
            <div className="space-y-1">
              <div className="w-3 h-3 rounded-full mx-auto" style={{ backgroundColor: 'hsl(48, 96%, 53%)' }} />
              <p className="font-semibold text-foreground">NEUTRAL</p>
              <p className="text-muted-foreground">-3 to +4</p>
            </div>
            <div className="space-y-1">
              <div className="w-3 h-3 rounded-full mx-auto" style={{ backgroundColor: 'hsl(25, 95%, 53%)' }} />
              <p className="font-semibold text-foreground">MID WEAK</p>
              <p className="text-muted-foreground">-6 to -4</p>
            </div>
            <div className="space-y-1">
              <div className="w-3 h-3 rounded-full mx-auto" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }} />
              <p className="font-semibold text-foreground">WEAK</p>
              <p className="text-muted-foreground">-10 to -7</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
