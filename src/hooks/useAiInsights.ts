import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AiInsight = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  metadata: any;
  sent_to_telegram: boolean;
  created_at: string;
};

export function useAiInsights(limit = 5) {
  const { user } = useAuth();
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("lifeos_ai_insights" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("[useAiInsights]", error);
      setLoading(false);
      return;
    }
    setInsights((data ?? []) as unknown as AiInsight[]);
    setLoading(false);
  }, [user, limit]);

  useEffect(() => {
    fetchInsights();
    if (!user) return;
    const ch = supabase
      .channel("lifeos_ai_insights")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lifeos_ai_insights",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchInsights(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, fetchInsights]);

  return { insights, loading, refetch: fetchInsights };
}
