import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Plus,
  Target,
  TrendingUp,
  Trash2,
  Pencil,
} from "lucide-react";
import { useLifeNodes, type LifeNode } from "@/hooks/useLifeNodes";
import { NodeFormDialog } from "./NodeFormDialog";
import { cn } from "@/lib/utils";

function daysInMonth(year: number, month0: number) {
  return new Date(year, month0 + 1, 0).getDate();
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}

function endOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3 + 3, 0);
}

interface PaceInfo {
  pace: "ahead" | "on-track" | "behind" | "no-deadline";
  expected: number;
  daysLeft: number;
  totalDays: number;
}

function computePace(node: LifeNode): PaceInfo {
  if (!node.due_date) {
    return { pace: "no-deadline", expected: 0, daysLeft: 0, totalDays: 0 };
  }
  const start = node.start_date ? new Date(node.start_date) : new Date(node.created_at);
  const end = new Date(node.due_date);
  const now = new Date();
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = now.getTime() - start.getTime();
  const totalDays = Math.max(1, Math.ceil(totalMs / 86400000));
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
  const expected = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  const diff = node.progress - expected;
  const pace: PaceInfo["pace"] =
    diff >= 5 ? "ahead" : diff >= -5 ? "on-track" : "behind";
  return { pace, expected: Math.round(expected), daysLeft, totalDays };
}

