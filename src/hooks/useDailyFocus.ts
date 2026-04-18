import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface DailyFocus {
  id: string;
  user_id: string;
  date: string;
  node_id: string;
  rank: number;
  reason: string;
  source: string;
  created_at: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function useDailyFocus(date: string = todayISO()) {
  const { user } = useAuth();
  const [focus, setFocus] = useState<DailyFocus[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchFocus = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("daily_focus" as never)
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("rank");
    if (error) {
      console.error("[useDailyFocus]", error);
      return;
    }
    setFocus((data ?? []) as DailyFocus[]);
    setLoading(false);
  }, [user, date]);

  useEffect(() => {
    fetchFocus();
    if (!user) return;
    const channel = supabase
      .channel(`daily_focus_${date}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_focus", filter: `user_id=eq.${user.id}` },
        () => fetchFocus(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, date, fetchFocus]);

  const generate = useCallback(
    async (force = false) => {
      if (!user) return;
      setGenerating(true);
      try {
        const { data, error } = await supabase.functions.invoke("generate-daily-focus", {
          body: { force },
        });
        if (error) throw error;
        if (data?.message) {
          toast({ title: "Planner", description: data.message });
        } else if (data?.generated) {
          toast({ title: "Today's focus ready 🎯", description: "Top 3 priorities picked" });
        }
        await fetchFocus();
      } catch (e) {
        toast({
          title: "Failed to generate",
          description: (e as Error).message,
          variant: "destructive",
        });
      } finally {
        setGenerating(false);
      }
    },
    [user, fetchFocus],
  );

  const removeFocus = useCallback(async (id: string) => {
    await supabase.from("daily_focus" as never).delete().eq("id", id);
  }, []);

  const addManualFocus = useCallback(
    async (nodeId: string) => {
      if (!user) return;
      const nextRank = focus.length + 1;
      await supabase.from("daily_focus" as never).insert({
        user_id: user.id,
        date,
        node_id: nodeId,
        rank: nextRank,
        reason: "Manually pinned",
        source: "manual",
      } as never);
    },
    [user, date, focus.length],
  );

  return { focus, loading, generating, generate, removeFocus, addManualFocus, refetch: fetchFocus };
}
