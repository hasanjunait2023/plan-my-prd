import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

export type LifeNodeLog = Database["public"]["Tables"]["life_node_logs"]["Row"];

const todayISO = () => new Date().toISOString().slice(0, 10);

export function useLifeNodeLogs(date: string = todayISO()) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LifeNodeLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("life_node_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date);
    if (error) {
      console.error("[useLifeNodeLogs]", error);
      return;
    }
    setLogs((data ?? []) as LifeNodeLog[]);
    setLoading(false);
  }, [user, date]);

  useEffect(() => {
    fetch();
    if (!user) return;
    const channel = supabase
      .channel(`life_node_logs_${date}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "life_node_logs",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, date, fetch]);

  const toggleDone = useCallback(
    async (nodeId: string, done: boolean) => {
      if (!user) return;
      const existing = logs.find((l) => l.node_id === nodeId);
      if (existing) {
        const { error } = await supabase
          .from("life_node_logs")
          .update({ done })
          .eq("id", existing.id);
        if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
      } else {
        const { error } = await supabase.from("life_node_logs").insert({
          user_id: user.id,
          node_id: nodeId,
          date,
          done,
        });
        if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
      }
    },
    [user, logs, date]
  );

  const saveReflection = useCallback(
    async (nodeId: string, reflection: string) => {
      if (!user) return;
      const existing = logs.find((l) => l.node_id === nodeId);
      if (existing) {
        await supabase
          .from("life_node_logs")
          .update({ reflection })
          .eq("id", existing.id);
      } else {
        await supabase.from("life_node_logs").insert({
          user_id: user.id,
          node_id: nodeId,
          date,
          reflection,
          done: false,
        });
      }
      toast({ title: "Reflection saved" });
    },
    [user, logs, date]
  );

  const isDone = (nodeId: string) =>
    logs.find((l) => l.node_id === nodeId)?.done ?? false;
  const reflectionOf = (nodeId: string) =>
    logs.find((l) => l.node_id === nodeId)?.reflection ?? "";

  return { logs, loading, toggleDone, saveReflection, isDone, reflectionOf };
}
