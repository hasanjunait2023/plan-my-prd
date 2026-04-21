import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

export type LifeNodeType = Database["public"]["Enums"]["life_node_type"];
export type LifeNode = Database["public"]["Tables"]["life_nodes"]["Row"];
export type LifeNodeInsert = Database["public"]["Tables"]["life_nodes"]["Insert"];
export type LifeNodeUpdate = Database["public"]["Tables"]["life_nodes"]["Update"];

export function useLifeNodes() {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<LifeNode[]>([]);
  const [loading, setLoading] = useState(true);
  // Debounce cascading realtime updates so a single tick that triggers
  // many recursive parent recomputes doesn't refetch the whole tree N times.
  const debounceRef = useRef<number | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("life_nodes")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[useLifeNodes] fetch", error);
      return;
    }
    setNodes((data ?? []) as LifeNode[]);
    setLoading(false);
  }, [user]);

  // Keep latest fetchAll in a ref so realtime callback never goes stale
  // and the subscription effect doesn't re-run on every render.
  const fetchAllRef = useRef(fetchAll);
  useEffect(() => {
    fetchAllRef.current = fetchAll;
  }, [fetchAll]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchAllRef.current();

    const channelTopic = `life_nodes_realtime_${user.id}_${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelTopic)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "life_nodes", filter: `user_id=eq.${user.id}` },
        () => {
          if (debounceRef.current) window.clearTimeout(debounceRef.current);
          debounceRef.current = window.setTimeout(() => {
            fetchAllRef.current();
            debounceRef.current = null;
          }, 350);
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const createNode = useCallback(
    async (input: Omit<LifeNodeInsert, "user_id">) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("life_nodes")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) {
        toast({ title: "Failed to create", description: error.message, variant: "destructive" });
        return null;
      }
      toast({ title: "Created", description: input.title });
      return data as LifeNode;
    },
    [user]
  );

  const updateNode = useCallback(async (id: string, patch: LifeNodeUpdate) => {
    const { error } = await supabase.from("life_nodes").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  }, []);

  const deleteNode = useCallback(async (id: string) => {
    const { error } = await supabase.from("life_nodes").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Deleted" });
    return true;
  }, []);

  // Helpers
  const byType = (t: LifeNodeType) => nodes.filter((n) => n.type === t);
  const childrenOf = (parentId: string | null) =>
    nodes.filter((n) => n.parent_id === parentId);
  const findById = (id: string) => nodes.find((n) => n.id === id);

  // Walk up to mission for breadcrumbs
  const ancestorChain = (id: string): LifeNode[] => {
    const chain: LifeNode[] = [];
    let current = findById(id);
    while (current) {
      chain.unshift(current);
      if (!current.parent_id) break;
      current = findById(current.parent_id);
    }
    return chain;
  };

  return {
    nodes,
    loading,
    createNode,
    updateNode,
    deleteNode,
    byType,
    childrenOf,
    findById,
    ancestorChain,
    refetch: fetchAll,
  };
}
