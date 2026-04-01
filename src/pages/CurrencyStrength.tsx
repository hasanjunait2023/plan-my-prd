import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CurrencyStrengthRecord } from '@/types/correlation';
import { StrengthMeter } from '@/components/correlation/StrengthMeter';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

function useCurrencyStrength(timeframe: string) {
  return useQuery({
    queryKey: ['currency-strength', timeframe],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_strength')
        .select('*')
        .eq('timeframe', timeframe)
        .order('strength', { ascending: false });

      if (error) throw error;
      return data as CurrencyStrengthRecord[];
    },
    refetchInterval: 60000,
  });
}

export default function CurrencyStrength() {
  const [activeTab, setActiveTab] = useState('1H');
  const { data, isLoading, refetch, isFetching } = useCurrencyStrength(activeTab);

  const lastUpdated = data?.[0]?.recorded_at;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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

      {/* Tabs */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">FX Co-Relation Strength</CardTitle>
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
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : data && data.length > 0 ? (
            <StrengthMeter data={data} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">কোনো ডেটা নেই</p>
              <p className="text-sm">n8n workflow execute হলে এখানে currency strength দেখাবে।</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
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
