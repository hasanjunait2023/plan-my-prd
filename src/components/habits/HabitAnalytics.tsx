import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { format, subDays, startOfWeek, addDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface HabitAnalyticsProps {
  habits: any[];
  logs: Array<{ date: string; habit_id: string }>;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function HabitAnalytics({ habits, logs }: HabitAnalyticsProps) {
  const totalHabits = habits.length;

  // Last 30 days completion rate
  const dailyData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = subDays(today, 29 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const completed = new Set(logs.filter(l => l.date === dateStr).map(l => l.habit_id)).size;
      return {
        date: format(d, 'MMM d'),
        rate: totalHabits > 0 ? Math.round((completed / totalHabits) * 100) : 0,
      };
    });
  }, [logs, totalHabits]);

  // Best/worst days of week
  const dayStats = useMemo(() => {
    const counts: Record<number, { done: number; total: number }> = {};
    for (let i = 0; i < 7; i++) counts[i] = { done: 0, total: 0 };

    const today = new Date();
    for (let i = 0; i < 28; i++) {
      const d = subDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      // Monday=0 mapping
      const jsDay = d.getDay();
      const monIdx = jsDay === 0 ? 6 : jsDay - 1;
      counts[monIdx].total += totalHabits;
      counts[monIdx].done += new Set(logs.filter(l => l.date === dateStr).map(l => l.habit_id)).size;
    }

    return DAY_NAMES.map((name, i) => ({
      day: name,
      rate: counts[i].total > 0 ? Math.round((counts[i].done / counts[i].total) * 100) : 0,
    }));
  }, [logs, totalHabits]);

  const avgRate = dailyData.length > 0 ? Math.round(dailyData.reduce((s, d) => s + d.rate, 0) / dailyData.length) : 0;
  const bestDay = dayStats.reduce((a, b) => a.rate > b.rate ? a : b, dayStats[0]);
  const worstDay = dayStats.reduce((a, b) => a.rate < b.rate ? a : b, dayStats[0]);

  if (totalHabits === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">📊 Analytics (Last 30 Days)</h2>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 bg-card/60 border-border/30 text-center">
          <p className="text-lg font-bold text-foreground">{avgRate}%</p>
          <p className="text-[10px] text-muted-foreground">Avg Completion</p>
        </Card>
        <Card className="p-3 bg-card/60 border-border/30 text-center">
          <p className="text-lg font-bold text-green-400">{bestDay?.day}</p>
          <p className="text-[10px] text-muted-foreground">Best Day ({bestDay?.rate}%)</p>
        </Card>
        <Card className="p-3 bg-card/60 border-border/30 text-center">
          <p className="text-lg font-bold text-red-400">{worstDay?.day}</p>
          <p className="text-[10px] text-muted-foreground">Worst Day ({worstDay?.rate}%)</p>
        </Card>
      </div>

      <Card className="p-4 bg-card/60 border-border/30">
        <p className="text-xs font-medium text-muted-foreground mb-3">Completion Rate Trend</p>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={dailyData}>
            <XAxis dataKey="date" tick={{ fontSize: 8 }} interval={6} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 8 }} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
            <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-4 bg-card/60 border-border/30">
        <p className="text-xs font-medium text-muted-foreground mb-3">Completion by Day of Week</p>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={dayStats}>
            <XAxis dataKey="day" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
            <Bar dataKey="rate" radius={[3, 3, 0, 0]}>
              {dayStats.map((entry, i) => (
                <Cell key={i} fill={entry.rate >= 70 ? '#22c55e' : entry.rate >= 40 ? '#eab308' : '#ef4444'} fillOpacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