const PACE_META: Record<PaceInfo["pace"], { label: string; cls: string }> = {
  ahead: { label: "Ahead", cls: "bg-green-500/15 text-green-600 border-green-500/30" },
  "on-track": {
    label: "On track",
    cls: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  },
  behind: { label: "Behind", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  "no-deadline": {
    label: "No deadline",
    cls: "bg-muted text-muted-foreground border-border",
  },
};

interface MilestoneCardProps {
  node: LifeNode;
  childrenList: LifeNode[];
  childrenOf: (id: string) => LifeNode[];
  onEdit: (n: LifeNode) => void;
  onDelete: (id: string) => void;
  onAddChild: (parent: LifeNode) => void;
}

function MilestoneCard({ node, childrenList, childrenOf, onEdit, onDelete, onAddChild }: MilestoneCardProps) {
  const [open, setOpen] = useState(false);
  const pace = computePace(node);
  const meta = PACE_META[pace.pace];

  return (
    <Card
      className="hover:border-primary/40 transition"
      style={{ borderLeft: `4px solid ${node.color}` }}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-sm truncate">{node.title}</h4>
              <Badge variant="outline" className="text-[10px] capitalize">
                {node.type}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px]", meta.cls)}>
                {meta.label}
              </Badge>
              {node.due_date && pace.daysLeft <= 3 && pace.pace === "behind" && (
                <Badge variant="destructive" className="text-[10px]">
                  {pace.daysLeft}d left
                </Badge>
              )}
            </div>
            {node.description && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                {node.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onAddChild(node)}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onEdit(node)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={() => onDelete(node.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span className="flex items-center gap-1.5">
              <Target className="h-3 w-3" />
              {Math.round(node.progress)}%
              {pace.pace !== "no-deadline" && (
                <span className="opacity-70">· expected {pace.expected}%</span>
              )}
              {node.target_value && (
                <span>
                  · {node.current_value}/{node.target_value} {node.unit}
                </span>
              )}
            </span>
            {node.due_date && (
              <span>
                Due {node.due_date} · {pace.daysLeft}d left
              </span>
            )}
          </div>
          <div className="relative">
            <Progress value={node.progress} className="h-2" />
            {pace.pace !== "no-deadline" && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
                style={{ left: `${pace.expected}%` }}
                title={`Expected ${pace.expected}%`}
              />
            )}
          </div>
        </div>

        {childrenList.length > 0 && (
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] w-full justify-start gap-1 px-1"
              >
                {open ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                {childrenList.length} sub-item(s)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1.5 pt-1.5">
              {childrenList.map((c) => {
                const cPace = computePace(c);
                return (
                  <div
                    key={c.id}
                    className="p-2 rounded border border-border/40 bg-muted/20"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium truncate">{c.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {Math.round(c.progress)}% · {childrenOf(c.id).length} ch.
                      </span>
                    </div>
                    <Progress value={c.progress} className="h-1 mt-1" />
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

export function MonthTab() {
  const { byType, childrenOf, deleteNode, createNode, updateNode, findById } = useLifeNodes();
  const [view, setView] = useState<"month" | "quarter">("month");
  const [formOpen, setFormOpen] = useState(false);
  const [formInitialType, setFormInitialType] = useState<"monthly" | "quarterly" | "weekly">(
    "monthly",
  );
  const [formParent, setFormParent] = useState<string | null>(null);
  const [editing, setEditing] = useState<LifeNode | null>(null);

  const monthly = byType("monthly");
  const quarterly = byType("quarterly");
  const yearly = byType("yearly");

  const now = new Date();
  const qStart = startOfQuarter(now);
  const qEnd = endOfQuarter(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const dimNow = daysInMonth(now.getFullYear(), now.getMonth());
  const monthElapsedPct = Math.round((now.getDate() / dimNow) * 100);
  const qTotalDays = Math.max(
    1,
    Math.ceil((qEnd.getTime() - qStart.getTime()) / 86400000) + 1,
  );
  const qElapsedDays = Math.max(
    1,
    Math.ceil((now.getTime() - qStart.getTime()) / 86400000),
  );
  const qElapsedPct = Math.round((qElapsedDays / qTotalDays) * 100);

  // Quarter rollup: average progress of all monthlies whose due_date in quarter
  const monthliesThisQuarter = monthly.filter((m) => {
    if (!m.due_date) return false;
    const d = new Date(m.due_date);
    return d >= qStart && d <= qEnd;
  });
  const qAvgProgress = monthliesThisQuarter.length
    ? Math.round(
        monthliesThisQuarter.reduce((sum, m) => sum + Number(m.progress || 0), 0) /
          monthliesThisQuarter.length,
      )
    : 0;
  const qPace =
    qAvgProgress >= qElapsedPct + 5
      ? "ahead"
      : qAvgProgress >= qElapsedPct - 5
      ? "on-track"
      : "behind";

  const monthliesThisMonth = monthly.filter((m) => {
    if (!m.due_date) return false;
    const d = new Date(m.due_date);
    return d >= monthStart && d <= monthEnd;
  });
  const monthAvg = monthliesThisMonth.length
    ? Math.round(
        monthliesThisMonth.reduce((sum, m) => sum + Number(m.progress || 0), 0) /
          monthliesThisMonth.length,
      )
    : 0;
  const monthPace =
    monthAvg >= monthElapsedPct + 5
      ? "ahead"
      : monthAvg >= monthElapsedPct - 5
      ? "on-track"
      : "behind";

  const handleEdit = (n: LifeNode) => {
    setEditing(n);
    setFormInitialType(n.type as "monthly" | "quarterly");
    setFormParent(n.parent_id);
    setFormOpen(true);
  };

  const handleAddChild = (parent: LifeNode) => {
    setEditing(null);
    setFormInitialType(parent.type === "quarterly" ? "monthly" : "weekly");
    setFormParent(parent.id);
    setFormOpen(true);
  };

  const handleAddTop = (kind: "monthly" | "quarterly") => {
    setEditing(null);
    setFormInitialType(kind);
    setFormParent(yearly[0]?.id ?? null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Header summary */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">
                  {now.toLocaleString(undefined, { month: "long", year: "numeric" })}
                </span>
              </div>
              <Badge
                variant="outline"
                className={cn("text-[10px]", PACE_META[monthPace].cls)}
              >
                {PACE_META[monthPace].label}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                Day {now.getDate()}/{dimNow} · {monthlyMs(monthStart, monthEnd)}
              </span>
              <span>
                Progress {monthAvg}% / Expected {monthElapsedPct}%
              </span>
            </div>
            <div className="relative">
              <Progress value={monthAvg} className="h-2" />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
                style={{ left: `${monthElapsedPct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {monthliesThisMonth.length} milestones due this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">
                  Q{Math.floor(now.getMonth() / 3) + 1} {now.getFullYear()}
                </span>
              </div>
              <Badge variant="outline" className={cn("text-[10px]", PACE_META[qPace].cls)}>
                {PACE_META[qPace].label}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                Day {qElapsedDays}/{qTotalDays}
              </span>
              <span>
                Avg {qAvgProgress}% / Expected {qElapsedPct}%
              </span>
            </div>
            <div className="relative">
              <Progress value={qAvgProgress} className="h-2" />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
                style={{ left: `${qElapsedPct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {monthliesThisQuarter.length} milestones in this quarter
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tab between month and quarter list */}
      <Tabs value={view} onValueChange={(v) => setView(v as "month" | "quarter")}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="month">Monthly Milestones</TabsTrigger>
            <TabsTrigger value="quarter">Quarterly Objectives</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={() => handleAddTop(view === "month" ? "monthly" : "quarterly")}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New {view === "month" ? "milestone" : "objective"}
          </Button>
        </div>

        <TabsContent value="month" className="mt-4 space-y-3">
          {monthly.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                No monthly milestones yet. Create one above or under a Quarterly Objective.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {monthly.map((m) => (
                <MilestoneCard
                  key={m.id}
                  node={m}
                  childrenList={childrenOf(m.id)}
                  childrenOf={childrenOf}
                  onEdit={handleEdit}
                  onDelete={deleteNode}
                  onAddChild={handleAddChild}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quarter" className="mt-4 space-y-3">
          {quarterly.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                No quarterly objectives yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {quarterly.map((q) => (
                <MilestoneCard
                  key={q.id}
                  node={q}
                  childrenList={childrenOf(q.id)}
                  childrenOf={childrenOf}
                  onEdit={handleEdit}
                  onDelete={deleteNode}
                  onAddChild={handleAddChild}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <NodeFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        initialType={formInitialType}
        parentId={formParent}
        editing={editing}
        onSubmit={async (data) => {
          if (editing) {
            await updateNode(editing.id, data);
          } else {
            await createNode({
              ...data,
              parent_id: formParent,
            });
          }
          setFormOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function monthlyMs(start: Date, end: Date) {
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}
