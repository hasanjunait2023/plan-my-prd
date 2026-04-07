import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  isSameMonth,
  isToday,
  isBefore,
  isSameDay,
  subMonths,
  addMonths,
  parseISO,
  differenceInDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Trophy, TrendingUp, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface HabitProgressCalendarProps {
  habits: Array<{
    id: string;
    name: string;
    created_at: string;
    active: boolean;
  }>;
  logs: Array<{
    habit_id: string;
    date: string;
    notes?: string;
  }>;
}

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getColorClass(rate: number): string {
  if (rate === 0) return 'bg-muted/20';
  if (rate < 0.25) return 'bg-green-500/20';
  if (rate < 0.5) return 'bg-green-500/35';
  if (rate < 0.75) return 'bg-green-500/55';
  if (rate < 1) return 'bg-green-500/75';
  return 'bg-green-500/90';
}

export function HabitProgressCalendar({ habits, logs }: HabitProgressCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isOpen, setIsOpen] = useState(true);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });

  // Build weeks
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let day = calendarStart;
    while (day <= monthEnd || result.length < 5) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(day);
        day = addDays(day, 1);
      }
      result.push(week);
      if (!isSameMonth(day, currentMonth) && result.length >= 4) break;
    }
    return result;
  }, [currentMonth]);

  // Daily stats
  const dailyStats = useMemo(() => {
    const stats = new Map<string, { completed: string[]; missed: string[]; rate: number }>();
    const allDays = weeks.flat().filter(d => isSameMonth(d, currentMonth));

    for (const day of allDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const activeHabits = habits.filter(h =>
        isBefore(parseISO(h.created_at), addDays(day, 1))
      );
      if (activeHabits.length === 0) {
        stats.set(dateStr, { completed: [], missed: [], rate: 0 });
        continue;
      }

      const dayLogs = logs.filter(l => l.date === dateStr);
      const completedIds = new Set(dayLogs.map(l => l.habit_id));
      const completed = activeHabits.filter(h => completedIds.has(h.id)).map(h => h.name);
      const missed = activeHabits.filter(h => !completedIds.has(h.id)).map(h => h.name);
      const rate = completed.length / activeHabits.length;

      stats.set(dateStr, { completed, missed, rate });
    }
    return stats;
  }, [habits, logs, weeks, currentMonth]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const entries = Array.from(dailyStats.entries()).filter(([dateStr]) => {
      const d = parseISO(dateStr);
      return isBefore(d, addDays(new Date(), 1));
    });

    const activeDays = entries.filter(([, s]) => s.completed.length + s.missed.length > 0);
    const perfectDays = activeDays.filter(([, s]) => s.rate === 1);
    const avgRate = activeDays.length > 0
      ? activeDays.reduce((sum, [, s]) => sum + s.rate, 0) / activeDays.length
      : 0;

    // Perfect streak (consecutive 100% days ending today or yesterday)
    let perfectStreak = 0;
    const sortedDates = activeDays
      .map(([d]) => d)
      .sort()
      .reverse();
    for (const d of sortedDates) {
      const stat = dailyStats.get(d);
      if (stat && stat.rate === 1) perfectStreak++;
      else break;
    }

    return {
      totalActive: activeDays.length,
      perfectDays: perfectDays.length,
      avgRate: Math.round(avgRate * 100),
      perfectStreak,
    };
  }, [dailyStats]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-card/60 border-border/30 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-foreground">Progress Calendar</h3>
                <p className="text-[10px] text-muted-foreground">Overall habit completion overview</p>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-muted/20 p-2.5 text-center">
                <p className="text-lg font-bold text-foreground">{summaryStats.totalActive}</p>
                <p className="text-[9px] text-muted-foreground">Active Days</p>
              </div>
              <div className="rounded-lg bg-muted/20 p-2.5 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400" />
                  <p className="text-lg font-bold text-foreground">{summaryStats.perfectDays}</p>
                </div>
                <p className="text-[9px] text-muted-foreground">Perfect Days</p>
              </div>
              <div className="rounded-lg bg-muted/20 p-2.5 text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <p className="text-lg font-bold text-foreground">{summaryStats.avgRate}%</p>
                </div>
                <p className="text-[9px] text-muted-foreground">Avg Rate</p>
              </div>
              <div className="rounded-lg bg-muted/20 p-2.5 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Trophy className="w-3 h-3 text-orange-400" />
                  <p className="text-lg font-bold text-foreground">{summaryStats.perfectStreak}</p>
                </div>
                <p className="text-[9px] text-muted-foreground">Perfect Streak</p>
              </div>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-foreground">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {DAY_HEADERS.map(d => (
                <div key={d} className="text-center text-[10px] text-muted-foreground/60 font-medium pb-1">{d}</div>
              ))}

              <TooltipProvider delayDuration={150}>
                {weeks.flat().map((d, i) => {
                  const dateStr = format(d, 'yyyy-MM-dd');
                  const inMonth = isSameMonth(d, currentMonth);
                  const isFuture = isBefore(new Date(), d) && !isToday(d);
                  const stat = dailyStats.get(dateStr);
                  const isTodayDate = isToday(d);
                  const totalHabits = stat ? stat.completed.length + stat.missed.length : 0;
                  const isPerfect = stat && stat.rate === 1 && totalHabits > 0;

                  return (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <div
                          className={`aspect-square rounded-md flex flex-col items-center justify-center cursor-default transition-colors relative ${
                            !inMonth
                              ? 'opacity-15'
                              : isFuture
                              ? 'bg-muted/10'
                              : stat
                              ? getColorClass(stat.rate)
                              : 'bg-muted/20'
                          } ${isTodayDate ? 'ring-2 ring-primary/50' : ''}`}
                        >
                          <span className={`text-[11px] leading-none ${
                            !inMonth ? 'text-muted-foreground/40' : isPerfect ? 'text-white font-bold' : 'text-foreground/80'
                          }`}>
                            {inMonth ? d.getDate() : ''}
                          </span>
                          {inMonth && stat && totalHabits > 0 && !isFuture && (
                            <span className={`text-[7px] leading-none mt-0.5 ${isPerfect ? 'text-white/80' : 'text-muted-foreground/60'}`}>
                              {stat.completed.length}/{totalHabits}
                            </span>
                          )}
                          {isPerfect && (
                            <span className="absolute -top-0.5 -right-0.5 text-[8px]">⭐</span>
                          )}
                        </div>
                      </TooltipTrigger>
                      {inMonth && !isFuture && stat && totalHabits > 0 && (
                        <TooltipContent side="top" className="text-xs max-w-[200px]">
                          <p className="font-medium mb-1">{format(d, 'MMM d')} — {Math.round(stat.rate * 100)}%</p>
                          {stat.completed.length > 0 && (
                            <p className="text-green-400">✅ {stat.completed.join(', ')}</p>
                          )}
                          {stat.missed.length > 0 && (
                            <p className="text-red-400">❌ {stat.missed.join(', ')}</p>
                          )}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <span className="text-[9px] text-muted-foreground/60">Less</span>
              {[0, 0.25, 0.5, 0.75, 1].map((rate, i) => (
                <div key={i} className={`w-3.5 h-3.5 rounded-[3px] ${getColorClass(rate)}`} />
              ))}
              <span className="text-[9px] text-muted-foreground/60">More</span>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
