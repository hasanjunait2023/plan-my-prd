// Smart Daily Planner — picks top 3 priority tasks aligned with user's goals
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Node {
  id: string;
  title: string;
  type: string;
  parent_id: string | null;
  priority: number;
  progress: number;
  status: string;
  due_date: string | null;
  description: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing auth" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const today = new Date().toISOString().slice(0, 10);

    // Force regeneration if force=true
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const force = !!body.force;

    // If today's focus exists and not forcing, return it
    if (!force) {
      const { data: existing } = await admin
        .from("daily_focus")
        .select("*")
        .eq("user_id", userId)
        .eq("date", today)
        .order("rank");
      if (existing && existing.length > 0) {
        return json({ focus: existing, generated: false });
      }
    } else {
      await admin.from("daily_focus").delete().eq("user_id", userId).eq("date", today);
    }

    // Fetch all active nodes
    const { data: nodes } = await admin
      .from("life_nodes")
      .select("id,title,type,parent_id,priority,progress,status,due_date,description")
      .eq("user_id", userId)
      .neq("status", "archived");

    if (!nodes || nodes.length === 0) {
      return json({ focus: [], generated: false, message: "No goals yet" });
    }

    // Build parent index for ancestor walking
    const byId = new Map<string, Node>();
    nodes.forEach((n: Node) => byId.set(n.id, n));

    const findMission = (nodeId: string): Node | null => {
      let cur = byId.get(nodeId);
      while (cur) {
        if (cur.type === "mission") return cur;
        if (!cur.parent_id) return null;
        cur = byId.get(cur.parent_id) ?? undefined;
      }
      return null;
    };

    // Today's already-logged completions to skip
    const { data: todayLogs } = await admin
      .from("life_node_logs")
      .select("node_id,done")
      .eq("user_id", userId)
      .eq("date", today);
    const doneToday = new Set(
      (todayLogs ?? []).filter((l) => l.done).map((l) => l.node_id),
    );

    // Score each candidate
    const todayDate = new Date(today);
    const scored = (nodes as Node[])
      .filter((n) => n.progress < 100 && !doneToday.has(n.id))
      .map((n) => {
        let score = 0;
        // Priority: 1=critical (highest), 5=lowest
        score += (6 - (n.priority || 3)) * 20;
        // Type weighting — daily/weekly highest, then monthly, etc.
        const typeWeight: Record<string, number> = {
          daily: 50, weekly: 40, monthly: 25, quarterly: 15, yearly: 10, mission: 5, vision: 0,
        };
        score += typeWeight[n.type] ?? 0;
        // Due date urgency
        if (n.due_date) {
          const days = Math.ceil(
            (new Date(n.due_date).getTime() - todayDate.getTime()) / 86400000,
          );
          if (days <= 0) score += 60;
          else if (days <= 3) score += 40;
          else if (days <= 7) score += 25;
          else if (days <= 30) score += 10;
        }
        // Progress momentum bonus
        if (n.progress > 0 && n.progress < 100) score += 15;

        return { node: n, score };
      })
      .sort((a, b) => b.score - a.score);

    // Diversify across missions — pick top 3 from different missions if possible
    const picked: { node: Node; reason: string }[] = [];
    const usedMissions = new Set<string>();

    for (const { node } of scored) {
      const mission = findMission(node.id);
      const missionKey = mission?.id ?? "none";
      if (picked.length < 3 && !usedMissions.has(missionKey)) {
        const reason = buildReason(node, mission);
        picked.push({ node, reason });
        usedMissions.add(missionKey);
      }
      if (picked.length === 3) break;
    }

    // Fill remaining slots ignoring mission diversity
    if (picked.length < 3) {
      for (const { node } of scored) {
        if (picked.length >= 3) break;
        if (picked.find((p) => p.node.id === node.id)) continue;
        const mission = findMission(node.id);
        picked.push({ node, reason: buildReason(node, mission) });
      }
    }

    if (picked.length === 0) {
      return json({ focus: [], generated: false, message: "All goals complete!" });
    }

    // Insert
    const rows = picked.map((p, i) => ({
      user_id: userId,
      date: today,
      node_id: p.node.id,
      rank: i + 1,
      reason: p.reason,
      source: "auto",
    }));

    const { data: inserted, error: insertErr } = await admin
      .from("daily_focus")
      .insert(rows)
      .select();

    if (insertErr) return json({ error: insertErr.message }, 500);

    return json({ focus: inserted, generated: true });
  } catch (e) {
    console.error("[generate-daily-focus]", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function buildReason(node: Node, mission: Node | null): string {
  const parts: string[] = [];
  if (node.priority === 1) parts.push("Critical priority");
  if (node.due_date) {
    const days = Math.ceil(
      (new Date(node.due_date).getTime() - Date.now()) / 86400000,
    );
    if (days <= 0) parts.push("Due today/overdue");
    else if (days <= 3) parts.push(`Due in ${days}d`);
    else if (days <= 7) parts.push("Due this week");
  }
  if (node.progress > 0 && node.progress < 100) {
    parts.push(`${Math.round(node.progress)}% done — keep momentum`);
  }
  if (mission) parts.push(`Aligned with: ${mission.title}`);
  return parts.join(" • ") || "Active goal";
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
