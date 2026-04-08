// Bangladesh Standard Time (UTC+6) — Central timezone utility
export const BD_OFFSET = 6;

export function toBDTime(date: Date): Date {
  const bdDate = new Date(date.getTime() + BD_OFFSET * 60 * 60 * 1000);
  return bdDate;
}

export function formatBDTime(date: Date, format: 'HH:mm' | 'HH:mm:ss' | 'full' | 'date' = 'HH:mm'): string {
  const bd = toBDTime(date);
  const h = bd.getUTCHours();
  const m = bd.getUTCMinutes();
  const s = bd.getUTCSeconds();
  
  switch (format) {
    case 'HH:mm':
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    case 'HH:mm:ss':
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    case 'date':
      return bd.toISOString().split('T')[0];
    case 'full':
      return `${bd.toISOString().split('T')[0]} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    default:
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}

export function getBDHour(date: Date): number {
  return toBDTime(date).getUTCHours();
}

export function getBDMinute(date: Date): number {
  return toBDTime(date).getUTCMinutes();
}

// Convert a UTC hour to BD hour
export function utcToBDHour(utcHour: number): number {
  return (utcHour + BD_OFFSET) % 24;
}

// Format a UTC hour as BD time string
export function formatBDHourRange(startUtc: number, endUtc: number): string {
  const startBD = utcToBDHour(startUtc);
  const endBD = utcToBDHour(endUtc);
  return `${String(startBD).padStart(2, '0')}:00–${String(endBD).padStart(2, '0')}:00`;
}

// DST Detection
type DSTRegion = 'US' | 'EU' | 'AU';

export function isDST(region: DSTRegion, date: Date): boolean {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-indexed
  
  switch (region) {
    case 'US': {
      // US DST: 2nd Sunday of March → 1st Sunday of November
      const marchStart = getNthSunday(year, 2, 2); // 2nd Sunday of March (month 2)
      const novEnd = getNthSunday(year, 10, 1); // 1st Sunday of November (month 10)
      return date >= marchStart && date < novEnd;
    }
    case 'EU': {
      // EU DST: Last Sunday of March → Last Sunday of October
      const marchStart = getLastSunday(year, 2); // March
      const octEnd = getLastSunday(year, 9); // October
      return date >= marchStart && date < octEnd;
    }
    case 'AU': {
      // Australia DST (AEDT): 1st Sunday of October → 1st Sunday of April
      // Note: Southern hemisphere — DST is Oct-Apr
      const octStart = getNthSunday(year, 9, 1); // 1st Sunday of October
      const aprEnd = getNthSunday(year, 3, 1); // 1st Sunday of April
      // DST active if after Oct start OR before Apr end
      return date >= octStart || date < aprEnd;
    }
    default:
      return false;
  }
}

function getNthSunday(year: number, month: number, n: number): Date {
  const first = new Date(Date.UTC(year, month, 1));
  const firstSunday = first.getUTCDay() === 0 ? 1 : 8 - first.getUTCDay();
  return new Date(Date.UTC(year, month, firstSunday + (n - 1) * 7, 2)); // 2:00 UTC approx
}

function getLastSunday(year: number, month: number): Date {
  const last = new Date(Date.UTC(year, month + 1, 0));
  const offset = last.getUTCDay();
  return new Date(Date.UTC(year, month, last.getUTCDate() - offset, 1)); // 1:00 UTC approx
}

// Market session config with DST awareness
export interface SessionConfig {
  name: string;
  dstRegion: DSTRegion | null;
  winterStartUtc: number;
  winterEndUtc: number;
  summerStartUtc: number;
  summerEndUtc: number;
  color: string;
  emoji: string;
  bestPairs: string[];
}

export const MARKET_SESSIONS: SessionConfig[] = [
  {
    name: 'Sydney',
    dstRegion: 'AU',
    winterStartUtc: 22, winterEndUtc: 7,
    summerStartUtc: 21, summerEndUtc: 6,
    color: '#ffeb3b', emoji: '🟡',
    bestPairs: ['AUD/USD', 'NZD/USD', 'AUD/JPY'],
  },
  {
    name: 'Tokyo',
    dstRegion: null, // Japan has no DST
    winterStartUtc: 0, winterEndUtc: 9,
    summerStartUtc: 0, summerEndUtc: 9,
    color: '#e91e63', emoji: '🔴',
    bestPairs: ['USD/JPY', 'AUD/JPY', 'NZD/JPY'],
  },
  {
    name: 'London',
    dstRegion: 'EU',
    winterStartUtc: 7, winterEndUtc: 16,
    summerStartUtc: 6, summerEndUtc: 15,
    color: '#2157f3', emoji: '🔵',
    bestPairs: ['EUR/USD', 'GBP/USD', 'EUR/GBP'],
  },
  {
    name: 'New York',
    dstRegion: 'US',
    winterStartUtc: 12, winterEndUtc: 21,
    summerStartUtc: 11, summerEndUtc: 20,
    color: '#ff5d00', emoji: '🟠',
    bestPairs: ['EUR/USD', 'GBP/USD', 'USD/CAD'],
  },
];

export function getSessionHours(session: SessionConfig, date: Date): { start: number; end: number } {
  if (!session.dstRegion) {
    return { start: session.winterStartUtc, end: session.winterEndUtc };
  }
  const dst = isDST(session.dstRegion, date);
  return dst
    ? { start: session.summerStartUtc, end: session.summerEndUtc }
    : { start: session.winterStartUtc, end: session.winterEndUtc };
}

// Kill zones with DST awareness
export interface KillZoneConfig {
  name: string;
  dstRegion: DSTRegion;
  winterStartUtc: number;
  winterEndUtc: number;
  summerStartUtc: number;
  summerEndUtc: number;
  color: string;
}

export const KILL_ZONES: KillZoneConfig[] = [
  { name: 'Asian KZ', dstRegion: 'AU', winterStartUtc: 0, winterEndUtc: 2, summerStartUtc: 0, summerEndUtc: 2, color: 'hsl(35, 90%, 55%)' },
  { name: 'London KZ', dstRegion: 'EU', winterStartUtc: 7, winterEndUtc: 9, summerStartUtc: 6, summerEndUtc: 8, color: 'hsl(210, 80%, 55%)' },
  { name: 'NY KZ', dstRegion: 'US', winterStartUtc: 12, winterEndUtc: 14, summerStartUtc: 11, summerEndUtc: 13, color: 'hsl(0, 70%, 55%)' },
];

export function getKillZoneHours(kz: KillZoneConfig, date: Date): { start: number; end: number } {
  const dst = isDST(kz.dstRegion, date);
  return dst
    ? { start: kz.summerStartUtc, end: kz.summerEndUtc }
    : { start: kz.winterStartUtc, end: kz.winterEndUtc };
}

// Forex market closure check
const FOREX_HOLIDAYS = ['12-25', '01-01']; // MM-DD format

export function isForexClosed(date: Date): boolean {
  const day = date.getUTCDay(); // 0=Sun, 6=Sat
  const hour = date.getUTCHours();
  
  // Saturday: fully closed
  if (day === 6) return true;
  // Friday after 21:00 UTC (NY close): closed
  if (day === 5 && hour >= 21) return true;
  // Sunday before 22:00 UTC (Sydney open): closed
  if (day === 0 && hour < 22) return true;
  
  // Holiday check
  const monthDay = `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  if (FOREX_HOLIDAYS.includes(monthDay)) return true;
  
  return false;
}

// Check if a session is active
export function isSessionActive(startUtc: number, endUtc: number, h: number, m: number): boolean {
  if (startUtc < endUtc) return h >= startUtc && (h < endUtc || (h === endUtc && m === 0));
  // Wraps midnight
  return h >= startUtc || h < endUtc;
}

// Time left in active session
export function sessionTimeLeft(startUtc: number, endUtc: number, h: number, m: number): string {
  let endMin = endUtc * 60;
  const nowMin = h * 60 + m;
  if (startUtc > endUtc && h < endUtc) endMin = endUtc * 60;
  else if (startUtc > endUtc) endMin = (endUtc + 24) * 60;
  let diff = endMin - nowMin;
  if (diff <= 0) diff += 24 * 60;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left`;
}

// Time until session starts
export function sessionTimeUntil(startUtc: number, h: number, m: number): string {
  const startMin = startUtc * 60;
  const nowMin = h * 60 + m;
  let diff = startMin - nowMin;
  if (diff <= 0) diff += 24 * 60;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return hrs > 0 ? `starts in ${hrs}h ${mins}m` : `starts in ${mins}m`;
}

// Progress percentage of active session
export function sessionProgress(startUtc: number, endUtc: number, h: number, m: number): number {
  const total = ((endUtc - startUtc + 24) % 24 || 24) * 60;
  const elapsed = ((h - startUtc + 24) % 24) * 60 + m;
  return Math.min(Math.max(elapsed / total, 0), 1) * 100;
}
