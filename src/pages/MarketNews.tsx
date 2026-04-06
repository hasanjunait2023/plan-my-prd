import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EconomicCalendar } from '@/components/news/EconomicCalendar';
import { NewsCardList } from '@/components/news/NewsCard';
import type { NewsItem } from '@/components/news/NewsCard';
import { CentralBankRates } from '@/components/news/CentralBankRates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Newspaper, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MarketNews() {
  const [newsFilter, setNewsFilter] = useState<'all' | 'forex' | 'gold' | 'crypto'>('all');

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

      {/* Section 1: Economic Calendar */}
      <EconomicCalendar events={calendarData?.events || []} isLoading={calendarLoading} />

      {/* Section 2: Market News */}
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
          <TabsContent value="all"><NewsCardList filter="all" news={newsData?.news || []} isLoading={newsLoading} /></TabsContent>
          <TabsContent value="forex"><NewsCardList filter="forex" news={newsData?.news || []} isLoading={newsLoading} /></TabsContent>
          <TabsContent value="gold"><NewsCardList filter="gold" news={newsData?.news || []} isLoading={newsLoading} /></TabsContent>
          <TabsContent value="crypto"><NewsCardList filter="crypto" news={newsData?.news || []} isLoading={newsLoading} /></TabsContent>
        </Tabs>
      </div>

      {/* Section 3: Central Bank Rates */}
      <CentralBankRates />
    </div>
  );
}
