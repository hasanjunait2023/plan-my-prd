import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Target, Flame, Check, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HabitCard } from '@/components/habits/HabitCard';
import { HabitFormDialog } from '@/components/habits/HabitFormDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function HabitTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editHabit, setEditHabit] = useState<any>(null);
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('active', true)
        .order('submission_time', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: todayLogs = [] } = useQuery({
    queryKey: ['habit_logs', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('date', today);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: weekLogs = [] } = useQuery({
    queryKey: ['habit_logs_week'],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .gte('date', format(weekAgo, 'yyyy-MM-dd'))
        .lte('date', today);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const completeMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const { error: logError } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habitId, user_id: user!.id, date: today, source: 'app' });
      if (logError) throw logError;

      const habit = habits.find(h => h.id === habitId);
      if (habit) {
        const newStreak = habit.current_streak + 1;
        const { error: updateError } = await supabase
          .from('habits')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, habit.longest_streak),
            total_completions: habit.total_completions + 1,
          })
          .eq('id', habitId);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit_logs'] });
      queryClient.invalidateQueries({ queryKey: ['habit_logs_week'] });
      toast.success('Habit completed! 🔥');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const completedCount = todayLogs.length;
  const totalCount = habits.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Habit Tracker</h1>
            <p className="text-xs text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
          </div>
        </div>
        <Button onClick={() => { setEditHabit(null); setShowForm(true); }} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Habit
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 bg-card/60 border-border/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-xs font-medium">Today</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{completedCount}/{totalCount}</p>
          <p className="text-[10px] text-muted-foreground">{completionRate}% done</p>
        </Card>
        <Card className="p-4 bg-card/60 border-border/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-medium">Best Streak</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {habits.length > 0 ? Math.max(...habits.map(h => h.longest_streak)) : 0}
          </p>
          <p className="text-[10px] text-muted-foreground">days</p>
        </Card>
        <Card className="p-4 bg-card/60 border-border/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium">Active</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalCount}</p>
          <p className="text-[10px] text-muted-foreground">habits</p>
        </Card>
      </div>

      {/* Habits List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading habits...</div>
      ) : habits.length === 0 ? (
        <Card className="p-12 text-center bg-card/40 border-border/30">
          <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No habits yet. Start building one!</p>
          <Button onClick={() => setShowForm(true)} variant="outline" size="sm" className="mt-4 gap-1.5">
            <Plus className="w-4 h-4" /> Create First Habit
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {habits.map(habit => (
            <HabitCard
              key={habit.id}
              habit={habit}
              isCompleted={todayLogs.some(l => l.habit_id === habit.id)}
              weekLogs={weekLogs.filter(l => l.habit_id === habit.id)}
              onComplete={() => completeMutation.mutate(habit.id)}
              onEdit={() => { setEditHabit(habit); setShowForm(true); }}
            />
          ))}
        </div>
      )}

      <HabitFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        editHabit={editHabit}
      />
    </div>
  );
}
