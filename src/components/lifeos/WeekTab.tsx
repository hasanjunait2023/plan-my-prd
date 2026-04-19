import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Target,
  TrendingUp,
  Flag,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
} from "lucide-react";
import { useLifeNodes, type LifeNode } from "@/hooks/useLifeNodes";
import { useLifeNodeLogs } from "@/hooks/useLifeNodeLogs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { NodeFormDialog } from "./NodeFormDialog";

const DOW_LABELS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

function startOfWeek(date: Date): Date {
  // Saturday-start week
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day + 1) % 7; // Sat=0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtShort(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function WeekTab() {
  const { user } = useAuth();
  const { byType, childrenOf, ancestorChain, deleteNode, createNode } = useLifeNodes();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [reviewText, setReviewText] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formParent, setFormParent] = useState<string | null>(null);
  const [draggingDailyId, setDraggingDailyId] = useState<string | null>(null);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekly = byType("weekly");
  const allDaily = byType("daily");
  const monthly = byType("monthly");

  // Weekly logs (any date inside week range)
  const weekStartISO = isoDate(days[0]);
  const weekEndISO = isoDate(days[6]);

  // We just use today's logs hook for done state of recurring dailies — simpler
  // For per-day grid, we fetch all week logs once
  const [weekLogs, setWeekLogs] = useState<
    Array<{ node_id: string; date: string; done: boolean; reflection: string }>
  >([]);

  useMemo(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("life_node_logs")
        .select("node_id,date,done,reflection")
        .eq("user_id", user.id)
        .gte("date", weekStartISO)
        .lte("date", weekEndISO);
      if (!cancelled) {
        setWeekLogs(
          (data ?? []).map((l) => ({
            node_id: l.node_id,
            date: l.date,
            done: l.done ?? false,
            reflection: l.reflection ?? "",
          })),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, weekStartISO, weekEndISO]);

  const isDoneOn = (nodeId: string, date: string) =>
    weekLogs.some((l) => l.node_id === nodeId && l.date === date && l.done);

  const totalSlots = weekly.length * 7 || 1;
  const completedSlots = weekly.reduce(
    (acc, w) => acc + days.filter((d) => isDoneOn(w.id, isoDate(d))).length,
    0,
  );
  const weeklyCompletionPct = Math.round((completedSlots / totalSlots) * 100);

  // Pace: how far through the week we are
  const elapsedDays = Math.max(
    1,
    Math.min(7, Math.ceil((today.getTime() - days[0].getTime()) / 86400000) + 1),
  );
  const expectedPct = (elapsedDays / 7) * 100;
  const pace =
    weeklyCompletionPct >= expectedPct + 5
      ? "ahead"
      : weeklyCompletionPct >= expectedPct - 5
      ? "on-track"
      : "behind";

  const paceMeta = {
    ahead: { label: "Ahead 🚀", cls: "bg-green-500/15 text-green-600 border-green-500/30" },
    "on-track": { label: "On track ✓", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
    behind: { label: "Behind ⚠", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  }[pace];

  const isReviewDay = today.getDay() === 5 || today.getDay() === 6; // Fri or Sat

  const handleSaveReview = async () => {
    if (!user || !reviewText.trim()) return;
    setSavingReview(true);
    const { error } = await supabase.from("lifeos_ai_insights").insert({
      user_id: user.id,
      kind: "weekly_review_manual",
      title: `Weekly Review · ${fmtShort(days[0])} – ${fmtShort(days[6])}`,
      body: reviewText.trim(),
    } as never);
    setSavingReview(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setReviewText("");
    toast({ title: "Review saved", description: "Stored in AI Insights history." });
  };

  const handleDropOnWeekly = async (weeklyId: string) => {
    if (!draggingDailyId) return;
    const ok = await supabase
      .from("life_nodes")
      .update({ parent_id: weeklyId })
      .eq("id", draggingDailyId);
    if (ok.error) {
      toast({ title: "Move failed", description: ok.error.message, variant: "destructive" });
    } else {
      toast({ title: "Task linked to weekly block" });
    }
    setDraggingDailyId(null);
  };

  const orphanDaily = allDaily.filter((d) => {
    if (!d.parent_id) return true;
    const parent = ancestorChain(d.id).find((n) => n.type === "weekly");
    return !parent;
  });

  return (
    <div className="space-y-5">
      {/* Header / Navigation */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                Week of {fmtShort(days[0])} – {fmtShort(days[6])}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {weekly.length} focus block(s) · Sat-start week
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={paceMeta.cls}>
              {paceMeta.label}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() - 7);
                setWeekStart(d);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setWeekStart(startOfWeek(new Date()))}>
              Today
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + 7);
                setWeekStart(d);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Week completion meter */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" /> Week completion
            </span>
            <span className="text-muted-foreground">
              {completedSlots}/{totalSlots} slots · expected ~{Math.round(expectedPct)}%
            </span>
          </div>
          <Progress value={weeklyCompletionPct} className="h-2" />
        </CardContent>
      </Card>

      {/* 7-day grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Focus Block × Day Grid
            <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              ✓ = logged done that day
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weekly.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-8 border border-dashed rounded-md">
              No weekly focus blocks yet. Create one below or under a Monthly Milestone in the
              Vision tab.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left font-medium p-2 min-w-[180px]">Block</th>
                    {days.map((d, i) => {
                      const isToday = isoDate(d) === isoDate(today);
                      return (
                        <th
                          key={i}
                          className={`p-2 text-center font-medium ${
                            isToday ? "text-primary" : ""
                          }`}
                        >
                          <div>{DOW_LABELS[i]}</div>
                          <div className="text-[10px] opacity-70">{d.getDate()}</div>
                        </th>
                      );
                    })}
                    <th className="p-2 text-center font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {weekly.map((w) => {
                    const doneCount = days.filter((d) => isDoneOn(w.id, isoDate(d))).length;
                    const pct = Math.round((doneCount / 7) * 100);
                    return (
                      <tr key={w.id} className="border-t border-border/40 hover:bg-muted/30">
                        <td className="p-2">
                          <div
                            className="font-medium truncate max-w-[180px]"
                            style={{ borderLeft: `3px solid ${w.color}`, paddingLeft: 6 }}
                          >
                            {w.title}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {childrenOf(w.id).length} task(s)
                          </div>
                        </td>
                        {days.map((d, i) => {
                          const done = isDoneOn(w.id, isoDate(d));
                          return (
                            <td key={i} className="p-1 text-center">
                              {done ? (
                                <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                              ) : (
                                <Circle className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                        <td className="p-2 text-center font-semibold">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drop zones — link orphan daily tasks to a weekly block */}
      {weekly.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flag className="h-4 w-4 text-primary" /> Link tasks to weekly blocks
              <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                drag → drop
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {/* Weekly drop zones */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Weekly blocks
              </p>
              {weekly.map((w) => (
                <div
                  key={w.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropOnWeekly(w.id)}
                  className={`p-2.5 rounded-md border transition ${
                    draggingDailyId
                      ? "border-dashed border-primary bg-primary/5"
                      : "border-border/40 bg-card"
                  }`}
                  style={{ borderLeft: `3px solid ${w.color}` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium truncate">{w.title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {childrenOf(w.id).length}
                    </Badge>
                  </div>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFormParent(monthly[0]?.id ?? null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> New weekly block
              </Button>
            </div>

            {/* Orphan daily list */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Unlinked daily tasks ({orphanDaily.length})
              </p>
              {orphanDaily.length === 0 ? (
                <div className="text-[11px] text-muted-foreground italic p-3 border border-dashed rounded">
                  All daily tasks are linked. ✓
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                  {orphanDaily.map((d) => (
                    <div
                      key={d.id}
                      draggable
                      onDragStart={() => setDraggingDailyId(d.id)}
                      onDragEnd={() => setDraggingDailyId(null)}
                      className={`p-2 rounded-md border border-border/40 bg-card text-xs cursor-grab active:cursor-grabbing flex items-center justify-between gap-2 ${
                        draggingDailyId === d.id ? "opacity-50" : ""
                      }`}
                    >
                      <span className="truncate">{d.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-destructive shrink-0"
                        onClick={() => deleteNode(d.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly review */}
      <Card
        className={
          isReviewDay
            ? "border-primary/40 bg-gradient-to-br from-primary/5 to-transparent"
            : ""
        }
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Flag className="h-4 w-4 text-primary" /> Weekly Review
            {isReviewDay && (
              <Badge className="text-[9px] px-1.5 py-0 h-4">DUE TODAY</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            placeholder={`What were your wins this week?\nWhat did you learn?\nWhat's the top focus next week?`}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={5}
            className="text-xs"
          />
          <div className="flex justify-between items-center">
            <p className="text-[10px] text-muted-foreground">
              Saved to AI Insights so AI Coach can reference it next week.
            </p>
            <Button size="sm" onClick={handleSaveReview} disabled={savingReview || !reviewText.trim()}>
              Save review
            </Button>
          </div>
        </CardContent>
      </Card>

      <NodeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialType="weekly"
        parentId={formParent}
        onSubmit={async (data) => {
          await createNode({
            ...data,
            parent_id: formParent,
          });
          setFormOpen(false);
        }}
      />
    </div>
  );
}
