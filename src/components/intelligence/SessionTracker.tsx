import { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SessionInfo {
  name: string;
  startUtc: number;
  endUtc: number;
  color: string;
  bestPairs: string[];
}

const SESSIONS: SessionInfo[] = [
  { name: 'Tokyo', startUtc: 0, endUtc: 9, color: 'hsl(35, 90%, 55%)', bestPairs: ['USD/JPY', 'AUD/JPY', 'NZD/JPY'] },
  { name: 'London', startUtc: 7, endUtc: 16, color: 'hsl(210, 80%, 55%)', bestPairs: ['EUR/USD', 'GBP/USD', 'EUR/GBP'] },
  { name: 'New York', startUtc: 12, endUtc: 21, color: 'hsl(0, 70%, 55%)', bestPairs: ['EUR/USD', 'GBP/USD', 'USD/CAD'] },
];

const KILL_ZONES = [
  { name: 'London KZ', startUtc: 7, endUtc: 9, color: 'hsl(210, 80%, 55%)' },
  { name: 'NY KZ', startUtc: 12, endUtc: 14, color: 'hsl(0, 70%, 55%)' },
  { name: 'Asian KZ', startUtc: 0, endUtc: 2, color: 'hsl(35, 90%, 55%)' },
];

function isInRange(hour: number, start: number, end: number) {
  if (start <= end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

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

  const activeSessions = SESSIONS.filter(s => isInRange(utcHour, s.startUtc, s.endUtc));
  const activeKillZones = KILL_ZONES.filter(k => isInRange(utcHour, k.startUtc, k.endUtc));
  const isOverlap = activeSessions.length >= 2;

  // Next upcoming session
  const inactiveSessions = SESSIONS.filter(s => !isInRange(utcHour, s.startUtc, s.endUtc));
  const nextSession = inactiveSessions.sort((a, b) => 
    getTimeUntil(utcHour, a.startUtc) - getTimeUntil(utcHour, b.startUtc)
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
          <span className="text-[10px] text-muted-foreground font-mono">
            UTC {String(utcHour).padStart(2, '0')}:{String(utcMin).padStart(2, '0')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Session Timeline */}
        <div className="space-y-2">
          {SESSIONS.map(session => {
            const isActive = isInRange(utcHour, session.startUtc, session.endUtc);
            const hoursLeft = isActive ? getTimeUntil(utcHour, session.endUtc) : 0;
            const totalHours = session.endUtc > session.startUtc 
              ? session.endUtc - session.startUtc 
              : 24 - session.startUtc + session.endUtc;
            const progress = isActive ? ((totalHours - hoursLeft) / totalHours) * 100 : 0;

            return (
              <div key={session.name} className={`rounded-lg p-2.5 border transition-all ${
                isActive ? 'border-border/40 bg-muted/20' : 'border-transparent bg-muted/5'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ 
                      backgroundColor: session.color,
                      boxShadow: isActive ? `0 0 8px ${session.color}` : 'none'
                    }} />
                    <span className={`text-xs font-semibold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {session.name}
                    </span>
                    {isActive && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">
                        LIVE
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {String(session.startUtc).padStart(2, '0')}:00 — {String(session.endUtc).padStart(2, '0')}:00
                  </span>
                </div>
                {isActive && (
                  <>
                    <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${progress}%`,
                        backgroundColor: session.color,
                      }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-muted-foreground">~{hoursLeft}h left</span>
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

        {/* Overlap & Kill Zone alerts */}
        {isOverlap && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[11px] font-semibold text-yellow-400">
              Session Overlap — {activeSessions.map(s => s.name).join(' + ')} — High Volatility!
            </span>
          </div>
        )}

        {activeKillZones.length > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary">
              Kill Zone Active: {activeKillZones.map(k => k.name).join(', ')}
            </span>
          </div>
        )}

        {nextSession && !isOverlap && activeSessions.length < 3 && (
          <div className="text-[10px] text-muted-foreground text-center">
            Next: <span className="font-semibold text-foreground">{nextSession.name}</span> in {getTimeUntil(utcHour, nextSession.startUtc)}h
          </div>
        )}
      </CardContent>
    </Card>
  );
}
