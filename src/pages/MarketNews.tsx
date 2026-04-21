import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EconomicCalendar } from '@/components/news/EconomicCalendar';
import { NewsCardList } from '@/components/news/NewsCard';
import type { NewsItem } from '@/components/news/NewsCard';
import { CentralBankRates } from '@/components/news/CentralBankRates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Newspaper, RefreshCw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SectionVisibilityProvider } from '@/contexts/SectionVisibilityContext';
import { HiddenSectionsBar } from '@/components/common/HiddenSectionsBar';
import { HideableSection } from '@/components/common/HideableSection';

type ImpactFilter = 'all' | 'high' | 'medium' | 'low';

export default function MarketNews() {
  const [newsFilter, setNewsFilter] = useState<'all' | 'forex' | 'gold' | 'crypto'>('all');
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('all');

  const { data: calendarData, isLoading: calendarLoading, refetch: refetchCalendar, isFetching: calendarFetching } = useQuery({
    queryKey: ['forex-calendar'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-forex-calendar');
      if (error) throw error;
      return data as { events: any[]; fetchedAt: string };
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const { data: newsData, isLoading: newsLoading, refetch: refetchNews, isFetching: newsFetching } = useQuery({
    queryKey: ['market-news'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-market-news');
      if (error) throw error;
      return data as { news: NewsItem[]; fetchedAt: string };
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });

  const isFetching = calendarFetching || newsFetching;

  const handleRefresh = () => {
    refetchCalendar();
    refetchNews();
  };

  return (
    <SectionVisibilityProvider pageKey="market-news">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Market News & Calendar</h1>
              <p className="text-xs text-muted-foreground">
                Forex, Gold & Crypto — economic events & live news
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <HiddenSectionsBar />

        {/* Section 1: Economic Calendar */}
        <HideableSection id="calendar" title="Economic Calendar">
          <EconomicCalendar events={calendarData?.events || []} isLoading={calendarLoading} />
        </HideableSection>

        {/* Section 2: Market News */}
        <HideableSection id="news" title="Live Market News">
          <div>
            <Tabs defaultValue="all" onValueChange={(v) => setNewsFilter(v as any)}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="text-base">📰</span> Live Market News
                </h3>
                <TabsList className="h-8 bg-muted/30">
                  <TabsTrigger value="all" className="text-[11px] px-2.5 h-6">All</TabsTrigger>
                  <TabsTrigger value="forex" className="text-[11px] px-2.5 h-6">💱 Forex</TabsTrigger>
                  <TabsTrigger value="gold" className="text-[11px] px-2.5 h-6">🥇 Gold</TabsTrigger>
                  <TabsTrigger value="crypto" className="text-[11px] px-2.5 h-6">₿ Crypto</TabsTrigger>
                </TabsList>
              </div>

              {/* Impact / Priority Filter */}
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground mr-1">Priority:</span>
                {([
                  { value: 'all', label: 'All', dot: 'bg-muted-foreground' },
                  { value: 'high', label: '🔴 High', dot: 'bg-destructive' },
                  { value: 'medium', label: '🟡 Medium', dot: 'bg-warning' },
                  { value: 'low', label: '⚪ Low', dot: 'bg-muted-foreground' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setImpactFilter(opt.value)}
                    className={cn(
                      'text-[11px] px-2.5 py-1 rounded-full border transition-all font-medium',
                      impactFilter === opt.value
                        ? 'bg-primary/20 border-primary/40 text-primary'
                        : 'bg-card/60 border-border/30 text-muted-foreground hover:border-primary/20'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <TabsContent value="all"><NewsCardList filter="all" impactFilter={impactFilter} news={newsData?.news || []} isLoading={newsLoading} /></TabsContent>
              <TabsContent value="forex"><NewsCardList filter="forex" impactFilter={impactFilter} news={newsData?.news || []} isLoading={newsLoading} /></TabsContent>
              <TabsContent value="gold"><NewsCardList filter="gold" impactFilter={impactFilter} news={newsData?.news || []} isLoading={newsLoading} /></TabsContent>
              <TabsContent value="crypto"><NewsCardList filter="crypto" impactFilter={impactFilter} news={newsData?.news || []} isLoading={newsLoading} /></TabsContent>
            </Tabs>
          </div>
        </HideableSection>

        {/* Section 3: Central Bank Rates */}
        <HideableSection id="central-banks" title="Central Bank Rates">
          <CentralBankRates />
        </HideableSection>
      </div>
    </SectionVisibilityProvider>
  );
}
