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
        .order('category', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(r => ({
        id: r.id,
        text: r.text,
        active: r.active,
        category: (r as any).category || 'General',
      })) as TradingRule[];
    },
  });
};

export const useInsertRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ text, category }: { text: string; category: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('trading_rules')
        .insert({ text, category, user_id: session.user.id } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trading_rules'] }),
  });
};

export const useUpdateRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, text, category }: { id: string; text?: string; category?: string }) => {
      const patch: { text?: string; category?: string } = {};
      if (text !== undefined) patch.text = text;
      if (category !== undefined) patch.category = category;
      const { error } = await supabase.from('trading_rules').update(patch).eq('id', id);
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
