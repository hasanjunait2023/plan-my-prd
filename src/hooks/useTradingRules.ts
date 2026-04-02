import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TradingRule } from '@/types/trade';

export const useTradingRules = () => {
  return useQuery({
    queryKey: ['trading_rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_rules')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(r => ({ id: r.id, text: r.text, active: r.active })) as TradingRule[];
    },
  });
};

export const useInsertRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { error } = await supabase.from('trading_rules').insert({ text, user_id: session.user.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trading_rules'] }),
  });
};

export const useDeleteRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trading_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trading_rules'] }),
  });
};

export const useToggleRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('trading_rules').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trading_rules'] }),
  });
};
