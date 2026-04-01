import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AccountCard } from '@/components/mt5/AccountCard';
import { TradesList } from '@/components/mt5/TradesList';
import { ConnectionStatus } from '@/components/mt5/ConnectionStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Cable } from 'lucide-react';

export default function MT5Connection() {
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [accRes, tradesRes] = await Promise.all([
      supabase.from('mt5_account_info').select('*').limit(1).maybeSingle(),
      supabase.from('mt5_trades').select('*').order('open_time', { ascending: false }).limit(100),
    ]);
    setAccountInfo(accRes.data);
    setTrades((tradesRes.data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('mt5-sync', {
        body: { action: 'full' },
      });
      if (error) throw error;
      toast({ title: 'Sync Complete!', description: 'MT5 data updated successfully' });
      await fetchData();
    } catch (err: any) {
      console.error('Sync error:', err);
      toast({ title: 'Sync Failed', description: err.message || 'Could not sync MT5 data', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-[0_0_12px_hsla(145,63%,49%,0.3)]">
            <Cable className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">MT5 Connection</h1>
            <p className="text-xs text-muted-foreground">MetaTrader 5 account sync via MetaApi</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatus
            connected={!!accountInfo}
            lastSync={accountInfo?.synced_at || null}
          />
          <Button onClick={handleSync} disabled={syncing} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Account Info */}
      <AccountCard data={accountInfo} loading={loading} />

      {/* Trades */}
      <TradesList trades={trades} loading={loading} onRefresh={fetchData} />
    </div>
  );
}
