import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, AlertTriangle, CheckCircle2, PartyPopper } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface HabitFocusPanelProps {
  habits: any[];
  todayLogs: any[];
  monthLogs: any[];
  onQuickComplete: (habit: any) => void;
}

type Priority = 'urgent' | 'at-risk' | 'on-track';

interface FocusItem {
  habit: any;
  priority: Priority;
  reason: string;
}

export function HabitFocusPanel({ habits, todayLogs, monthLogs, onQuickComplete }: HabitFocusPanelProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const focusItems: FocusItem[] = habits.map(habit => {
    const isDoneToday = todayLogs.some(l => l.habit_id === habit.id);
    
    if (isDoneToday) {
      return { habit, priority: 'on-track' as Priority, reason: 'Done today ✅' };
    }

    const hadYesterday = monthLogs.some(l => l.habit_id === habit.id && l.date === yesterday);
    
    if (habit.current_streak === 0 && !hadYesterday) {
      return { habit, priority: 'urgent' as Priority, reason: 'Streak broken — rebuild today!' };
    }

    if (habit.current_streak > 0) {
      return { habit, priority: 'at-risk' as Priority, reason: `${habit.current_streak}-day streak at risk!` };
    }

    return { habit, priority: 'at-risk' as Priority, reason: 'Not done yet today' };
  });

  // Sort: urgent first, then at-risk, on-track last
  const sorted = [...focusItems].sort((a, b) => {
    const order = { urgent: 0, 'at-risk': 1, 'on-track': 2 };
    return order[a.priority] - order[b.priority];
  });

  const urgentCount = sorted.filter(i => i.priority === 'urgent').length;
  const atRiskCount = sorted.filter(i => i.priority === 'at-risk').length;
  const allDone = sorted.every(i => i.priority === 'on-track');
  const pendingItems = sorted.filter(i => i.priority !== 'on-track');

  if (habits.length === 0) return null;

  const priorityConfig = {
    urgent: { color: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-500', label: 'Urgent' },
    'at-risk': { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-500', label: 'At Risk' },
    'on-track': { color: 'bg-green-500/20 text-green-400 border-green-500/30', dot: 'bg-green-500', label: 'Done' },
  };

  return (
    <Card className="p-4 bg-card/60 border-border/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">🎯 Focus Today</h3>
        </div>
        <div className="flex gap-1.5">
          {urgentCount > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-500/30 text-red-400">
              {urgentCount} urgent
            </Badge>
          )}
          {atRiskCount > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/30 text-yellow-400">
              {atRiskCount} at risk
            </Badge>
          )}
        </div>
      </div>

      {allDone ? (
        <div className="flex flex-col items-center py-4 gap-2">
          <PartyPopper className="w-8 h-8 text-green-400" />
          <p className="text-sm font-medium text-green-400">All caught up! 🎉</p>
          <p className="text-[10px] text-muted-foreground">Every habit completed today. Amazing!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pendingItems.map(item => {
            const cfg = priorityConfig[item.priority];
            return (
              <div
                key={item.habit.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border ${cfg.color}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.habit.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.reason}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-7 px-2.5 text-xs hover:bg-green-500/20 hover:text-green-400"
                  onClick={() => onQuickComplete(item.habit)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Done
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
