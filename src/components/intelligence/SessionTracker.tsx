import { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MARKET_SESSIONS,
  KILL_ZONES,
  getSessionHours,
  getKillZoneHours,
  isSessionActive,
  isForexClosed,
  formatBDTime,
  formatBDHourRange,
} from '@/lib/timezone';

function getTimeUntil(currentHour: number, targetHour: number): number {
  if (targetHour > currentHour) return targetHour - currentHour;
  return 24 - currentHour + targetHour;
}

export function SessionTracker() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const marketClosed = isForexClosed(now);
  const bdTime = formatBDTime(now);

  const sessionsWithState = MARKET_SESSIONS.map(s => {
    const hours = getSessionHours(s, now);
    const isActive = !marketClosed && isSessionActive(hours.start, hours.end, utcHour, utcMin);
    const totalHours = ((hours.end - hours.start + 24) % 24) || 24;
    const hoursLeft = isActive ? getTimeUntil(utcHour, hours.end) : 0;
    const progress = isActive ? ((totalHours - hoursLeft) / totalHours) * 100 : 0;
    return { ...s, hours, isActive, hoursLeft, progress };
  });

  const killZonesWithState = KILL_ZONES.map(kz => {
    const hours = getKillZoneHours(kz, now);
    const isActive = !marketClosed && isSessionActive(hours.start, hours.end, utcHour, utcMin);
    return { ...kz, hours, isActive };
  });

  const activeSessions = sessionsWithState.filter(s => s.isActive);
  const activeKillZones = killZonesWithState.filter(k => k.isActive);
  const isOverlap = activeSessions.length >= 2;

  const inactiveSessions = sessionsWithState.filter(s => !s.isActive);
  const nextSession = inactiveSessions.sort((a, b) =>
    getTimeUntil(utcHour, a.hours.start) - getTimeUntil(utcHour, b.hours.start)
  )[0];

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-primary" />
            </div>
            <CardTitle className="text-sm font-bold">Session Tracker</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {marketClosed && (
              <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                🚫 CLOSED
              </span>
            )}
            <span className="text-[10px] text-foreground font-mono font-semibold">
              🇧🇩 {bdTime}
            </span>
            <span className="text-[9px] text-muted-foreground/50 font-mono">
              UTC {String(utcHour).padStart(2, '0')}:{String(utcMin).padStart(2, '0')}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {sessionsWithState.map(session => {
            const bdRange = formatBDHourRange(session.hours.start, session.hours.end);
            return (
              <div key={session.name} className={`rounded-lg p-2.5 border transition-all ${
                session.isActive ? 'border-border/40 bg-muted/20' : 'border-transparent bg-muted/5'
              }`} style={{ opacity: marketClosed ? 0.5 : 1 }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{
                      backgroundColor: session.color,
                      boxShadow: session.isActive ? `0 0 8px ${session.color}` : 'none'
                    }} />
                    <span className={`text-xs font-semibold ${session.isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {session.name}
                    </span>
                    {session.isActive && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-foreground/70 font-mono">
                      🇧🇩 {bdRange}
                    </span>
                    <span className="text-[8px] text-muted-foreground/40 font-mono">
                      UTC {String(session.hours.start).padStart(2, '0')}:00–{String(session.hours.end).padStart(2, '0')}:00
                    </span>
                  </div>
                </div>
                {session.isActive && (
                  <>
                    <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${session.progress}%`,
                        backgroundColor: session.color,
                      }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-muted-foreground">~{session.hoursLeft}h left</span>
                      <div className="flex gap-1">
                        {session.bestPairs.map(p => (
                          <span key={p} className="text-[8px] px-1 py-0.5 rounded bg-muted/30 text-muted-foreground">{p}</span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {isOverlap && !marketClosed && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[11px] font-semibold text-yellow-400">
              Session Overlap — {activeSessions.map(s => s.name).join(' + ')} — High Volatility!
            </span>
          </div>
        )}

        {activeKillZones.length > 0 && !marketClosed && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary">
              Kill Zone Active: {activeKillZones.map(k => {
                const bdRange = formatBDHourRange(k.hours.start, k.hours.end);
                return `${k.name} (🇧🇩 ${bdRange})`;
              }).join(', ')}
            </span>
          </div>
        )}

        {nextSession && !isOverlap && activeSessions.length < 4 && !marketClosed && (
          <div className="text-[10px] text-muted-foreground text-center">
            Next: <span className="font-semibold text-foreground">{nextSession.name}</span> in {getTimeUntil(utcHour, nextSession.hours.start)}h
          </div>
        )}

        {marketClosed && (
          <div className="text-[10px] text-muted-foreground text-center">
            Market opens Sunday 🇧🇩 04:00 (Sydney)
          </div>
        )}
      </CardContent>
    </Card>
  );
}
