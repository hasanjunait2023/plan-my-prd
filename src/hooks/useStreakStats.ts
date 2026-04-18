import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DailyStat {
  date: string;
  total: number;
  done: number;
  rate: number;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  last30: DailyStat[];
  last7Rate: number;
  totalCompletedAllTime: number;
  loading: boolean;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function useStreakStats(): StreakStats & { refetch: () => void } {
  const { user } = useAuth();
  const [stats, setStats] = useState<StreakStats>({
    currentStreak: 0,
    longestStreak: 0,
    last30: [],
    last7Rate: 0,
    totalCompletedAllTime: 0,
    loading: true,
  });

  const fetch = useCallback(async () => {
    if (!user) return;
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    const startStr = isoDate(start);

    const [logsRes, focusRes, totalRes] = await Promise.all([
      supabase
        .from("life_node_logs")
        .select("date,done,node_id")
        .eq("user_id", user.id)
        .gte("date", startStr),
      supabase
        .from("daily_focus" as never)
        .select("date,node_id")
        .eq("user_id", user.id)
        .gte("date", startStr),
      supabase
        .from("life_node_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("done", true),
    ]);

    const logs = (logsRes.data ?? []) as { date: string; done: boolean; node_id: string }[];
    const focusList = (focusRes.data ?? []) as { date: string; node_id: string }[];

    // Group by date
    const byDate = new Map<string, DailyStat>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (29 - i));
      const ds = isoDate(d);
      byDate.set(ds, { date: ds, total: 0, done: 0, rate: 0 });
    }

    // Total = either focus picked that day OR logs that exist
    focusList.forEach((f) => {
      const e = byDate.get(f.date);
      if (e) e.total++;
    });

    logs.forEach((l) => {
      const e = byDate.get(l.date);
      if (!e) return;
      // If no focus tracked for that day, count log as part of total
      if (focusList.findIndex((f) => f.date === l.date) === -1) e.total++;
      if (l.done) e.done++;
    });

    const last30 = Array.from(byDate.values()).map((s) => ({
      ...s,
      rate: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0,
    }));

    // Streak: count consecutive days from today backward where rate >= 60% (or any done)
    let currentStreak = 0;
    for (let i = last30.length - 1; i >= 0; i--) {
      const day = last30[i];
      // Today might not have data yet — skip if zero total
      if (i === last30.length - 1 && day.total === 0) continue;
      if (day.done > 0 && (day.total === 0 || day.rate >= 60)) currentStreak++;
      else break;
    }

    // Longest streak in 30d window
    let longestStreak = 0;
    let run = 0;
    for (const day of last30) {
      if (day.done > 0 && day.rate >= 60) {
        run++;
        longestStreak = Math.max(longestStreak, run);
      } else if (day.total > 0) {
        run = 0;
      }
    }

    const last7 = last30.slice(-7);
    const last7Sum = last7.reduce((a, b) => a + b.rate, 0);
    const last7Rate = Math.round(last7Sum / 7);

    setStats({
      currentStreak,
      longestStreak,
      last30,
      last7Rate,
      totalCompletedAllTime: totalRes.count ?? 0,
      loading: false,
    });
  }, [user]);

  useEffect(() => {
    fetch();
    if (!user) return;
    const channel = supabase
      .channel("streak_stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "life_node_logs", filter: `user_id=eq.${user.id}` },
        () => fetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_focus", filter: `user_id=eq.${user.id}` },
        () => fetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetch]);

  return { ...stats, refetch: fetch };
}
