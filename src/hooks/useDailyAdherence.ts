import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DailyAdherence {
  id: string;
  user_id: string;
  date: string;
  total_rules: number;
  followed_count: number;
  violated_count: number;
  adherence_score: number;
  mood: string;
  trades_count: number;
  general_note: string;
  submitted_at: string;
}

export interface RuleViolation {
  id: string;
  date: string;
  rule_id: string;
  rule_text_snapshot: string;
  category_snapshot: string;
  reason: string;
  mood: string;
  trade_id: string | null;
  created_at: string;
}

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const useTodayAdherence = () => {
  return useQuery({
    queryKey: ['daily_adherence', 'today'],
    queryFn: async () => {
      const today = todayStr();
      const { data, error } = await (supabase as any)
        .from('daily_rule_adherence')
        .select('*')
        .eq('date', today)
        .maybeSingle();
      if (error) throw error;
      return data as DailyAdherence | null;
    },
  });
};

export const useAdherenceHistory = (days = 30) => {
  return useQuery({
    queryKey: ['daily_adherence', 'history', days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().slice(0, 10);
      const { data, error } = await (supabase as any)
        .from('daily_rule_adherence')
        .select('*')
        .gte('date', sinceStr)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []) as DailyAdherence[];
    },
  });
};

export const useViolationsHistory = (days = 30) => {
  return useQuery({
    queryKey: ['rule_violations', 'history', days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().slice(0, 10);
      const { data, error } = await (supabase as any)
        .from('rule_violations')
        .select('*')
        .gte('date', sinceStr)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []) as RuleViolation[];
    },
  });
};

export interface SubmitCheckinPayload {
  date: string;
  mood: string;
  trades_count: number;
  general_note: string;
  followed_rule_ids: string[];
  violations: Array<{
    rule_id: string;
    rule_text_snapshot: string;
    category_snapshot: string;
    reason: string;
  }>;
}

export const useSubmitCheckin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SubmitCheckinPayload) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const userId = session.user.id;

      const total = payload.followed_rule_ids.length + payload.violations.length;
      const followed = payload.followed_rule_ids.length;
      const violated = payload.violations.length;
      const score = total > 0 ? Math.round((followed / total) * 100) : 0;

      // Upsert adherence row
      const { error: aErr } = await (supabase as any)
        .from('daily_rule_adherence')
        .upsert({
          user_id: userId,
          date: payload.date,
          total_rules: total,
          followed_count: followed,
          violated_count: violated,
          adherence_score: score,
          mood: payload.mood,
          trades_count: payload.trades_count,
          general_note: payload.general_note,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,date' });
      if (aErr) throw aErr;

      // Replace violations for that day
      const { error: dErr } = await (supabase as any)
        .from('rule_violations')
        .delete()
        .eq('user_id', userId)
        .eq('date', payload.date);
      if (dErr) throw dErr;

      if (payload.violations.length > 0) {
        const rows = payload.violations.map((v) => ({
          user_id: userId,
          date: payload.date,
          rule_id: v.rule_id,
          rule_text_snapshot: v.rule_text_snapshot,
          category_snapshot: v.category_snapshot,
          reason: v.reason,
          mood: payload.mood,
        }));
        const { error: vErr } = await (supabase as any).from('rule_violations').insert(rows);
        if (vErr) throw vErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily_adherence'] });
      qc.invalidateQueries({ queryKey: ['rule_violations'] });
    },
  });
};

export const useTodayTradesCount = () => {
  return useQuery({
    queryKey: ['trades_count', 'today'],
    queryFn: async () => {
      const today = todayStr();
      const { count, error } = await (supabase as any)
        .from('trades')
        .select('id', { count: 'exact', head: true })
        .eq('date', today);
      if (error) return 0;
      return count ?? 0;
    },
  });
};
