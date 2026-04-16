import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useMemo, useCallback, ReactNode } from 'react';
import { CurrencyStrengthRecord } from '@/types/correlation';
import { StrengthMeter } from '@/components/correlation/StrengthMeter';
import { SummaryCards } from '@/components/correlation/SummaryCards';
import { PairSuggestions } from '@/components/correlation/PairSuggestions';
import { StrengthTrendChart } from '@/components/correlation/StrengthTrendChart';
import { StrengthHeatmap } from '@/components/correlation/StrengthHeatmap';
import { TimeframeComparison } from '@/components/correlation/TimeframeComparison';
import { TradeOfTheDay } from '@/components/correlation/TradeOfTheDay';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RefreshCw, TrendingUp, CalendarIcon, Activity, GripVertical } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { SessionPanel } from '@/components/correlation/SessionPanel';
import { FundamentalBias } from '@/components/correlation/FundamentalBias';
import { PowerGrabPanel } from '@/components/correlation/PowerGrabPanel';
import { SupplyDemandPanel } from '@/components/correlation/SupplyDemandPanel';
import { MARKET_SESSIONS, getSessionHours, isSessionActive, getBDHour, getBDMinute } from '@/lib/timezone';
import { TierLegend } from '@/components/correlation/TierLegend';

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
      if (p === 'Tokyo' || p === 'Sydney') return 'Asian';
      return '1H';
    }
  }
  return '1H';
}
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const UTC_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatUtcTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = UTC_MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const hours24 = date.getUTCHours();
  const hours12 = String(((hours24 + 11) % 12) + 1).padStart(2, '0');
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  return `${day} ${month} ${year}, ${hours12}:${minutes} ${meridiem}`;
}

function useCurrencyStrength(timeframe: string, selectedDate: Date) {
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['currency-strength', timeframe, selectedDateKey],
    queryFn: async () => {
      const dayStart = `${selectedDateKey}T00:00:00.000Z`;
      const dayEnd = `${selectedDateKey}T23:59:59.999Z`;
      const timeframeVariants = timeframe === 'New York'
        ? ['New York', 'Strength On New York']
        : timeframe === 'Asian'
        ? ['Asian']
        : [timeframe];
      const { data, error } = await supabase
        .from('currency_strength')
        .select('*')
        .in('timeframe', timeframeVariants)
        .gte('recorded_at', dayStart)
        .lte('recorded_at', dayEnd)
        .order('recorded_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [] as CurrencyStrengthRecord[];
      const latestTime = data[0].recorded_at;
      return data.filter((row) => row.recorded_at === latestTime) as CurrencyStrengthRecord[];
    },
    refetchInterval: 60000,
  });
}

