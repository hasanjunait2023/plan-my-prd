import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface Session {
  name: string;
  startUtc: number;
  endUtc: number;
  color: string;
  emoji: string;
}

function formatUtc(h: number) {
  return `${String(h).padStart(2, '0')}:00`;
}

const SESSIONS: Session[] = [
  { name: 'New York', startUtc: 12, endUtc: 21, color: '#ff5d00', emoji: '🟠' },
  { name: 'London', startUtc: 7, endUtc: 16, color: '#2157f3', emoji: '🔵' },
  { name: 'Tokyo', startUtc: 0, endUtc: 9, color: '#e91e63', emoji: '🔴' },
  { name: 'Sydney', startUtc: 21, endUtc: 6, color: '#ffeb3b', emoji: '🟡' },
];

function isActive(s: Session, h: number, m: number): boolean {
  if (s.startUtc < s.endUtc) return h >= s.startUtc && (h < s.endUtc || (h === s.endUtc && m === 0));
  return h >= s.startUtc || h < s.endUtc;
}

function timeLeft(s: Session, h: number, m: number): string {
  let endMin = s.endUtc * 60;
  const nowMin = h * 60 + m;
  if (s.startUtc > s.endUtc && h < s.endUtc) endMin = s.endUtc * 60;
  else if (s.startUtc > s.endUtc) endMin = (s.endUtc + 24) * 60;
  let diff = endMin - nowMin;
  if (diff <= 0) diff += 24 * 60;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left`;
}

function timeUntil(s: Session, h: number, m: number): string {
  const startMin = s.startUtc * 60;
  const nowMin = h * 60 + m;
  let diff = startMin - nowMin;
  if (diff <= 0) diff += 24 * 60;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return hrs > 0 ? `starts in ${hrs}h ${mins}m` : `starts in ${mins}m`;
}

function getProgress(s: Session, h: number, m: number): number {
  const total = ((s.endUtc - s.startUtc + 24) % 24 || 24) * 60;
  const elapsed = ((h - s.startUtc + 24) % 24) * 60 + m;
  return Math.min(Math.max(elapsed / total, 0), 1) * 100;
}

export function SessionPanel() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const h = now.getUTCHours();
  const m = now.getUTCMinutes();

  const activeSessions = SESSIONS.filter(s => isActive(s, h, m));
  const overlaps = activeSessions.length > 1
    ? activeSessions.map(s => s.name.split(' ')[0]).join(' + ')
    : null;

  return (
    <div className="relative rounded-xl border border-border/20 bg-card/80 backdrop-blur-xl shadow-lg overflow-hidden">
      {/* Subtle top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-muted-foreground tracking-[0.15em] uppercase">
            Market Sessions
          </span>
          <div className="flex items-center gap-2">
            {overlaps && (
              <span className="text-[10px] text-primary font-semibold flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {overlaps} Overlap
              </span>
            )}
            <span className="text-[11px] text-muted-foreground font-mono font-semibold bg-muted/20 px-2 py-0.5 rounded-md border border-border/20">
              UTC {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {SESSIONS.map(s => {
            const active = isActive(s, h, m);
            const progress = active ? getProgress(s, h, m) : 0;
            return (
              <div
                key={s.name}
                className="flex flex-col gap-1.5 rounded-lg px-3 py-2 transition-all duration-300"
                style={{
                  backgroundColor: active ? `${s.color}12` : 'hsla(0,0%,100%,0.02)',
                  border: `1px solid ${active ? `${s.color}35` : 'hsla(0,0%,100%,0.05)'}`,
                  boxShadow: active ? `0 0 16px ${s.color}10, inset 0 1px 0 ${s.color}15` : 'none',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{s.emoji}</span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ color: active ? s.color : 'hsl(var(--muted-foreground))' }}
                      >
                        {s.name}
                      </span>
                      <Badge
                        variant={active ? 'default' : 'outline'}
                        className="text-[8px] px-1.5 py-0 h-3.5 shrink-0 font-bold tracking-wider"
                        style={active ? { backgroundColor: s.color, color: '#fff', borderColor: s.color } : { opacity: 0.5 }}
                      >
                        {active ? 'LIVE' : 'OFF'}
                      </Badge>
                    </div>
                    <span className="text-[9px] text-muted-foreground/50 font-mono">
                      {formatUtc(s.startUtc)}–{formatUtc(s.endUtc)} UTC
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {active ? timeLeft(s, h, m) : timeUntil(s, h, m)}
                    </span>
                  </div>
                </div>
                {active && (
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${s.color}15` }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${progress}%`,
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
