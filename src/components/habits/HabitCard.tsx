import { useState } from 'react';
import { Check, Flame, Pencil, Clock, Undo2, ChevronDown, ChevronUp, GripVertical, Palmtree, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PhaseProgress } from './PhaseProgress';
import { WeeklyHeatmap } from './WeeklyHeatmap';
import { MonthlyHeatmap } from './MonthlyHeatmap';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { isWithinInterval, parseISO } from 'date-fns';
import { useLifeNodes } from '@/hooks/useLifeNodes';

interface HabitCardProps {
  habit: any;
  isCompleted: boolean;
  weekLogs: any[];
  monthLogs?: any[];
  onComplete: () => void;
  onEdit: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

const MILESTONES = [
  { min: 100, icon: '👑', label: 'Legend' },
  { min: 66, icon: '💎', label: 'Formed' },
  { min: 21, icon: '⚡', label: 'Strong' },
  { min: 7, icon: '🔥', label: 'Week' },
];

function getMilestoneBadge(streak: number) {
  return MILESTONES.find(m => streak >= m.min) || null;
}

export function HabitCard({ habit, isCompleted, weekLogs, monthLogs = [], onComplete, onEdit, onUndo, canUndo }: HabitCardProps) {
  const [showMonthly, setShowMonthly] = useState(false);
  const { findById } = useLifeNodes();
  const linkedMission = habit.mission_id ? findById(habit.mission_id) : null;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(habit.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const phase = daysSinceCreation <= 66
    ? { label: 'Building', color: 'text-amber-400 bg-amber-400/15', day: daysSinceCreation, total: 66 }
    : daysSinceCreation <= 90
    ? { label: 'Strengthening', color: 'text-blue-400 bg-blue-400/15', day: daysSinceCreation, total: 90 }
    : { label: 'Established', color: 'text-green-400 bg-green-400/15', day: daysSinceCreation, total: daysSinceCreation };

  const categoryColors: Record<string, string> = {
    trading: 'text-primary bg-primary/15',
    health: 'text-emerald-400 bg-emerald-400/15',
    learning: 'text-violet-400 bg-violet-400/15',
    general: 'text-muted-foreground bg-muted/30',
  };
  const catColor = categoryColors[habit.category] || categoryColors.general;

  const milestoneBadge = getMilestoneBadge(habit.current_streak);

  // Check if currently on vacation
  const isOnVacation = habit.vacation_start && habit.vacation_end && (() => {
    try {
      const now = new Date();
      return isWithinInterval(now, { start: parseISO(habit.vacation_start), end: parseISO(habit.vacation_end) });
    } catch { return false; }
  })();

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`p-4 bg-card/60 border-border/30 transition-all ${isCompleted ? 'opacity-75' : ''} ${isDragging ? 'shadow-xl' : ''}`}>
        <div className="flex items-start gap-2">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground truncate">{habit.name}</h3>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${phase.color}`}>
                {phase.label}
              </span>
              {habit.category && habit.category !== 'general' && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${catColor}`}>
                  {habit.category}
                </span>
              )}
              {habit.current_streak > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-orange-400">
                  <Flame className="w-3 h-3" /> {habit.current_streak}
                </span>
              )}
              {milestoneBadge && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-400/15 text-yellow-400 animate-pulse">
                  {milestoneBadge.icon} {milestoneBadge.label}
                </span>
              )}
              {isOnVacation && (
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-cyan-400 bg-cyan-400/15 px-1.5 py-0.5 rounded-full">
                  <Palmtree className="w-3 h-3" /> Vacation
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

            <div className="mt-2.5 flex items-center gap-2">
              <WeeklyHeatmap logs={weekLogs} />
              <button
                onClick={() => setShowMonthly(!showMonthly)}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
              >
                {showMonthly ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showMonthly && (
              <div className="mt-3 p-3 bg-background/50 rounded-lg border border-border/20">
                <MonthlyHeatmap logs={monthLogs} habitName={habit.name} />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 shrink-0">
            {isCompleted && canUndo ? (
              <Button size="sm" variant="outline" onClick={onUndo} className="w-20 gap-1 text-orange-400 border-orange-400/30 hover:bg-orange-400/10">
                <Undo2 className="w-3.5 h-3.5" /> Undo
              </Button>
            ) : (
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
            )}
            <button onClick={onEdit} className="text-muted-foreground hover:text-foreground transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
