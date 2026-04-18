import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Sun, Moon, Flame } from "lucide-react";
import { useLifeNodes, type LifeNode } from "@/hooks/useLifeNodes";
import { useLifeNodeLogs } from "@/hooks/useLifeNodeLogs";
import { NodeFormDialog } from "./NodeFormDialog";
import { AlignmentBadge } from "./AlignmentBadge";

const today = () => new Date().toISOString().slice(0, 10);

export function TodayTab() {
  const { nodes, byType, ancestorChain, createNode, deleteNode, updateNode } = useLifeNodes();
  const { isDone, toggleDone, saveReflection, reflectionOf } = useLifeNodeLogs(today());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LifeNode | null>(null);

  const dailyTasks = byType("daily");
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Alignment: % daily tasks linked to a parent
  const aligned = dailyTasks.filter((t) => t.parent_id !== null).length;
  const alignmentScore = dailyTasks.length === 0 ? 100 : (aligned / dailyTasks.length) * 100;

  // Top 3 priorities
  const top3 = useMemo(
    () => [...dailyTasks].sort((a, b) => a.priority - b.priority).slice(0, 3),
    [dailyTasks]
  );
  const others = dailyTasks.filter((t) => !top3.includes(t));

  const [reflection, setReflection] = useState("");

  const renderTask = (t: LifeNode) => {
    const chain = ancestorChain(t.id);
    const breadcrumb = chain.slice(0, -1).map((c) => c.title).join(" → ");
    const done = isDone(t.id);
    return (
      <div key={t.id} className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/30 transition">
        <Checkbox
          checked={done}
          onCheckedChange={(v) => toggleDone(t.id, !!v)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
            {t.title}
          </p>
          {breadcrumb && (
            <p className="text-xs text-muted-foreground mt-0.5">{breadcrumb}</p>
          )}
          {t.description && (
            <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {t.priority === 1 && <Badge variant="destructive" className="text-[10px]">Critical</Badge>}
          {!t.parent_id && <Badge variant="outline" className="text-[10px]">Ad-hoc</Badge>}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => deleteNode(t.id)}
          >
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
          </div>
          <div className="flex items-center gap-3">
            <AlignmentBadge score={alignmentScore} />
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Task
            </Button>
          </div>
        </CardContent>
      </Card>

      {alignmentScore < 70 && dailyTasks.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-3 text-sm flex items-center gap-2">
            <Flame className="h-4 w-4 text-warning" />
            <span>You're drifting — link tasks to a Mission to stay aligned with your Vision.</span>
          </CardContent>
        </Card>
      )}

      {/* Top 3 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 3 Priorities</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/40">
          {top3.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No tasks yet. What 3 things will move you closer to your vision today?
            </p>
          ) : (
            top3.map(renderTask)
          )}
        </CardContent>
      </Card>

      {/* Others */}
      {others.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Other Tasks</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            {others.map(renderTask)}
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
              // Save against the vision node, fallback to first daily task
              const vision = byType("vision")[0];
              const target = vision || dailyTasks[0];
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
