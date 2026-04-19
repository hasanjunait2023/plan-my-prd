import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StreakStats {
  current: number;
  longest: number;
  totalDays: number;
  todayDone: boolean;
  lastSessionDate: string | null;
}

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const computeStreak = (dates: string[]): StreakStats => {
  if (dates.length === 0) {
    return { current: 0, longest: 0, totalDays: 0, todayDone: false, lastSessionDate: null };
  }
  // dates are ISO YYYY-MM-DD, sort descending
  const sorted = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
  const today = todayISO();
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const todayDone = sorted[0] === today;
  // current streak: count consecutive days back from today (or yesterday if today not done)
  let current = 0;
  let cursor = todayDone ? today : sorted[0] === yesterday ? yesterday : null;
  if (cursor) {
    const set = new Set(sorted);
    while (set.has(cursor)) {
      current++;
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }

  // longest streak: walk through ascending
  const asc = [...sorted].reverse();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of asc) {
    if (prev) {
      const pd = new Date(prev);
      pd.setDate(pd.getDate() + 1);
      const next = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, '0')}-${String(pd.getDate()).padStart(2, '0')}`;
      run = next === d ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = d;
  }

  return {
    current,
    longest,
    totalDays: sorted.length,
    todayDone,
    lastSessionDate: sorted[0],
  };
};

export const useMemorizeStreak = () => {
  return useQuery({
    queryKey: ['memorize_streak'],
    queryFn: async (): Promise<StreakStats> => {
      const { data, error } = await (supabase as any)
        .from('memorize_sessions')
        .select('session_date')
        .order('session_date', { ascending: false })
        .limit(365);
      if (error) throw error;
      const dates = (data || []).map((r: { session_date: string }) => r.session_date);
      return computeStreak(dates);
    },
  });
};

export const useLogMemorizeSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('memorize_sessions')
        .upsert(
          { user_id: session.user.id, session_date: todayISO() },
          { onConflict: 'user_id,session_date' }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memorize_streak'] }),
  });
};
