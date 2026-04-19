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

      // Optimistic update — flip UI immediately so user can keep ticking other items
      // without waiting for DB roundtrip / realtime cascade.
      if (existing) {
        setLogs((prev) =>
          prev.map((l) => (l.id === existing.id ? { ...l, done } : l))
        );
        const { error } = await supabase
          .from("life_node_logs")
          .update({ done })
          .eq("id", existing.id);
        if (error) {
          // Roll back on failure
          setLogs((prev) =>
            prev.map((l) => (l.id === existing.id ? { ...l, done: !done } : l))
          );
          toast({ title: "Failed", description: error.message, variant: "destructive" });
        }
      } else {
        const tempId = `temp-${nodeId}-${Date.now()}`;
        const optimistic: LifeNodeLog = {
          id: tempId,
          user_id: user.id,
          node_id: nodeId,
          date,
          done,
          value_added: 0,
          reflection: "",
          created_at: new Date().toISOString(),
        } as LifeNodeLog;
        setLogs((prev) => [...prev, optimistic]);
        const { data, error } = await supabase
          .from("life_node_logs")
          .insert({ user_id: user.id, node_id: nodeId, date, done })
          .select()
          .single();
        if (error) {
          setLogs((prev) => prev.filter((l) => l.id !== tempId));
          toast({ title: "Failed", description: error.message, variant: "destructive" });
        } else if (data) {
          // Replace temp row with real row
          setLogs((prev) => prev.map((l) => (l.id === tempId ? (data as LifeNodeLog) : l)));
        }
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
