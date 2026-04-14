import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MindThought {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  source: string;
  telegram_message_id: number | null;
  tags: string[];
  created_at: string;
  date: string;
}

export function useMindThoughts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mind-thoughts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mind_thoughts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as MindThought[];
    },
    enabled: !!user,
  });
}

export function useAddMindThought() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { content: string; image_url?: string; tags?: string[]; date: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('mind_thoughts')
        .insert({
          user_id: user.id,
          content: input.content,
          image_url: input.image_url || null,
          tags: input.tags || [],
          date: input.date,
          source: 'web',
        })
        .select()
        .single();
      if (error) throw error;
      return data as MindThought;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mind-thoughts'] }),
  });
}

export function useDeleteMindThought() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mind_thoughts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mind-thoughts'] }),
  });
}

export function useUpdateMindThought() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; content?: string; tags?: string[] }) => {
      const updates: any = {};
      if (input.content !== undefined) updates.content = input.content;
      if (input.tags !== undefined) updates.tags = input.tags;

      const { error } = await supabase.from('mind_thoughts').update(updates).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mind-thoughts'] }),
  });
}

export async function uploadMindImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from('mind-images').upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from('mind-images').getPublicUrl(path);
  return data.publicUrl;
}
