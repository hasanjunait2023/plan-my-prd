import { useCallback, useEffect, useRef, useState } from 'react';
import { X, GripHorizontal, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFloatingWatchlist } from '@/contexts/FloatingWatchlistContext';
import { getPairFlags } from '@/lib/pairFlags';
import { cn } from '@/lib/utils';
import AdvancedChartEmbed from '@/components/charts/AdvancedChartEmbed';
import TimeframePills from '@/components/charts/TimeframePills';
import { useStrengthSnapshot } from '@/hooks/useCurrencyStrengths';
import { PairStrengthBadges } from './StrengthBadge';

const STORAGE_KEY = 'chart-window-state';
const TF_KEY = 'chart-window-tf';

interface WinState {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DEFAULT_W = 720;
const DEFAULT_H = 520;
const MIN_W = 480;
const MIN_H = 360;

const TIMEFRAMES: { label: string; value: string }[] = [
  { label: '3M', value: '3' },
  { label: '15M', value: '15' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: 'D', value: 'D' },
];

const RANGES: { label: string; value: string }[] = [
  { label: 'Auto', value: 'AUTO' },
  { label: '1H', value: '60M' },
  { label: '4H', value: '4H' },
  { label: '1D', value: '1D' },
  { label: '1W', value: '5D' },
  { label: '1M', value: '1M' },
];


function loadState(): WinState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s?.x === 'number' && typeof s?.y === 'number' && typeof s?.w === 'number' && typeof s?.h === 'number') {
      return s;
    }
  } catch {}
  return null;
}

function loadTf(): string {
  try {
    return localStorage.getItem(TF_KEY) || '60';
  } catch {
    return '60';
  }
}

