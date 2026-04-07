import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Target, Flame, Check, Clock, AlertCircle, Archive, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HabitCard } from '@/components/habits/HabitCard';
import { HabitFormDialog } from '@/components/habits/HabitFormDialog';
import { CompletionNoteDialog } from '@/components/habits/CompletionNoteDialog';
import { HabitAnalytics } from '@/components/habits/HabitAnalytics';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

export default function HabitTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editHabit, setEditHabit] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [completionTarget, setCompletionTarget] = useState<any>(null);
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // ── Queries ──
  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('submission_time', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: archivedHabits = [] } = useQuery({
    queryKey: ['habits_archived'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('active', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && showArchived,
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

  // Month logs for monthly heatmap + analytics
  const { data: monthLogs = [] } = useQuery({
    queryKey: ['habit_logs_month'],
    queryFn: async () => {
      const monthAgo = subDays(new Date(), 60);
      const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .gte('date', format(monthAgo, 'yyyy-MM-dd'));
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ── Streak auto-reset ──
  useEffect(() => {
    if (!user || habits.length === 0 || monthLogs.length === 0) return;

    const resetStreaks = async () => {
      for (const habit of habits) {
        if (habit.current_streak === 0) continue;
        const hadYesterday = monthLogs.some(l => l.habit_id === habit.id && l.date === yesterday);
        const hadToday = todayLogs.some(l => l.habit_id === habit.id);
        if (!hadYesterday && !hadToday) {
          await supabase
            .from('habits')
            .update({ current_streak: 0 })
            .eq('id', habit.id);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    };

    resetStreaks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, habits.length, monthLogs.length]);

  // ── Complete mutation ──
  const completeMutation = useMutation({
    mutationFn: async ({ habitId, note }: { habitId: string; note: string }) => {
      const { error: logError } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habitId, user_id: user!.id, date: today, source: 'app', notes: note });
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
      queryClient.invalidateQueries({ queryKey: ['habit_logs_month'] });
      toast.success('Habit completed! 🔥');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Undo mutation ──
  const undoMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const log = todayLogs.find(l => l.habit_id === habitId);
      if (!log) throw new Error('No log found');
      // Check 30-min window
      const logTime = new Date(log.completed_at).getTime();
      if (Date.now() - logTime > 30 * 60 * 1000) throw new Error('Undo window (30 min) has passed');

      const { error: delError } = await supabase.from('habit_logs').delete().eq('id', log.id);
      if (delError) throw delError;

      const habit = habits.find(h => h.id === habitId);
      if (habit) {
        await supabase
          .from('habits')
          .update({
            current_streak: Math.max(0, habit.current_streak - 1),
            total_completions: Math.max(0, habit.total_completions - 1),
          })
          .eq('id', habitId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit_logs'] });
      queryClient.invalidateQueries({ queryKey: ['habit_logs_week'] });
      queryClient.invalidateQueries({ queryKey: ['habit_logs_month'] });
      toast.success('Completion undone');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Reactivate archived ──
  const reactivateMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const { error } = await supabase.from('habits').update({ active: true }).eq('id', habitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habits_archived'] });
      toast.success('Habit reactivated!');
    },
  });

  // ── Filter ──
  const categories = ['all', ...new Set(habits.map(h => h.category || 'general'))];
  const filteredHabits = categoryFilter === 'all' ? habits : habits.filter(h => (h.category || 'general') === categoryFilter);

  const canUndo = (habitId: string) => {
    const log = todayLogs.find(l => l.habit_id === habitId);
    if (!log) return false;
    return Date.now() - new Date(log.completed_at).getTime() < 30 * 60 * 1000;
  };

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
        <div className="flex gap-2">
          <Button onClick={() => setShowArchived(!showArchived)} variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <Archive className="w-4 h-4" /> {showArchived ? 'Hide' : 'Archived'}
          </Button>
          <Button onClick={() => { setEditHabit(null); setShowForm(true); }} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Habit
          </Button>
        </div>
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

      {/* Category Filter */}
      {categories.length > 2 && (
        <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
          <TabsList className="bg-card/60 border border-border/30">
            {categories.map(c => (
              <TabsTrigger key={c} value={c} className="capitalize text-xs">{c}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Habits List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading habits...</div>
      ) : filteredHabits.length === 0 ? (
        <Card className="p-12 text-center bg-card/40 border-border/30">
          <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {categoryFilter !== 'all' ? `No ${categoryFilter} habits yet.` : 'No habits yet. Start building one!'}
          </p>
          <Button onClick={() => setShowForm(true)} variant="outline" size="sm" className="mt-4 gap-1.5">
            <Plus className="w-4 h-4" /> Create First Habit
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredHabits.map(habit => (
            <HabitCard
              key={habit.id}
              habit={habit}
              isCompleted={todayLogs.some(l => l.habit_id === habit.id)}
              weekLogs={weekLogs.filter(l => l.habit_id === habit.id)}
              monthLogs={monthLogs.filter(l => l.habit_id === habit.id)}
              onComplete={() => setCompletionTarget(habit)}
              onEdit={() => { setEditHabit(habit); setShowForm(true); }}
              onUndo={() => undoMutation.mutate(habit.id)}
              canUndo={canUndo(habit.id)}
            />
          ))}
        </div>
      )}

      {/* Archived Section */}
      {showArchived && archivedHabits.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Archive className="w-4 h-4" /> Archived Habits
          </h2>
          {archivedHabits.map(habit => (
            <Card key={habit.id} className="p-4 bg-card/30 border-border/20 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{habit.name}</p>
                <p className="text-[10px] text-muted-foreground/60">{habit.total_completions} completions · Best streak: {habit.longest_streak}</p>
              </div>
              <Button onClick={() => reactivateMutation.mutate(habit.id)} variant="outline" size="sm" className="gap-1">
                <RotateCcw className="w-3.5 h-3.5" /> Reactivate
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Analytics */}
      {habits.length > 0 && <HabitAnalytics habits={habits} logs={monthLogs} />}

      {/* Dialogs */}
      <HabitFormDialog open={showForm} onOpenChange={setShowForm} editHabit={editHabit} />

      <CompletionNoteDialog
        open={!!completionTarget}
        onOpenChange={(open) => { if (!open) setCompletionTarget(null); }}
        habitName={completionTarget?.name || ''}
        onConfirm={(note) => {
          if (completionTarget) {
            completeMutation.mutate({ habitId: completionTarget.id, note });
            setCompletionTarget(null);
          }
        }}
      />
    </div>
  );
}
