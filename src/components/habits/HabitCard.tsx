import { Check, Flame, Pencil, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PhaseProgress } from './PhaseProgress';
import { WeeklyHeatmap } from './WeeklyHeatmap';

interface HabitCardProps {
  habit: any;
  isCompleted: boolean;
  weekLogs: any[];
  onComplete: () => void;
  onEdit: () => void;
}

export function HabitCard({ habit, isCompleted, weekLogs, onComplete, onEdit }: HabitCardProps) {
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(habit.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const phase = daysSinceCreation <= 66
    ? { label: 'Building', color: 'text-amber-400 bg-amber-400/15', day: daysSinceCreation, total: 66 }
    : daysSinceCreation <= 90
    ? { label: 'Strengthening', color: 'text-blue-400 bg-blue-400/15', day: daysSinceCreation, total: 90 }
    : { label: 'Established', color: 'text-green-400 bg-green-400/15', day: daysSinceCreation, total: daysSinceCreation };

  return (
    <Card className={`p-4 bg-card/60 border-border/30 transition-all ${isCompleted ? 'opacity-75' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-sm font-semibold text-foreground truncate">{habit.name}</h3>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${phase.color}`}>
              {phase.label}
            </span>
            {habit.current_streak > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium text-orange-400">
                <Flame className="w-3 h-3" /> {habit.current_streak}
              </span>
            )}
          </div>

          {habit.description && (
            <p className="text-[11px] text-muted-foreground mb-2 truncate">{habit.description}</p>
          )}

          <div className="flex items-center gap-4">
            <PhaseProgress daysSinceCreation={daysSinceCreation} />
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Deadline: {habit.submission_time?.slice(0, 5)}</span>
            </div>
          </div>

          <div className="mt-2.5">
            <WeeklyHeatmap logs={weekLogs} />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant={isCompleted ? 'secondary' : 'default'}
            disabled={isCompleted}
            onClick={onComplete}
            className="w-20 gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            {isCompleted ? 'Done' : 'Do'}
          </Button>
          <button onClick={onEdit} className="text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}
