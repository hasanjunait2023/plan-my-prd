import { format, startOfWeek, addDays, isToday as isDateToday } from 'date-fns';

interface WeeklyHeatmapProps {
  logs: Array<{ date: string }>;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function WeeklyHeatmap({ logs }: WeeklyHeatmapProps) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return {
      date: format(d, 'yyyy-MM-dd'),
      label: DAY_LABELS[i],
      isToday: isDateToday(d),
    };
  });

  const completedDates = new Set(logs.map(l => l.date));

  return (
    <div className="flex items-center gap-1">
      {days.map(day => (
        <div key={day.date} className="flex flex-col items-center gap-0.5">
          <div
            className={`w-5 h-5 rounded-sm transition-colors ${
              completedDates.has(day.date)
                ? 'bg-green-500/80'
                : day.isToday
                ? 'bg-muted/80 ring-1 ring-primary/30'
                : 'bg-muted/40'
            }`}
          />
          <span className="text-[8px] text-muted-foreground">{day.label}</span>
        </div>
      ))}
    </div>
  );
}
