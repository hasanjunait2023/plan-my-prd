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
  { name: 'New York', startUtc: 13, endUtc: 22, color: '#ff5d00', emoji: '🟠' },
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
  let nowMin = h * 60 + m;
  if (s.startUtc > s.endUtc && h < s.endUtc) endMin = s.endUtc * 60;
  else if (s.startUtc > s.endUtc) endMin = (s.endUtc + 24) * 60;
  let diff = endMin - nowMin;
  if (diff <= 0) diff += 24 * 60;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left`;
}

function timeUntil(s: Session, h: number, m: number): string {
  let startMin = s.startUtc * 60;
  let nowMin = h * 60 + m;
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
  const [now, setNow] = useState(new Date());

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
    <div className="rounded-lg border border-border/40 bg-card/60 backdrop-blur-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
          Market Sessions
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
          UTC {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {SESSIONS.map(s => {
          const active = isActive(s, h, m);
          return (
            <div
              key={s.name}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5"
              style={{
                backgroundColor: active ? `${s.color}15` : 'transparent',
                border: `1px solid ${active ? `${s.color}40` : 'hsl(var(--border) / 0.2)'}`,
              }}
            >
              <span className="text-sm">{s.emoji}</span>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium truncate" style={{ color: active ? s.color : 'hsl(var(--muted-foreground))' }}>
                  {s.name}
                </span>
                <span className="text-[9px] text-muted-foreground/60 font-mono">
                  {formatUtc(s.startUtc)}–{formatUtc(s.endUtc)} UTC
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {active ? timeLeft(s, h, m) : timeUntil(s, h, m)}
                </span>
              </div>
              <Badge
                variant={active ? 'default' : 'outline'}
                className="ml-auto text-[9px] px-1.5 py-0 h-4 shrink-0"
                style={active ? { backgroundColor: s.color, color: '#fff', borderColor: s.color } : {}}
              >
                {active ? 'ON' : 'OFF'}
              </Badge>
            </div>
          );
        })}
      </div>

      {overlaps && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>⚡</span>
          <span>Overlap: <span className="text-foreground font-medium">{overlaps}</span></span>
        </div>
      )}
    </div>
  );
}
