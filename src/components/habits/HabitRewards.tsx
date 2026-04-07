import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, Star, Zap, Crown, Target } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';

interface HabitRewardsProps {
  habits: any[];
  logs: any[];
}

const LEVELS = [
  { name: 'Beginner', min: 0, icon: '🌱', color: 'text-gray-400' },
  { name: 'Bronze', min: 100, icon: '🥉', color: 'text-amber-600' },
  { name: 'Silver', min: 500, icon: '🥈', color: 'text-gray-300' },
  { name: 'Gold', min: 1500, icon: '🥇', color: 'text-yellow-400' },
  { name: 'Platinum', min: 3000, icon: '💎', color: 'text-cyan-400' },
  { name: 'Diamond', min: 5000, icon: '👑', color: 'text-purple-400' },
];

const ACHIEVEMENTS = [
  { id: 'first', label: 'First Step', desc: 'Complete your first habit', icon: '✅', check: (t: number) => t >= 1 },
  { id: 'streak7', label: '7-Day Fire', desc: 'Reach a 7-day streak', icon: '🔥', check: (_: number, s: number) => s >= 7 },
  { id: 'streak21', label: 'Iron Will', desc: '21-day streak achieved', icon: '⚡', check: (_: number, s: number) => s >= 21 },
  { id: 'streak66', label: 'Habit Master', desc: '66-day habit formed', icon: '🧠', check: (_: number, s: number) => s >= 66 },
  { id: 'comp50', label: 'Half Century', desc: '50 total completions', icon: '🎯', check: (t: number) => t >= 50 },
  { id: 'comp100', label: 'Centurion', desc: '100 total completions', icon: '💯', check: (t: number) => t >= 100 },
  { id: 'comp500', label: 'Unstoppable', desc: '500 total completions', icon: '🚀', check: (t: number) => t >= 500 },
  { id: 'perfect30', label: 'Perfect Month', desc: '30 perfect days', icon: '🌟', check: (_: number, __: number, p: number) => p >= 30 },
];

export function HabitRewards({ habits, logs }: HabitRewardsProps) {
  const stats = useMemo(() => {
    const totalCompletions = habits.reduce((s, h) => s + h.total_completions, 0);
    const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.longest_streak)) : 0;

    // Calculate perfect days from logs
    const dayMap = new Map<string, Set<string>>();
    logs.forEach(l => {
      if (!dayMap.has(l.date)) dayMap.set(l.date, new Set());
      dayMap.get(l.date)!.add(l.habit_id);
    });

    let perfectDays = 0;
    dayMap.forEach((habitIds, date) => {
      const activeOnDate = habits.filter(h => parseISO(h.created_at) <= parseISO(date));
      if (activeOnDate.length > 0 && habitIds.size >= activeOnDate.length) {
        perfectDays++;
      }
    });

    // XP calculation
    const baseXP = totalCompletions * 10;
    const perfectXP = perfectDays * 50;
    const streakXP = habits.reduce((s, h) => s + h.current_streak * 2, 0);
    const totalXP = baseXP + perfectXP + streakXP;

    // Current level
    let currentLevel = LEVELS[0];
    let nextLevel = LEVELS[1];
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (totalXP >= LEVELS[i].min) {
        currentLevel = LEVELS[i];
        nextLevel = LEVELS[i + 1] || null;
        break;
      }
    }

    const levelProgress = nextLevel
      ? ((totalXP - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
      : 100;

    // Weekly challenge: complete all habits X/7 days
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: new Date() });
    let perfectWeekDays = 0;
    weekDays.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayLogs = logs.filter(l => l.date === dayStr);
      const activeHabits = habits.filter(h => parseISO(h.created_at) <= day);
      if (activeHabits.length > 0 && dayLogs.length >= activeHabits.length) {
        perfectWeekDays++;
      }
    });

    // Achievements
    const unlockedAchievements = ACHIEVEMENTS.filter(a => a.check(totalCompletions, bestStreak, perfectDays));

    return {
      totalXP, totalCompletions, bestStreak, perfectDays,
      currentLevel, nextLevel, levelProgress,
      perfectWeekDays, weekTarget: 5,
      unlockedAchievements,
    };
  }, [habits, logs]);

  if (habits.length === 0) return null;

  return (
    <Card className="p-4 bg-card/60 border-border/30 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-400" />
        <h3 className="text-sm font-semibold text-foreground">🏆 Rewards & Progress</h3>
      </div>

      {/* Level & XP */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{stats.currentLevel.icon}</span>
            <div>
              <p className={`text-sm font-bold ${stats.currentLevel.color}`}>{stats.currentLevel.name}</p>
              <p className="text-[10px] text-muted-foreground">{stats.totalXP.toLocaleString()} XP</p>
            </div>
          </div>
          {stats.nextLevel && (
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Next: {stats.nextLevel.icon} {stats.nextLevel.name}</p>
              <p className="text-[10px] text-muted-foreground">{stats.nextLevel.min - stats.totalXP} XP to go</p>
            </div>
          )}
        </div>
        <Progress value={Math.min(stats.levelProgress, 100)} className="h-2" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg bg-muted/20">
          <Zap className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{stats.totalCompletions}</p>
          <p className="text-[10px] text-muted-foreground">Completions</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/20">
          <Star className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{stats.perfectDays}</p>
          <p className="text-[10px] text-muted-foreground">Perfect Days</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/20">
          <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{stats.bestStreak}</p>
          <p className="text-[10px] text-muted-foreground">Best Streak</p>
        </div>
      </div>

      {/* Weekly Challenge */}
      <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <p className="text-xs font-medium text-foreground">Weekly Challenge</p>
          </div>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-cyan-500/30 text-cyan-400">
            {stats.perfectWeekDays}/{stats.weekTarget}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2">Complete all habits {stats.weekTarget} days this week</p>
        <div className="flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full ${
                i < stats.perfectWeekDays ? 'bg-cyan-400' : 'bg-muted/40'
              }`}
            />
          ))}
        </div>
        {stats.perfectWeekDays >= stats.weekTarget && (
          <p className="text-[10px] text-cyan-400 mt-1.5 font-medium">🎉 Weekly challenge complete!</p>
        )}
      </div>

      {/* Achievements */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Achievements ({stats.unlockedAchievements.length}/{ACHIEVEMENTS.length})</p>
        <div className="grid grid-cols-4 gap-2">
          {ACHIEVEMENTS.map(a => {
            const unlocked = stats.unlockedAchievements.some(u => u.id === a.id);
            return (
              <div
                key={a.id}
                className={`text-center p-2 rounded-lg border transition-all ${
                  unlocked
                    ? 'bg-muted/30 border-border/40'
                    : 'bg-muted/10 border-border/10 opacity-40 grayscale'
                }`}
                title={`${a.label}: ${a.desc}`}
              >
                <span className="text-xl">{a.icon}</span>
                <p className="text-[9px] text-muted-foreground mt-1 leading-tight">{a.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
