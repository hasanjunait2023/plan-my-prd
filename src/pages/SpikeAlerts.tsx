import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, AlertTriangle, ChevronDown, Clock, Loader2, Radio, RefreshCw, Save, Settings2, Volume2, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SpikeAlert {
  id: string;
  alert_type: string;
  pair: string | null;
  message: string;
  sent_at: string;
  metadata: any;
}

interface Threshold {
  id: string;
  category: string;
  threshold_percent: number;
  cooldown_minutes: number;
}

interface VolumeSpikeRow {
  id: string;
  pair: string;
  volume: number;
  avgVolume: number;
  spikeRatio: number;
  intensity: string;
  direction: string;
  time: string;
}

function getUrgencyStyle(urgency: string) {
  switch (urgency) {
    case 'CRITICAL': return { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400', badge: '🔴 CRITICAL' };
    case 'HIGH': return { bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: '🟡 HIGH' };
    default: return { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400', badge: '🟠 MEDIUM' };
  }
}

function bdTimeStr(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
    hour12: false,
  });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SpikeAlerts() {
  const [alerts, setAlerts] = useState<SpikeAlert[]>([]);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [editThresholds, setEditThresholds] = useState<Record<string, { percent: string; cooldown: string }>>({});
  const [saving, setSaving] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [snapshotCount, setSnapshotCount] = useState(0);

  // Volume spike state
  const [volumeSpikes, setVolumeSpikes] = useState<VolumeSpikeRow[]>([]);
  const [scanningVolume, setScanningVolume] = useState(false);

  // Fetch alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from('alert_log')
        .select('*')
        .eq('alert_type', 'spike_alert')
        .order('sent_at', { ascending: false })
        .limit(50);
      if (data) setAlerts(data);
    };

    const fetchSnapshots = async () => {
      const { data } = await supabase.from('price_snapshots').select('updated_at').order('updated_at', { ascending: false }).limit(1);
      if (data && data.length > 0) {
        setLastCheck(data[0].updated_at);
      }
      const { count } = await supabase.from('price_snapshots').select('*', { count: 'exact', head: true });
      setSnapshotCount(count || 0);
    };

    const fetchThresholds = async () => {
      const { data } = await supabase.from('spike_thresholds').select('*');
      if (data) {
        setThresholds(data as Threshold[]);
        const edit: Record<string, { percent: string; cooldown: string }> = {};
        for (const t of data) {
          edit[t.category] = {
            percent: String(t.threshold_percent),
            cooldown: String(t.cooldown_minutes),
          };
        }
        setEditThresholds(edit);
      }
    };

    const fetchVolumeSpikes = async () => {
      const { data } = await supabase
        .from('alert_log')
        .select('*')
        .eq('alert_type', 'volume_spike')
        .order('sent_at', { ascending: false })
        .limit(30);
      if (data) {
        setVolumeSpikes(data.map((a) => {
          const meta = a.metadata as any || {};
          return {
            id: a.id,
            pair: a.pair || '',
            volume: meta.volume || 0,
            avgVolume: meta.avgVolume || 0,
            spikeRatio: meta.spikeRatio || 0,
            intensity: meta.intensity || 'MEDIUM',
            direction: meta.direction || 'UNKNOWN',
            time: a.sent_at,
          };
        }));
      }
    };

    fetchAlerts();
    fetchSnapshots();
    fetchThresholds();
    fetchVolumeSpikes();

    // Realtime subscription for price spike alerts
    const channel = supabase
      .channel('spike-alerts-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alert_log',
        filter: 'alert_type=eq.spike_alert',
      }, (payload) => {
        setAlerts(prev => [payload.new as SpikeAlert, ...prev]);
      })
      .subscribe();

    // Realtime subscription for volume spikes
    const volumeChannel = supabase
      .channel('volume-spikes-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alert_log',
        filter: 'alert_type=eq.volume_spike',
      }, (payload) => {
        const a = payload.new as SpikeAlert;
        const meta = a.metadata as any || {};
        setVolumeSpikes(prev => [{
          id: a.id,
          pair: a.pair || '',
          volume: meta.volume || 0,
          avgVolume: meta.avgVolume || 0,
          spikeRatio: meta.spikeRatio || 0,
          intensity: meta.intensity || 'MEDIUM',
          direction: meta.direction || 'UNKNOWN',
          time: a.sent_at,
        }, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(volumeChannel);
    };
  }, []);

  const saveThresholds = async () => {
    setSaving(true);
    try {
      for (const t of thresholds) {
        const edit = editThresholds[t.category];
        if (!edit) continue;
        await supabase
          .from('spike_thresholds')
          .update({
            threshold_percent: parseFloat(edit.percent),
            cooldown_minutes: parseInt(edit.cooldown),
          })
          .eq('id', t.id);
      }
      toast.success('Thresholds saved!');
    } catch (e) {
      toast.error('Failed to save');
    }
    setSaving(false);
  };

  const handleScanNow = async () => {
    setScanningVolume(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/volume-spike-scanner?force=true`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const result = await res.json();
      if (result.ok) {
        toast.success(`Scanned ${result.checked} pairs — ${result.spikes} spikes found`);
      } else {
        toast.error(result.error || 'Scan failed');
      }
    } catch (err) {
      toast.error('Failed to run volume scan');
    }
    setScanningVolume(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          Spike Alerts
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Price movement &amp; volume spike detection across 30 forex, gold &amp; crypto pairs
        </p>
      </div>

      {/* ========== VOLUME SPIKE SCANNER ========== */}
      <Card className="bg-card border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              🔊 Volume Spike Scanner
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">Monitoring Active</span>
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleScanNow}
              disabled={scanningVolume}
              className="h-7 text-xs"
            >
              {scanningVolume ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              Scan Now
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            5min candle volume vs 20-bar average — 2x+ = spike detected
          </p>
        </CardHeader>
        <CardContent>
          {volumeSpikes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Volume2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No volume spikes detected yet</p>
              <p className="text-xs mt-1">Spikes will appear here in real-time when abnormal volume is detected</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Pair</TableHead>
                    <TableHead className="text-xs text-right">Volume</TableHead>
                    <TableHead className="text-xs text-right">Avg Vol</TableHead>
                    <TableHead className="text-xs text-right">Spike</TableHead>
                    <TableHead className="text-xs">Direction</TableHead>
                    <TableHead className="text-xs text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volumeSpikes.map((spike) => {
                    const style = getUrgencyStyle(spike.intensity);
                    return (
                      <TableRow key={spike.id} className={`${style.bg} border-b border-border/20`}>
                        <TableCell className="text-xs font-semibold text-foreground py-2">{spike.pair}</TableCell>
                        <TableCell className="text-xs text-right font-mono text-foreground py-2">
                          {spike.volume.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono text-muted-foreground py-2">
                          {spike.avgVolume.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-right py-2">
                          <Badge variant="outline" className={`${style.text} ${style.border} text-[10px]`}>
                            {spike.spikeRatio}x
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs py-2">
                          <span className={spike.direction === 'BULLISH' ? 'text-green-400' : 'text-red-400'}>
                            {spike.direction === 'BULLISH' ? '📈 Bull' : '📉 Bear'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground py-2">
                          {bdTimeStr(spike.time)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status + Config Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status */}
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Radio className="w-4 h-4 text-primary animate-pulse" />
              Price Monitor Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Status</span>
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                ✅ Active
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Pairs Monitored</span>
              <span className="text-sm font-semibold text-foreground">{snapshotCount > 0 ? snapshotCount : 28}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Interval</span>
              <span className="text-sm font-semibold text-foreground">Every 2 min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Last Check</span>
              <span className="text-xs text-muted-foreground">
                {lastCheck ? timeAgo(lastCheck) : 'Not yet'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Thresholds */}
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              Spike Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {['major', 'cross', 'gold'].map((cat) => (
              <div key={cat} className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-14 capitalize">{cat}</Label>
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    value={editThresholds[cat]?.percent || ''}
                    onChange={(e) => setEditThresholds(prev => ({
                      ...prev,
                      [cat]: { ...prev[cat], percent: e.target.value },
                    }))}
                    className="h-7 text-xs w-20"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={editThresholds[cat]?.cooldown || ''}
                    onChange={(e) => setEditThresholds(prev => ({
                      ...prev,
                      [cat]: { ...prev[cat], cooldown: e.target.value },
                    }))}
                    className="h-7 text-xs w-14"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
              </div>
            ))}
            <Button size="sm" onClick={saveThresholds} disabled={saving} className="w-full mt-2">
              <Save className="w-3.5 h-3.5 mr-1" />
              {saving ? 'Saving...' : 'Save Thresholds'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Price Spike Alerts Feed */}
      <Card className="bg-card border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            Recent Price Spikes
            {alerts.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-auto">{alerts.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No spike alerts yet</p>
              <p className="text-xs mt-1">Alerts will appear here when abnormal price movement is detected</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const meta = alert.metadata || {};
                const urgency = meta.urgency || 'MEDIUM';
                const style = getUrgencyStyle(urgency);
                const isMulti = meta.type === 'multi';
                const pairs: string[] = meta.pairs || [];
                const details: any[] = meta.details || [];

                return (
                  <Collapsible key={alert.id}>
                    <CollapsibleTrigger className="w-full">
                      <div className={`flex items-center gap-3 p-3 rounded-lg border ${style.bg} ${style.border} hover:opacity-90 transition-opacity w-full text-left`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold">{style.badge}</span>
                            {isMulti ? (
                              <span className="text-xs font-semibold text-foreground">
                                {pairs.length} pairs • {meta.direction}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-foreground">
                                {alert.pair || pairs[0]}
                              </span>
                            )}
                            {details.length > 0 && details[0]?.change && !isMulti && (
                              <span className={`text-xs font-mono ${details[0].change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {details[0].change > 0 ? '+' : ''}{details[0].change.toFixed(2)}%
                              </span>
                            )}
                          </div>
                          {isMulti && (
                            <p className="text-[11px] text-muted-foreground mt-1 truncate">
                              {pairs.slice(0, 4).join(', ')}{pairs.length > 4 ? ` +${pairs.length - 4} more` : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {bdTimeStr(alert.sent_at)}
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 py-2 bg-muted/20 rounded-b-lg border-x border-b border-border/20 text-xs space-y-1">
                        {details.map((d: any, i: number) => (
                          <div key={i} className="flex items-center justify-between py-1">
                            <span className="font-medium text-foreground">{d.pair}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground">{d.prev} → {d.curr}</span>
                              <span className={`font-mono ${d.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {d.change > 0 ? '+' : ''}{d.change?.toFixed(2)}% ({d.pips > 0 ? '+' : ''}{d.pips} pips)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
