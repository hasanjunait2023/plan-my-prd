import { useState, useEffect } from 'react';
import {
  MARKET_SESSIONS,
  getSessionHours,
  isSessionActive,
  sessionTimeLeft,
  isForexClosed,
  formatBDTime,
} from '@/lib/timezone';

export function CompactSessionBar() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const marketClosed = isForexClosed(now);
  const bdTime = formatBDTime(now);

  const activeSessions = MARKET_SESSIONS.filter(s => {
    if (marketClosed) return false;
    const hours = getSessionHours(s, now);
    return isSessionActive(hours.start, hours.end, h, m);
  });

  return (
    <div className="flex items-center gap-3 text-xs">
      {marketClosed ? (
        <span className="text-red-400 font-semibold flex items-center gap-1">
          🚫 Market Closed
        </span>
      ) : activeSessions.length > 0 ? (
        activeSessions.map(s => {
          const hours = getSessionHours(s, now);
          const timeLeft = sessionTimeLeft(hours.start, hours.end, h, m);
          return (
            <span
              key={s.name}
              className="flex items-center gap-1.5 font-semibold"
              style={{ color: s.color }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: s.color }} />
              {s.emoji} {s.name.split(' ')[0]} LIVE
              <span className="text-muted-foreground font-normal">• {timeLeft}</span>
            </span>
          );
        })
      ) : (
        <span className="text-muted-foreground">No active session</span>
      )}
      <span className="ml-auto text-foreground/70 font-mono font-semibold bg-muted/20 px-2 py-0.5 rounded border border-border/20">
        🇧🇩 {bdTime}
      </span>
    </div>
  );
}
