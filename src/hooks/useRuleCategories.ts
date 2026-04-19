import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RuleCategory {
  id: string;
  name: string;
  color: string;
}

export const useRuleCategories = () => {
  return useQuery({
    queryKey: ['rule_categories'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('rule_categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as RuleCategory[];
    },
  });
};

export const useUpsertRuleCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('rule_categories')
        .upsert(
          { user_id: session.user.id, name, color },
          { onConflict: 'user_id,name' }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rule_categories'] }),
  });
};
