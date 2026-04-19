import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CoachingPlan {
  id: string;
  user_id: string;
  week_start: string;
  focus_rule_ids: string[];
  summary: string;
  action_items: Array<{ title: string; detail?: string; done?: boolean }>;
  metrics: {
    adherence_avg?: number;
    top_violated_rules?: Array<{ rule_id: string; text: string; count: number }>;
    days_logged?: number;
    weekly_target?: number;
  };
  model: string;
  created_at: string;
}

export const useLatestCoachingPlan = () => {
  return useQuery({
    queryKey: ['coaching_plans', 'latest'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('coaching_plans')
        .select('*')
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as CoachingPlan | null;
    },
  });
};

export const useCoachingPlanHistory = () => {
  return useQuery({
    queryKey: ['coaching_plans', 'history'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('coaching_plans')
        .select('*')
        .order('week_start', { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data || []) as CoachingPlan[];
    },
  });
};

export const useGenerateCoachingPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('rules-coaching-plan', {
        body: { manual: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coaching_plans'] });
      qc.invalidateQueries({ queryKey: ['rule_memorization'] });
    },
  });
};
