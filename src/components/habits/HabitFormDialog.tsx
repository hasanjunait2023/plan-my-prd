import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Archive, Trash2, Zap, Palmtree, Compass } from 'lucide-react';
import { useLifeNodes } from '@/hooks/useLifeNodes';

const CATEGORIES = ['general', 'trading', 'health', 'learning'];

const TEMPLATES = [
  { name: 'Morning Journal', description: 'Write a quick reflection before trading', category: 'trading' },
  { name: 'Chart Review', description: 'Review key pairs and mark levels on chart', category: 'trading' },
  { name: 'Backtest Session', description: '30-min backtest on strategy of the week', category: 'trading' },
  { name: 'Exercise', description: '30 minutes of physical activity', category: 'health' },
  { name: 'Meditation', description: '10-minute mindfulness meditation', category: 'health' },
  { name: 'Read 30 min', description: 'Read trading or self-improvement book', category: 'learning' },
];

interface HabitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editHabit?: any;
}

export function HabitFormDialog({ open, onOpenChange, editHabit }: HabitFormDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { byType: lifeNodesByType } = useLifeNodes();
  const missions = lifeNodesByType('mission');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submissionTime, setSubmissionTime] = useState('07:00');
  const [timezone, setTimezone] = useState('Asia/Dhaka');
  const [category, setCategory] = useState('general');
  const [missionId, setMissionId] = useState<string>('none');
  const [vacationStart, setVacationStart] = useState('');
  const [vacationEnd, setVacationEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (editHabit) {
      setName(editHabit.name);
      setDescription(editHabit.description || '');
      setSubmissionTime(editHabit.submission_time?.slice(0, 5) || '07:00');
      setTimezone(editHabit.timezone || 'Asia/Dhaka');
      setCategory(editHabit.category || 'general');
      setVacationStart(editHabit.vacation_start || '');
      setVacationEnd(editHabit.vacation_end || '');
    } else {
      setName('');
      setDescription('');
      setSubmissionTime('07:00');
      setTimezone('Asia/Dhaka');
      setCategory('general');
      setVacationStart('');
      setVacationEnd('');
      setShowTemplates(false);
    }
  }, [editHabit, open]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['habits'] });
    queryClient.invalidateQueries({ queryKey: ['habits_archived'] });
    queryClient.invalidateQueries({ queryKey: ['habit_logs'] });
    queryClient.invalidateQueries({ queryKey: ['habit_logs_week'] });
    queryClient.invalidateQueries({ queryKey: ['habit_logs_month'] });
  };

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    setName(template.name);
    setDescription(template.description);
    setCategory(template.category);
    setShowTemplates(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload: any = {
        name,
        description,
        submission_time: submissionTime,
        timezone,
        category,
        vacation_start: vacationStart || null,
        vacation_end: vacationEnd || null,
      };

      if (editHabit) {
        const { error } = await supabase
          .from('habits')
          .update(payload)
          .eq('id', editHabit.id);
        if (error) throw error;
        toast.success('Habit updated!');
      } else {
        const { error } = await supabase
          .from('habits')
          .insert({ ...payload, user_id: user!.id });
        if (error) throw error;
        toast.success('Habit created! 🎯');
      }
      invalidateAll();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!editHabit) return;
    const { error } = await supabase.from('habits').update({ active: false }).eq('id', editHabit.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Habit archived');
    invalidateAll();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!editHabit) return;
    await supabase.from('habit_logs').delete().eq('habit_id', editHabit.id);
    const { error } = await supabase.from('habits').delete().eq('id', editHabit.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Habit permanently deleted');
    invalidateAll();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/40 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editHabit ? 'Edit Habit' : 'New Habit'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Templates (only for new habits) */}
          {!editHabit && (
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
                className="gap-1.5 text-xs w-full"
              >
                <Zap className="w-3.5 h-3.5" /> {showTemplates ? 'Hide Templates' : 'Use Template'}
              </Button>
              {showTemplates && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.name}
                      onClick={() => applyTemplate(t)}
                      className="text-left p-2.5 rounded-lg border border-border/30 bg-background/50 hover:bg-accent/20 transition-colors"
                    >
                      <p className="text-xs font-medium text-foreground">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t.description}</p>
                      <span className="text-[9px] text-muted-foreground/60 capitalize">{t.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Morning Journal" />
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this habit involve?" />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Daily Deadline</Label>
              <Input type="time" value={submissionTime} onChange={e => setSubmissionTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Timezone</Label>
              <Input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="Asia/Dhaka" />
            </div>
          </div>

          {/* Vacation Mode */}
          <div className="p-3 rounded-lg border border-border/30 bg-background/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Palmtree className="w-3.5 h-3.5 text-cyan-400" /> Vacation Mode
              <span className="text-[10px] text-muted-foreground/60">(streak won't break)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Start Date</Label>
                <Input type="date" value={vacationStart} onChange={e => setVacationStart(e.target.value)} className="text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">End Date</Label>
                <Input type="date" value={vacationEnd} onChange={e => setVacationEnd(e.target.value)} className="text-xs" />
              </div>
            </div>
            {vacationStart && vacationEnd && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[10px] text-red-400 h-6 px-2"
                onClick={() => { setVacationStart(''); setVacationEnd(''); }}
              >
                Clear Vacation
              </Button>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? 'Saving...' : editHabit ? 'Update Habit' : 'Create Habit'}
          </Button>

          {editHabit && (
            <div className="flex gap-2 pt-2 border-t border-border/30">
              <Button onClick={handleArchive} variant="outline" size="sm" className="flex-1 gap-1.5 text-amber-400 border-amber-400/30 hover:bg-amber-400/10">
                <Archive className="w-3.5 h-3.5" /> Archive
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-red-400 border-red-400/30 hover:bg-red-400/10">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{editHabit.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this habit and all its logs. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
