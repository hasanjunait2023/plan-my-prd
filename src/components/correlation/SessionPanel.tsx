import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  MARKET_SESSIONS,
  getSessionHours,
  isSessionActive,
  sessionTimeLeft,
  sessionTimeUntil,
  sessionProgress,
  isForexClosed,
  formatBDTime,
  utcToBDHour,
  formatBDHourRange,
} from '@/lib/timezone';

export function SessionPanel() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const marketClosed = isForexClosed(now);
  const bdTime = formatBDTime(now);

  const sessionsWithHours = MARKET_SESSIONS.map(s => {
    const hours = getSessionHours(s, now);
    const active = !marketClosed && isSessionActive(hours.start, hours.end, h, m);
    const progress = active ? sessionProgress(hours.start, hours.end, h, m) : 0;
    return { ...s, hours, active, progress };
  });

  const activeSessions = sessionsWithHours.filter(s => s.active);
  const overlaps = activeSessions.length > 1
    ? activeSessions.map(s => s.name.split(' ')[0]).join(' + ')
    : null;

  return (
    <div className="relative rounded-xl border border-border/20 bg-card/80 backdrop-blur-xl shadow-lg overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-muted-foreground tracking-[0.15em] uppercase">
            Market Sessions
          </span>
          <div className="flex items-center gap-2">
            {marketClosed && (
              <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                🚫 MARKET CLOSED
              </span>
            )}
            {overlaps && !marketClosed && (
              <span className="text-[10px] text-primary font-semibold flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {overlaps} Overlap
              </span>
            )}
            <span className="text-[11px] text-foreground font-mono font-semibold bg-muted/20 px-2 py-0.5 rounded-md border border-border/20">
              🇧🇩 {bdTime}
            </span>
            <span className="text-[9px] text-muted-foreground/50 font-mono">
              UTC {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {sessionsWithHours.map(s => {
            const bdRange = formatBDHourRange(s.hours.start, s.hours.end);
            return (
              <div
                key={s.name}
                className="flex flex-col gap-1.5 rounded-lg px-3 py-2 transition-all duration-300"
                style={{
                  backgroundColor: s.active ? `${s.color}12` : 'hsla(0,0%,100%,0.02)',
                  border: `1px solid ${s.active ? `${s.color}35` : 'hsla(0,0%,100%,0.05)'}`,
                  boxShadow: s.active ? `0 0 16px ${s.color}10, inset 0 1px 0 ${s.color}15` : 'none',
                  opacity: marketClosed ? 0.5 : 1,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{s.emoji}</span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ color: s.active ? s.color : 'hsl(var(--muted-foreground))' }}
                      >
                        {s.name}
                      </span>
                      <Badge
                        variant={s.active ? 'default' : 'outline'}
                        className="text-[8px] px-1.5 py-0 h-3.5 shrink-0 font-bold tracking-wider"
                        style={s.active ? { backgroundColor: s.color, color: '#fff', borderColor: s.color } : { opacity: 0.5 }}
                      >
                        {marketClosed ? 'CLOSED' : s.active ? 'LIVE' : 'OFF'}
                      </Badge>
                    </div>
                    <span className="text-[9px] text-foreground/70 font-mono font-medium">
                      🇧🇩 {bdRange}
                    </span>
                    <span className="text-[8px] text-muted-foreground/40 font-mono">
                      UTC {String(s.hours.start).padStart(2, '0')}:00–{String(s.hours.end).padStart(2, '0')}:00
                    </span>
                    {!marketClosed && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {s.active ? sessionTimeLeft(s.hours.start, s.hours.end, h, m) : sessionTimeUntil(s.hours.start, h, m)}
                      </span>
                    )}
                  </div>
                </div>
                {s.active && (
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${s.color}15` }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${s.progress}%`,
                        background: `linear-gradient(90deg, ${s.color}90, ${s.color})`,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
