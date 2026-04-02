import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PsychologyLog } from '@/types/trade';

const mapRow = (r: any): PsychologyLog => ({
  id: r.id,
  date: r.date,
  mentalState: r.mental_state,
  sleepQuality: r.sleep_quality,
  lifeStress: r.life_stress,
  intention: r.intention,
  reflection: r.reflection,
  ruleAdherence: r.rule_adherence,
  emotions: r.emotions || [],
  overallScore: Number(r.overall_score),
});

export const usePsychologyLogs = () => {
  return useQuery({
    queryKey: ['psychology_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('psychology_logs')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapRow);
    },
  });
};

export const useInsertPsychologyLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (log: Omit<PsychologyLog, 'id'>) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { error } = await supabase.from('psychology_logs').insert({
        user_id: session.user.id,
        date: log.date,
        mental_state: log.mentalState,
        sleep_quality: log.sleepQuality,
        life_stress: log.lifeStress,
        intention: log.intention,
        reflection: log.reflection,
        rule_adherence: log.ruleAdherence,
        emotions: log.emotions,
        overall_score: log.overallScore,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['psychology_logs'] }),
  });
};
