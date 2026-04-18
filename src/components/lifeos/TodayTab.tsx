import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Sun, Moon, Sparkles, RefreshCw, Target, X } from "lucide-react";
import { useLifeNodes, type LifeNode } from "@/hooks/useLifeNodes";
import { useLifeNodeLogs } from "@/hooks/useLifeNodeLogs";
import { useDailyFocus } from "@/hooks/useDailyFocus";
import { NodeFormDialog } from "./NodeFormDialog";
import { AlignmentBadge } from "./AlignmentBadge";
import { StreakBanner } from "./StreakBanner";
import { MomentumChart } from "./MomentumChart";
import { TelegramReminderCard } from "./TelegramReminderCard";

const today = () => new Date().toISOString().slice(0, 10);

export function TodayTab() {
  const { nodes, byType, ancestorChain, createNode, deleteNode, updateNode, findById } =
    useLifeNodes();
  const { isDone, toggleDone, saveReflection } = useLifeNodeLogs(today());
  const { focus, generating, generate, removeFocus } = useDailyFocus(today());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LifeNode | null>(null);
  const [reflection, setReflection] = useState("");

  const dailyTasks = byType("daily");
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Focus tasks (auto-picked) — resolve their nodes
  const focusItems = focus
    .map((f) => ({ focus: f, node: findById(f.node_id) }))
    .filter((x): x is { focus: typeof focus[0]; node: LifeNode } => !!x.node);

  // Done count for alignment
  const doneCount = focusItems.filter((f) => isDone(f.node.id)).length;
  const focusCompletion =
    focusItems.length === 0 ? 0 : Math.round((doneCount / focusItems.length) * 100);

  const aligned = dailyTasks.filter((t) => t.parent_id !== null).length;
  const alignmentScore = dailyTasks.length === 0 ? 100 : (aligned / dailyTasks.length) * 100;

  const renderFocusTask = (item: { focus: typeof focus[0]; node: LifeNode }) => {
    const { focus: f, node: t } = item;
    const chain = ancestorChain(t.id);
    const breadcrumb = chain.slice(0, -1).map((c) => c.title).join(" → ");
    const done = isDone(t.id);
    return (
      <div
        key={f.id}
        className="flex items-start gap-3 p-3 rounded-md border border-border/50 bg-card/50 hover:bg-muted/30 transition"
      >
        <div className="flex flex-col items-center gap-1 pt-1">
          <Checkbox checked={done} onCheckedChange={(v) => toggleDone(t.id, !!v)} />
          <span className="text-[10px] font-bold text-primary">#{f.rank}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
            {t.title}
          </p>
          {breadcrumb && (
            <p className="text-xs text-muted-foreground mt-0.5">{breadcrumb}</p>
          )}
          {f.reason && (
            <p className="text-[11px] text-primary/80 mt-1 italic">{f.reason}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant={f.source === "auto" ? "default" : "outline"} className="text-[10px]">
            {f.source === "auto" ? "AI pick" : "Pinned"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => removeFocus(f.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  const renderTask = (t: LifeNode) => {
    const chain = ancestorChain(t.id);
    const breadcrumb = chain.slice(0, -1).map((c) => c.title).join(" → ");
    const done = isDone(t.id);
    return (
      <div key={t.id} className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/30 transition">
        <Checkbox checked={done} onCheckedChange={(v) => toggleDone(t.id, !!v)} className="mt-1" />
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
            {t.title}
          </p>
          {breadcrumb && <p className="text-xs text-muted-foreground mt-0.5">{breadcrumb}</p>}
          {t.description && (
            <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {t.priority === 1 && <Badge variant="destructive" className="text-[10px]">Critical</Badge>}
          {!t.parent_id && <Badge variant="outline" className="text-[10px]">Ad-hoc</Badge>}
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => deleteNode(t.id)}>
            ✕
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <CardContent className="p-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Sun className="h-4 w-4" />
              {dateStr}
            </div>
            <h2 className="text-2xl font-bold mt-1">Today's Focus</h2>
            {focusItems.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {doneCount} / {focusItems.length} priorities complete · {focusCompletion}%
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AlignmentBadge score={alignmentScore} />
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Streak banner */}
      <StreakBanner />

      {/* Smart Daily Focus */}
      <Card className="border-primary/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Top 3 Priorities
            <span className="text-[10px] font-normal text-muted-foreground bg-primary/10 px-1.5 py-0.5 rounded">
              AI-aligned
            </span>
          </CardTitle>
          <div className="flex items-center gap-1">
            {focusItems.length === 0 ? (
              <Button size="sm" onClick={() => generate(false)} disabled={generating}>
                <Sparkles className={`h-4 w-4 mr-1 ${generating ? "animate-spin" : ""}`} />
                Generate
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => generate(true)} disabled={generating}>
                <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {focusItems.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Sparkles className="h-8 w-8 text-primary/40 mx-auto mb-2" />
              <p className="text-sm font-medium">No focus set for today</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click <strong>Generate</strong> — AI will pick 3 high-impact tasks aligned with your missions.
              </p>
            </div>
          ) : (
            focusItems.map(renderFocusTask)
          )}
        </CardContent>
      </Card>

      {/* Momentum chart */}
      <MomentumChart />

      {/* Other daily tasks */}
      {dailyTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Daily Tasks</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            {dailyTasks.map(renderTask)}
          </CardContent>
        </Card>
      )}

      {/* Evening reflection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Moon className="h-4 w-4" /> Evening Reflection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Did today honor your mission? What worked? What didn't?"
            rows={4}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
          />
          <Button
            size="sm"
            onClick={async () => {
              const vision = byType("vision")[0];
              const target = vision || dailyTasks[0] || focusItems[0]?.node;
              if (target && reflection.trim()) {
                await saveReflection(target.id, reflection);
                setReflection("");
              }
            }}
          >
            Save Reflection
          </Button>
        </CardContent>
      </Card>

      <NodeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialType="daily"
        parentId={null}
        editing={editing}
        onSubmit={async (data) => {
          if (editing) await updateNode(editing.id, data);
          else await createNode(data);
        }}
      />
    </div>
  );
}
