import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap, RefreshCw, Loader2, Activity, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfluenceCard } from '@/components/intelligence/ConfluenceCard';
import { SessionTracker } from '@/components/intelligence/SessionTracker';
import { AdrGauge } from '@/components/intelligence/AdrGauge';
import { RiskCalculator } from '@/components/intelligence/RiskCalculator';

export default function TradeIntelligence() {
  const [calculatingConfluence, setCalculatingConfluence] = useState(false);
  const [fetchingAdr, setFetchingAdr] = useState(false);

  // Fetch confluence scores
  const { data: confluenceData, isLoading: loadingConfluence, refetch: refetchConfluence } = useQuery({
    queryKey: ['confluence-scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('confluence_scores')
        .select('*')
        .order('grade')
        .order('strength_diff', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Fetch ADR data
  const { data: adrData, isLoading: loadingAdr, refetch: refetchAdr } = useQuery({
    queryKey: ['adr-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('adr_data')
        .select('*')
        .order('adr_percent_used', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  const calculateConfluence = useCallback(async () => {
    setCalculatingConfluence(true);
    try {
      await supabase.functions.invoke('calculate-confluence');
      await refetchConfluence();
    } catch (e) {
      console.error('Confluence calc error:', e);
    }
    setCalculatingConfluence(false);
  }, [refetchConfluence]);

  const fetchAdr = useCallback(async () => {
    setFetchingAdr(true);
    try {
      // Fetch just a few pairs to stay within rate limits (edge function timeout)
      await supabase.functions.invoke('fetch-adr', {
        body: { pairs: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'EUR/GBP'] }
      });
      await refetchAdr();
    } catch (e) {
      console.error('ADR fetch error:', e);
    }
    setFetchingAdr(false);
  }, [refetchAdr]);

  // Sort confluence: A+ first, then A, B, C, D
  const gradeOrder: Record<string, number> = { 'A+': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
  const sortedConfluence = [...(confluenceData || [])].sort((a, b) =>
    (gradeOrder[a.grade] ?? 5) - (gradeOrder[b.grade] ?? 5)
  );

  const topSetups = sortedConfluence.filter(s => s.grade === 'A+' || s.grade === 'A');

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_15px_hsla(142,71%,45%,0.2)]">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Trade Intelligence</h1>
            <p className="text-xs text-muted-foreground">Confluence scoring, ADR, sessions & risk management</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={calculateConfluence}
            disabled={calculatingConfluence}
            size="sm"
            className="bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30"
          >
            {calculatingConfluence ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
            Confluence
          </Button>
          <Button
            onClick={fetchAdr}
            disabled={fetchingAdr}
            size="sm"
            className="bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/30"
          >
            {fetchingAdr ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Activity className="w-3.5 h-3.5 mr-1" />}
            ADR
          </Button>
        </div>
      </div>

      {/* Top Alert */}
      {topSetups.length > 0 && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 backdrop-blur-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold text-green-400">Top Setups Right Now</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {topSetups.map(s => (
              <span key={s.pair} className="text-xs font-bold px-2 py-1 rounded-lg bg-green-500/15 text-green-400">
                {s.pair} {s.direction} ({s.grade})
              </span>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="confluence" className="space-y-4">
        <TabsList className="bg-muted/20 border border-border/30">
          <TabsTrigger value="confluence" className="text-xs font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Confluence
          </TabsTrigger>
          <TabsTrigger value="adr" className="text-xs font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            ADR Monitor
          </TabsTrigger>
          <TabsTrigger value="tools" className="text-xs font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Tools
          </TabsTrigger>
        </TabsList>

        {/* Confluence Tab */}
        <TabsContent value="confluence">
          {loadingConfluence ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : sortedConfluence.length === 0 ? (
            <div className="text-center py-16">
              <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No confluence data yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Click "Confluence" to calculate scores from existing strength & EMA data</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedConfluence.map(s => (
                <ConfluenceCard key={s.pair} data={s} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ADR Tab */}
        <TabsContent value="adr">
          {loadingAdr ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (adrData || []).length === 0 ? (
            <div className="text-center py-16">
              <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No ADR data yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Click "ADR" to fetch daily range data from TwelveData</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(adrData || []).map((d: any) => (
                <AdrGauge key={d.pair} data={d} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RiskCalculator />
            <SessionTracker />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
