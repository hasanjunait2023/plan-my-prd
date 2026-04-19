import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Sun,
  Coffee,
  Moon,
  Clock,
  Sparkles,
  Trash2,
  Search,
  Plus,
  Moon as MoonIcon,
} from "lucide-react";
import { useDailyFocus, type TimeSlot } from "@/hooks/useDailyFocus";
import { useLifeNodes, type LifeNode } from "@/hooks/useLifeNodes";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function tomorrowLabel(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

type SlotMeta = {
  key: TimeSlot;
  label: string;
  hours: string;
  Icon: typeof Sun;
  gradient: string;
  border: string;
  text: string;
};

const SLOTS: SlotMeta[] = [
  {
    key: "morning",
    label: "Morning",
    hours: "6 AM – 12 PM",
    Icon: Sun,
    gradient: "from-amber-500/15 to-orange-500/5",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "afternoon",
    label: "Afternoon",
    hours: "12 PM – 6 PM",
    Icon: Coffee,
    gradient: "from-sky-500/15 to-blue-500/5",
    border: "border-sky-500/30",
    text: "text-sky-600 dark:text-sky-400",
  },
  {
    key: "evening",
    label: "Evening",
    hours: "6 PM – 11 PM",
    Icon: Moon,
    gradient: "from-indigo-500/15 to-purple-500/5",
    border: "border-indigo-500/30",
    text: "text-indigo-600 dark:text-indigo-400",
  },
];

export default function TomorrowPlanner() {
  const { user } = useAuth();
  const date = tomorrowISO();
  const { focus, loading, generate, generating, removeFocus, updateSlot, refetch } =
    useDailyFocus(date);
  const { nodes, byType, ancestorChain, findById } = useLifeNodes();

  const [draggingFocusId, setDraggingFocusId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Pickable nodes: weekly + daily that aren't already in tomorrow's focus
  const pickable = useMemo(() => {
    const inFocus = new Set(focus.map((f) => f.node_id));
    return nodes
      .filter((n) => (n.type === "weekly" || n.type === "daily") && !inFocus.has(n.id))
      .filter((n) =>
        search.trim()
          ? n.title.toLowerCase().includes(search.trim().toLowerCase())
          : true,
      );
  }, [nodes, focus, search]);

  const itemsBySlot = (slot: TimeSlot) =>
    focus
      .filter((f) => (f.time_slot ?? "unset") === slot)
      .map((f) => ({ focus: f, node: findById(f.node_id) }))
      .filter((x): x is { focus: typeof focus[0]; node: LifeNode } => !!x.node);

  const addNodeToSlot = async (nodeId: string, slot: TimeSlot) => {
    if (!user) return;
    const nextRank = focus.length + 1;
    const { error } = await supabase.from("daily_focus" as never).insert({
      user_id: user.id,
      date,
      node_id: nodeId,
      rank: nextRank,
      reason: "Pre-planned for tomorrow",
      source: "manual",
      time_slot: slot,
    } as never);
    if (error) {
      toast({ title: "Failed to add", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Added to tomorrow", description: `Slotted into ${slot}` });
    setDraggingNodeId(null);
    refetch();
  };

  const handleDropOnSlot = (slot: TimeSlot) => {
    if (draggingFocusId) {
      updateSlot(draggingFocusId, slot);
      setDraggingFocusId(null);
    } else if (draggingNodeId) {
      addNodeToSlot(draggingNodeId, slot);
    }
  };

  const totalPlanned = focus.length;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-5 max-w-6xl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/life-os">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <MoonIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Tomorrow Planner</h1>
            <p className="text-xs text-muted-foreground">
              {tomorrowLabel()} · {totalPlanned} task{totalPlanned === 1 ? "" : "s"} planned
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => generate(true)}
            disabled={generating}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            {generating ? "Planning…" : "AI auto-plan"}
          </Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* LEFT: pickable nodes */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Backlog
              <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-auto">
                drag → slot
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="pl-7 h-8 text-xs"
              />
            </div>

            {pickable.length === 0 ? (
              <div className="text-[11px] text-muted-foreground italic p-3 border border-dashed border-border/40 rounded-md text-center">
                {search ? "No matches." : "All tasks already planned for tomorrow."}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                {pickable.map((n) => {
                  const chain = ancestorChain(n.id);
                  const breadcrumb = chain.slice(0, -1).map((c) => c.title).join(" → ");
                  return (
                    <div
                      key={n.id}
                      draggable
                      onDragStart={() => setDraggingNodeId(n.id)}
                      onDragEnd={() => setDraggingNodeId(null)}
                      className={`p-2 rounded-md border border-border/40 bg-card hover:border-border cursor-grab active:cursor-grabbing transition ${
                        draggingNodeId === n.id ? "opacity-50" : ""
                      }`}
                      style={{ borderLeft: `3px solid ${n.color}` }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium leading-tight truncate">
                            {n.title}
                          </p>
                          {breadcrumb && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                              {breadcrumb}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[9px] capitalize shrink-0">
                          {n.type}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: time-block slots */}
        <div className="lg:col-span-2 space-y-3">
          {SLOTS.map((slot) => {
            const items = itemsBySlot(slot.key);
            return (
              <div
                key={slot.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnSlot(slot.key)}
                className={`relative rounded-lg border ${slot.border} bg-gradient-to-br ${slot.gradient} p-3 transition min-h-[120px] ${
                  draggingFocusId || draggingNodeId ? "border-dashed" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <slot.Icon className={`h-4 w-4 ${slot.text}`} />
                    <span className={`text-sm font-semibold ${slot.text}`}>
                      {slot.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{slot.hours}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {items.length} task{items.length === 1 ? "" : "s"}
                  </span>
                </div>

                {items.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic px-2 py-6 text-center border border-dashed border-border/40 rounded-md">
                    Drop a task here for {slot.label.toLowerCase()}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {items.map(({ focus: f, node: t }) => {
                      const chain = ancestorChain(t.id);
                      const breadcrumb = chain
                        .slice(0, -1)
                        .map((c) => c.title)
                        .join(" → ");
                      return (
                        <div
                          key={f.id}
                          draggable
                          onDragStart={() => setDraggingFocusId(f.id)}
                          onDragEnd={() => setDraggingFocusId(null)}
                          className={`group flex items-start gap-2 p-2.5 rounded-md bg-card border border-border/40 hover:border-border transition cursor-grab active:cursor-grabbing ${
                            draggingFocusId === f.id ? "opacity-50" : ""
                          }`}
                          style={{ borderLeft: `3px solid ${t.color}` }}
                        >
                          <span
                            className={`text-[10px] font-bold pt-0.5 ${slot.text}`}
                          >
                            #{f.rank}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-tight">{t.title}</p>
                            {breadcrumb && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                {breadcrumb}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition shrink-0"
                            onClick={() => removeFocus(f.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unscheduled bucket */}
          {itemsBySlot("unset").length > 0 && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDropOnSlot("unset")}
              className="rounded-lg border border-dashed border-border p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground">
                  Unscheduled
                </span>
              </div>
              <div className="space-y-1.5">
                {itemsBySlot("unset").map(({ focus: f, node: t }) => (
                  <div
                    key={f.id}
                    draggable
                    onDragStart={() => setDraggingFocusId(f.id)}
                    onDragEnd={() => setDraggingFocusId(null)}
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-card border border-border/40 cursor-grab active:cursor-grabbing"
                  >
                    <span className="text-xs truncate">{t.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-destructive shrink-0"
                      onClick={() => removeFocus(f.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground text-center">Loading plan…</p>
      )}
    </div>
  );
}
