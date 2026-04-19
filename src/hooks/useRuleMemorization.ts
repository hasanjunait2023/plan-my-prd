import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RuleMemorization {
  id: string;
  rule_id: string;
  confidence_score: number;
  repeat_count: number;
  last_shown_at: string | null;
}

export const useRuleMemorization = () => {
  return useQuery({
    queryKey: ['rule_memorization'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('rule_memorization')
        .select('*');
      if (error) throw error;
      return (data || []) as RuleMemorization[];
    },
  });
};

export const useUpdateMemorization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ruleId,
      delta,
    }: {
      ruleId: string;
      delta: 'know' | 'repeat';
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Read current row
      const { data: existing } = await (supabase as any)
        .from('rule_memorization')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('rule_id', ruleId)
        .maybeSingle();

      const current = (existing as RuleMemorization | null) || {
        confidence_score: 0,
        repeat_count: 0,
      };

      const nextConfidence =
        delta === 'know'
          ? Math.min(5, current.confidence_score + 1)
          : Math.max(0, current.confidence_score - 1);

      const payload = {
        user_id: session.user.id,
        rule_id: ruleId,
        confidence_score: nextConfidence,
        repeat_count: current.repeat_count + 1,
        last_shown_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from('rule_memorization')
        .upsert(payload, { onConflict: 'user_id,rule_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rule_memorization'] }),
  });
};