function usePreviousSessionData(activeTab: string, selectedDate: Date) {
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const lookbackKey = format(subDays(selectedDate, 7), 'yyyy-MM-dd');

  // Asian → previous NY, London → previous Asian, NY → previous London
  const oppositeTimeframes = activeTab === 'New York'
    ? ['1H']
    : activeTab === '1H'
    ? ['Asian']
    : ['New York', 'Strength On New York'];
  const oppositeLabel = activeTab === 'New York' ? 'London' : activeTab === '1H' ? 'Asian' : 'New York';

  return useQuery({
    queryKey: ['currency-strength-prev-session', activeTab, selectedDateKey],
    queryFn: async () => {
      const rangeStart = `${lookbackKey}T00:00:00.000Z`;
      const rangeEnd = `${selectedDateKey}T23:59:59.999Z`;
      const { data, error } = await supabase
        .from('currency_strength')
        .select('*')
        .in('timeframe', oppositeTimeframes)
        .gte('recorded_at', rangeStart)
        .lte('recorded_at', rangeEnd)
        .order('recorded_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return { records: [] as CurrencyStrengthRecord[], sessionLabel: oppositeLabel, timestamp: '' };
      const latestTime = data[0].recorded_at;
      return {
        records: data.filter(r => r.recorded_at === latestTime) as CurrencyStrengthRecord[],
        sessionLabel: oppositeLabel,
        timestamp: latestTime,
      };
    },
  });
}

function useAllSessionData(selectedDate: Date) {
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const dayStart = `${selectedDateKey}T00:00:00.000Z`;
  const dayEnd = `${selectedDateKey}T23:59:59.999Z`;

  const fetchLatest = async (timeframes: string[]) => {
    const { data, error } = await supabase
      .from('currency_strength')
      .select('*')
      .in('timeframe', timeframes)
      .gte('recorded_at', dayStart)
      .lte('recorded_at', dayEnd)
      .order('recorded_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return [] as CurrencyStrengthRecord[];
    const latestTime = data[0].recorded_at;
    return data.filter(r => r.recorded_at === latestTime) as CurrencyStrengthRecord[];
  };

  const asian = useQuery({
    queryKey: ['currency-strength-asian-cmp', selectedDateKey],
    queryFn: () => fetchLatest(['Asian']),
  });

  const london = useQuery({
    queryKey: ['currency-strength-london-cmp', selectedDateKey],
    queryFn: () => fetchLatest(['1H']),
  });

  const ny = useQuery({
    queryKey: ['currency-strength-ny-cmp', selectedDateKey],
    queryFn: () => fetchLatest(['New York', 'Strength On New York']),
  });

  return { asianData: asian.data || [], londonData: london.data || [], nyData: ny.data || [] };
}

// --- Sortable wrapper ---
function SortableSection({ id, children }: { id: string; children: ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-card/80 backdrop-blur-sm border border-border/30 rounded-md p-1 shadow-lg"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}

const STORAGE_KEY = 'cs-section-order';
const DEFAULT_ORDER = ['session', 'trade-of-day', 'summary', 'fundamental-bias', 'power-grab', 'supply-demand', 'strength-meter', 'heatmap', 'comparison', 'pair-suggestions', 'trend-chart', 'legend'];

function getSavedOrder(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Add any new sections that don't exist in saved order
        const missing = DEFAULT_ORDER.filter(id => !parsed.includes(id));
        if (missing.length === 0 && parsed.length === DEFAULT_ORDER.length) return parsed;
        // Merge: keep saved order + append missing
        return [...parsed.filter((id: string) => DEFAULT_ORDER.includes(id)), ...missing];
      }
    }
  } catch {}
  return DEFAULT_ORDER;
}

export default function CurrencyStrength() {
  const [activeTab, setActiveTab] = useState(getDefaultTab);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sectionOrder, setSectionOrder] = useState<string[]>(getSavedOrder);
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isFetching } = useCurrencyStrength(activeTab, selectedDate);
  const { data: prevSessionData } = usePreviousSessionData(activeTab, selectedDate);
  const { asianData, londonData, nyData } = useAllSessionData(selectedDate);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  // Persist section order to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sectionOrder));
    } catch {}
  }, [sectionOrder]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSectionOrder(prev => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  const lastUpdated = data?.[0]?.recorded_at;
  const hasData = !isLoading && data && data.length > 0;

  const sectionMap: Record<string, ReactNode> = useMemo(() => ({
    'session': <SessionPanel />,
    'trade-of-day': hasData ? <TradeOfTheDay data={data!} /> : null,
    'summary': hasData ? <SummaryCards data={data!} /> : null,
    'fundamental-bias': <FundamentalBias strengthData={data} />,
    'power-grab': <PowerGrabPanel strengthData={data} />,
    'supply-demand': <SupplyDemandPanel strengthData={data} />,
    'strength-meter': (
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
                <TabsTrigger value="Asian" className="text-xs font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Asian</TabsTrigger>
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
          ) : hasData ? (
            <StrengthMeter data={data!} previousData={prevSessionData?.records} previousSessionLabel={prevSessionData?.sessionLabel} previousTimestamp={prevSessionData?.timestamp} />
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
    ),
    'heatmap': hasData ? <StrengthHeatmap data={data!} /> : null,
    'comparison': <TimeframeComparison asianData={asianData} londonData={londonData} nyData={nyData} />,
    'pair-suggestions': hasData ? <PairSuggestions data={data!} /> : null,
    'trend-chart': (
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
    ),
    'legend': <TierLegend />,
  }), [data, isLoading, hasData, prevSessionData, asianData, londonData, nyData, activeTab]);

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Premium Header — bold, gradient, with status pulse */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/40 to-card/20 backdrop-blur-md p-4 sm:p-5 shadow-[0_8px_32px_hsla(142,71%,45%,0.08)]">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-12 w-56 h-56 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 flex items-center justify-center shadow-[0_0_28px_hsla(142,71%,45%,0.25)] relative">
              <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-primary" strokeWidth={2.5} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(142,71%,45%)]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-primary via-foreground to-primary/80 bg-clip-text text-transparent">
                Currency Strength
              </h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 font-semibold flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-primary" />
                {isLoading
                  ? 'ডেটা লোড হচ্ছে...'
                  : lastUpdated
                    ? `Updated · ${formatUtcTimestamp(lastUpdated)} UTC`
                    : `${format(selectedDate, 'dd MMM yyyy')} (UTC) — কোনো ডেটা নেই`}
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
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            রিফ্রেশ
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              setSectionOrder(DEFAULT_ORDER);
            }}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            Reset Layout
          </Button>
          </div>
        </div>
      </div>

      {/* Draggable sections */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-5">
            {sectionOrder.map(id => {
              const content = sectionMap[id];
              if (!content) return null;
              return (
                <SortableSection key={id} id={id}>
                  {content}
                </SortableSection>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