export function FloatingChartWindow() {
  const isMobile = useIsMobile();
  const { chartItem, closeChart, openWatchlist } = useFloatingWatchlist();
  const snapshot = useStrengthSnapshot();
  const strengths = snapshot.data;

  const handleBack = useCallback(() => {
    closeChart();
    openWatchlist();
  }, [closeChart, openWatchlist]);
  const [state, setState] = useState<WinState>(() => {
    const saved = loadState();
    if (saved) return saved;
    if (typeof window !== 'undefined') {
      return {
        x: Math.max(20, (window.innerWidth - DEFAULT_W) / 2),
        y: Math.max(20, (window.innerHeight - DEFAULT_H) / 2),
        w: DEFAULT_W,
        h: DEFAULT_H,
      };
    }
    return { x: 40, y: 40, w: DEFAULT_W, h: DEFAULT_H };
  });
  const [tf, setTf] = useState<string>(loadTf);
  const [rangeOverride, setRangeOverride] = useState<string>('AUTO');
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; orig: WinState }>({ startX: 0, startY: 0, orig: state });

  // Persist
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);
  useEffect(() => {
    try { localStorage.setItem(TF_KEY, tf); } catch {}
  }, [tf]);

  // Drag header
  const onHeaderDown = useCallback((e: React.PointerEvent) => {
    if (isMobile) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, orig: state };
    setDragging(true);
  }, [isMobile, state]);

  const onHeaderMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setState((s) => ({
      ...s,
      x: Math.max(0, Math.min(window.innerWidth - s.w, dragRef.current.orig.x + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.orig.y + dy)),
    }));
  }, [dragging]);

  const onHeaderUp = useCallback(() => setDragging(false), []);

  // Resize
  const onResizeDown = useCallback((e: React.PointerEvent) => {
    if (isMobile) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, orig: state };
    setResizing(true);
  }, [isMobile, state]);

  const onResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizing) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setState((s) => ({
      ...s,
      w: Math.max(MIN_W, Math.min(window.innerWidth - s.x, dragRef.current.orig.w + dx)),
      h: Math.max(MIN_H, Math.min(window.innerHeight - s.y, dragRef.current.orig.h + dy)),
    }));
  }, [resizing]);

  const onResizeUp = useCallback(() => setResizing(false), []);

  if (!chartItem) return null;

  const { base, quote } = getPairFlags(chartItem.symbol);
  const baseCur = chartItem.symbol.slice(0, 3);
  const quoteCur = chartItem.symbol.slice(3, 6);
  const baseEntry = strengths[baseCur];
  const quoteEntry = strengths[quoteCur];

  // Mobile: full screen overlay
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 bg-background flex flex-col"
        style={{ zIndex: 9997 }}
      >
        <div className="flex items-center gap-2 px-2 py-2 border-b border-border/40 bg-card/60">
          {/* Back button → returns to watchlist */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 active:bg-primary/30 text-primary border border-primary/30 transition shrink-0"
            aria-label="Back to watchlist"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[11px] font-bold">Back</span>
          </button>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xl shrink-0">{base}{quote}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{chartItem.symbol}</div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {(baseEntry || quoteEntry) && (
                  <PairStrengthBadges
                    base={baseCur}
                    quote={quoteCur}
                    baseTier={baseEntry?.tier}
                    quoteTier={quoteEntry?.tier}
                    baseStrength={baseEntry?.strength}
                    quoteStrength={quoteEntry?.strength}
                    size="sm"
                  />
                )}
                {snapshot.timeframe && (
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                    {snapshot.timeframe}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={closeChart}
            className="p-2 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Close chart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center px-2 py-1 border-b border-border/30 bg-card/40 shrink-0">
          <TimeframePills value={tf} onChange={setTf} />
        </div>
        <div className="flex-1 min-h-0">
          <AdvancedChartEmbed
            symbol={chartItem.tvSymbol}
            interval={tf}
            height="100%"
            hideTopToolbar={false}
            hideSideToolbar={true}
          />
        </div>
      </div>
    );
  }

  // Desktop: floating draggable+resizable window
  return (
    <div
      className="fixed shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-border/50 rounded-xl overflow-hidden bg-background flex flex-col"
      style={{
        left: state.x,
        top: state.y,
        width: state.w,
        height: state.h,
        zIndex: 9997,
      }}
    >
      {/* Header */}
      <div
        onPointerDown={onHeaderDown}
        onPointerMove={onHeaderMove}
        onPointerUp={onHeaderUp}
        onPointerCancel={onHeaderUp}
        className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-card/80 backdrop-blur cursor-move select-none"
        style={{ touchAction: 'none' }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GripHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-lg shrink-0">{base}{quote}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold truncate">{chartItem.symbol}</span>
              {(baseEntry || quoteEntry) && (
                <PairStrengthBadges
                  base={baseCur}
                  quote={quoteCur}
                  baseTier={baseEntry?.tier}
                  quoteTier={quoteEntry?.tier}
                  baseStrength={baseEntry?.strength}
                  quoteStrength={quoteEntry?.strength}
                />
              )}
              {snapshot.timeframe && (
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                  {snapshot.timeframe}
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">{chartItem.name}</div>
          </div>
        </div>

        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <button
            onClick={handleBack}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition mr-1"
            aria-label="Back to watchlist"
            title="Back to watchlist"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <button
            onClick={closeChart}
            className="ml-1 p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            aria-label="Close chart"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0">
        <AdvancedChartEmbed
          symbol={chartItem.tvSymbol}
          interval={tf}
          height="100%"
          hideTopToolbar={false}
          hideSideToolbar={true}
        />
      </div>

      {/* Resize handle */}
      <div
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        onPointerCancel={onResizeUp}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-transparent"
        style={{
          touchAction: 'none',
          backgroundImage:
            'linear-gradient(135deg, transparent 0%, transparent 50%, hsl(var(--muted-foreground)) 50%, hsl(var(--muted-foreground)) 60%, transparent 60%, transparent 70%, hsl(var(--muted-foreground)) 70%, hsl(var(--muted-foreground)) 80%, transparent 80%)',
        }}
        aria-label="Resize"
      />
    </div>
  );
}
