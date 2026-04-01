import { useState, useEffect, useCallback } from 'react';
import { Crosshair, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScanSummary } from '@/components/ema/ScanSummary';
import { AlignmentCard } from '@/components/ema/AlignmentCard';
import { EmaDetailView } from '@/components/ema/EmaDetailView';
import type { EmaAlignment, PairAlignmentSummary } from '@/types/ema';
import { Button } from '@/components/ui/button';

export default function EmaScanner() {
  const [alignments, setAlignments] = useState<EmaAlignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const fetchLatestScan = useCallback(async () => {
    setLoading(true);
    try {
      // Get latest batch
      const { data: latest } = await supabase
        .from('ema_alignments')
        .select('scan_batch_id, scanned_at')
        .order('scanned_at', { ascending: false })
        .limit(1);

      if (!latest || latest.length === 0) {
        setAlignments([]);
        setLoading(false);
        return;
      }

      const batchId = latest[0].scan_batch_id;
      setLastScan(new Date(latest[0].scanned_at).toLocaleString());

      const { data } = await supabase
        .from('ema_alignments')
        .select('*')
        .eq('scan_batch_id', batchId)
        .order('pair');

      setAlignments((data as EmaAlignment[]) || []);
    } catch (e) {
      console.error('Fetch scan error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLatestScan();
  }, [fetchLatestScan]);

  const triggerScan = async () => {
    setScanning(true);
    try {
      const { error } = await supabase.functions.invoke('scan-ema-alignment');
      if (error) throw error;
      await fetchLatestScan();
    } catch (e) {
      console.error('Scan trigger error:', e);
    }
    setScanning(false);
  };

  // Build pair summaries
  const pairSummaries: PairAlignmentSummary[] = (() => {
    const pairMap = new Map<string, EmaAlignment[]>();
    for (const a of alignments) {
      const existing = pairMap.get(a.pair) || [];
      existing.push(a);
      pairMap.set(a.pair, existing);
    }

    return Array.from(pairMap.entries()).map(([pair, rows]) => {
      const get = (tf: string) => rows.find((r) => r.timeframe === tf);
      const checkEma = (row: EmaAlignment | undefined, isBuy: boolean) => {
        if (!row) return { ema_9: false, ema_15: false, ema_200: false, aligned: false };
        const p = Number(row.current_price);
        const e9 = Number(row.ema_9);
        const e15 = Number(row.ema_15);
        const e200 = Number(row.ema_200);
        if (isBuy) {
          return { ema_9: p > e9, ema_15: e9 > e15, ema_200: e15 > e200, aligned: row.is_aligned };
        }
        return { ema_9: p < e9, ema_15: e9 < e15, ema_200: e15 < e200, aligned: row.is_aligned };
      };

      const mainDir = rows.find((r) => r.direction !== 'NONE')?.direction || 'NONE';
      const isBuy = mainDir === 'BUY';

      const aligns = {
        '5min': checkEma(get('5min'), isBuy),
        '15min': checkEma(get('15min'), isBuy),
        '1h': checkEma(get('1h'), isBuy),
      };

      const score = Object.values(aligns).reduce((s, a) => {
        return s + (a.ema_9 ? 1 : 0) + (a.ema_15 ? 1 : 0) + (a.ema_200 ? 1 : 0);
      }, 0);

      return {
        pair,
        direction: mainDir,
        alignments: aligns,
        score,
        scanned_at: rows[0]?.scanned_at || '',
      };
    }).sort((a, b) => b.score - a.score);
  })();

  const bullishCount = pairSummaries.filter((p) => p.direction === 'BUY' && p.score >= 6).length;
  const bearishCount = pairSummaries.filter((p) => p.direction === 'SELL' && p.score >= 6).length;

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_15px_hsla(142,71%,45%,0.2)]">
            <Crosshair className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">EMA Alignment Scanner</h1>
            <p className="text-xs text-muted-foreground">Multi-timeframe EMA 9/15/200 alignment detection</p>
          </div>
        </div>
        <Button
          onClick={triggerScan}
          disabled={scanning}
          className="bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30"
        >
          {scanning ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {scanning ? 'Scanning...' : 'Scan Now'}
        </Button>
      </div>

      {/* Summary */}
      <ScanSummary
        totalScanned={pairSummaries.length}
        bullishCount={bullishCount}
        bearishCount={bearishCount}
        lastScanTime={lastScan}
      />

      {/* Detail View */}
      {selectedPair && (
        <EmaDetailView
          pair={selectedPair}
          alignments={alignments.filter((a) => a.pair === selectedPair)}
          onClose={() => setSelectedPair(null)}
        />
      )}

      {/* Aligned Pairs Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : pairSummaries.length === 0 ? (
        <div className="text-center py-20">
          <Crosshair className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No scan data yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Click "Scan Now" to run your first EMA alignment scan</p>
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Alignment Results</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pairSummaries.map((p) => (
                <AlignmentCard
                  key={p.pair}
                  data={p}
                  onClick={() => setSelectedPair(p.pair)}
                />
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground border-t border-border/20 pt-3">
            <span>✅ = EMA aligned in order</span>
            <span>❌ = Not aligned</span>
            <span>Score = aligned checks out of 9 (3 EMAs × 3 timeframes)</span>
          </div>
        </>
      )}
    </div>
  );
}
