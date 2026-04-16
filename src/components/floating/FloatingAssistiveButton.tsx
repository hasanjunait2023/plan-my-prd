import { useEffect, useRef, useState, useCallback } from 'react';
import { LineChart } from 'lucide-react';
import { useFloatingWatchlist } from '@/contexts/FloatingWatchlistContext';

const STORAGE_KEY = 'fab-position';
const SIZE = 56;
const EDGE_PADDING = 8;

interface Pos { x: number; y: number; }

function loadPos(): Pos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.x === 'number' && typeof p?.y === 'number') return p;
  } catch { }
  return null;
}

export function FloatingAssistiveButton() {
  const { openWatchlist } = useFloatingWatchlist();
  const [pos, setPos] = useState<Pos>(() => {
    const saved = loadPos();
    if (saved) return saved;
    if (typeof window !== 'undefined') {
      return {
        x: window.innerWidth - SIZE - EDGE_PADDING - 8,
        y: window.innerHeight - SIZE - EDGE_PADDING - 100,
      };
    }
    return { x: 16, y: 200 };
  });
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean }>({
    startX: 0, startY: 0, origX: 0, origY: 0, moved: false,
  });
  const btnRef = useRef<HTMLButtonElement>(null);

  // Keep within viewport on resize
  useEffect(() => {
    const onResize = () => {
      setPos((p) => ({
        x: Math.max(EDGE_PADDING, Math.min(window.innerWidth - SIZE - EDGE_PADDING, p.x)),
        y: Math.max(EDGE_PADDING, Math.min(window.innerHeight - SIZE - EDGE_PADDING, p.y)),
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
    };
    setDragging(true);
  }, [pos.x, pos.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragState.current.moved = true;

    const newX = Math.max(EDGE_PADDING, Math.min(window.innerWidth - SIZE - EDGE_PADDING, dragState.current.origX + dx));
    const newY = Math.max(EDGE_PADDING, Math.min(window.innerHeight - SIZE - EDGE_PADDING, dragState.current.origY + dy));
    setPos({ x: newX, y: newY });
  }, [dragging]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    const moved = dragState.current.moved;

    if (!moved) {
      // Treat as click
      openWatchlist();
      return;
    }

    // Snap to nearest horizontal edge
    setPos((p) => {
      const mid = window.innerWidth / 2;
      const snappedX = p.x + SIZE / 2 < mid ? EDGE_PADDING : window.innerWidth - SIZE - EDGE_PADDING;
      const snapped = { x: snappedX, y: p.y };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapped)); } catch { }
      return snapped;
    });
  }, [dragging, openWatchlist]);

  return (
    <button
      ref={btnRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label="Open watchlist"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: SIZE,
        height: SIZE,
        zIndex: 9999,
        touchAction: 'none',
        transition: dragging ? 'none' : 'left 220ms cubic-bezier(0.22, 1, 0.36, 1), top 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      className="rounded-full flex items-center justify-center bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_24px_hsla(145,63%,49%,0.45)] active:scale-95 hover:scale-105 transition-transform"
    >
      <LineChart className="w-6 h-6 drop-shadow" />
    </button>
  );
}
