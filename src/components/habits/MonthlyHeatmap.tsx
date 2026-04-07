import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, isSameMonth, isToday, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MonthlyHeatmapProps {
  logs: Array<{ date: string; notes?: string }>;
  habitName: string;
}

const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function MonthlyHeatmap({ logs, habitName }: MonthlyHeatmapProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });

  const completedDates = new Map(logs.map(l => [l.date, l.notes || '']));

  // Build weeks
  const weeks: Date[][] = [];
  let day = calendarStart;
  while (day <= monthEnd || weeks.length < 5) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
    if (!isSameMonth(day, currentMonth) && weeks.length >= 4) break;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <span className="text-xs font-medium text-muted-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {DAY_HEADERS.map((d, i) => (
          <div key={i} className="text-center text-[8px] text-muted-foreground/60 font-medium pb-0.5">{d}</div>
        ))}
        <TooltipProvider delayDuration={200}>
          {weeks.flat().map((d, i) => {
            const dateStr = format(d, 'yyyy-MM-dd');
            const inMonth = isSameMonth(d, currentMonth);
            const completed = completedDates.has(dateStr);
            const note = completedDates.get(dateStr);
            const isTodayDate = isToday(d);

            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div
                    className={`aspect-square rounded-[3px] text-[8px] flex items-center justify-center cursor-default transition-colors ${
                      !inMonth
                        ? 'opacity-20 bg-muted/20'
                        : completed
                        ? 'bg-green-500/80 text-white font-medium'
                        : isTodayDate
                        ? 'bg-muted/60 ring-1 ring-primary/40'
                        : 'bg-muted/30'
                    }`}
                  >
                    {inMonth ? d.getDate() : ''}
                  </div>
                </TooltipTrigger>
                {inMonth && (
                  <TooltipContent side="top" className="text-xs">
                    <p>{format(d, 'MMM d')} — {completed ? '✅ Done' : '❌ Missed'}</p>
                    {note && <p className="text-muted-foreground mt-0.5">📝 {note}</p>}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
}
