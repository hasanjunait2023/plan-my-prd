import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ImpactBadge } from './ImpactBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarClock, Filter, Clock } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { format, parseISO, isToday, isTomorrow, isThisWeek, differenceInMinutes, differenceInSeconds, isPast } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface CalendarEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
  actual: string;
}

interface EconomicCalendarProps {
  events: CalendarEvent[];
  isLoading: boolean;
}

const currencyFlags: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', AUD: '🇦🇺',
  CAD: '🇨🇦', CHF: '🇨🇭', NZD: '🇳🇿', CNY: '🇨🇳',
};

const goldMovers = ['cpi', 'ppi', 'interest rate', 'inflation', 'fed', 'fomc', 'gold', 'non-farm', 'nonfarm', 'employment', 'gdp'];

type DateFilter = 'today' | 'tomorrow' | 'week';
type ImpactFilter = 'all' | 'high' | 'medium';

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (isPast(targetDate)) {
    return <span className="text-[10px] text-muted-foreground">Published</span>;
  }

  const totalSeconds = differenceInSeconds(targetDate, now);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return (
      <span className="text-[10px] font-mono text-primary/80">
        {hours}h {mins}m
      </span>
    );
  }

  return (
    <span className={`text-[10px] font-mono ${mins <= 5 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
      {mins}m {secs.toString().padStart(2, '0')}s
    </span>
  );
}

export function EconomicCalendar({ events, isLoading }: EconomicCalendarProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('all');

  const filtered = useMemo(() => {
    return events.filter((e) => {
      // Date filter
      try {
        const eventDate = parseISO(e.date);
        if (dateFilter === 'today' && !isToday(eventDate)) return false;
        if (dateFilter === 'tomorrow' && !isTomorrow(eventDate)) return false;
        if (dateFilter === 'week' && !isThisWeek(eventDate)) return false;
      } catch {
        return false;
      }

      // Impact filter
      if (impactFilter === 'high' && e.impact.toLowerCase() !== 'high') return false;
      if (impactFilter === 'medium' && !['high', 'medium'].includes(e.impact.toLowerCase())) return false;

      return true;
    });
  }, [events, dateFilter, impactFilter]);

  const isGoldMover = (title: string) => goldMovers.some(k => title.toLowerCase().includes(k));

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Economic Calendar</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {(['today', 'tomorrow', 'week'] as DateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                dateFilter === f
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              {f === 'today' ? 'Today' : f === 'tomorrow' ? 'Tomorrow' : 'This Week'}
            </button>
          ))}
          <span className="w-px h-4 bg-border/50 mx-1" />
          <button
            onClick={() => setImpactFilter(impactFilter === 'all' ? 'high' : impactFilter === 'high' ? 'medium' : 'all')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
          >
            <Filter className="w-3 h-3" />
            {impactFilter === 'all' ? 'All' : impactFilter === 'high' ? 'High Only' : 'Med+'}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No events found for this filter
        </div>
      ) : (
        <div className="rounded-lg border border-border/30 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-[11px] font-semibold w-[80px]">Time</TableHead>
                <TableHead className="text-[11px] font-semibold w-[80px]">Countdown</TableHead>
                <TableHead className="text-[11px] font-semibold w-[70px]">Currency</TableHead>
                <TableHead className="text-[11px] font-semibold w-[70px]">Impact</TableHead>
                <TableHead className="text-[11px] font-semibold">Event</TableHead>
                <TableHead className="text-[11px] font-semibold w-[70px] text-right">Actual</TableHead>
                <TableHead className="text-[11px] font-semibold w-[70px] text-right">Forecast</TableHead>
                <TableHead className="text-[11px] font-semibold w-[70px] text-right">Previous</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e, i) => {
                let timeStr = '';
                try {
                  timeStr = format(parseISO(e.date), 'HH:mm');
                } catch {
                  timeStr = '--:--';
                }
                const isGold = isGoldMover(e.title);

                return (
                  <TableRow key={i} className={`hover:bg-muted/20 ${isGold ? 'bg-warning/[0.03]' : ''}`}>
                    <TableCell className="text-xs font-mono text-muted-foreground">{timeStr}</TableCell>
                    <TableCell>
                      <span className="text-xs font-medium">
                        {currencyFlags[e.country] || ''} {e.country}
                      </span>
                    </TableCell>
                    <TableCell><ImpactBadge impact={e.impact} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground">{e.title}</span>
                        {isGold && <Badge variant="outline" className="text-[9px] px-1 py-0 border-warning/40 text-warning">🥇 Gold</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className={`text-xs text-right font-mono ${e.actual ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                      {e.actual || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">{e.forecast || '—'}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">{e.previous || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
