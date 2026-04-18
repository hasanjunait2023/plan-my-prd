import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { useLifeNodes, type LifeNode, type LifeNodeType } from "@/hooks/useLifeNodes";
import { NodeFormDialog } from "./NodeFormDialog";
import { NodeCard } from "./NodeCard";

export function VisionMissionTab() {
  const { byType, childrenOf, createNode, updateNode, deleteNode } = useLifeNodes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LifeNode | null>(null);
  const [creatingType, setCreatingType] = useState<LifeNodeType>("vision");
  const [parentId, setParentId] = useState<string | null>(null);

  const visions = byType("vision");
  const missions = byType("mission");
  const vision = visions[0];

  const open = (type: LifeNodeType, parent: string | null = null, edit: LifeNode | null = null) => {
    setCreatingType(type);
    setParentId(parent);
    setEditing(edit);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Vision */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            North Star Vision
          </CardTitle>
          {!vision && (
            <Button size="sm" onClick={() => open("vision")}>
              <Plus className="h-4 w-4 mr-1" /> Set Vision
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {vision ? (
            <div>
              <h2 className="text-2xl font-bold mb-2">{vision.title}</h2>
              {vision.description && (
                <p className="text-muted-foreground italic">"{vision.description}"</p>
              )}
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => open("vision", null, vision)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => deleteNode(vision.id)}>Delete</Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Define your 5-10 year vision — the ultimate "why" behind everything you do.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Missions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Missions ({missions.length})</h3>
          <Button size="sm" onClick={() => open("mission", vision?.id ?? null)}>
            <Plus className="h-4 w-4 mr-1" /> New Mission
          </Button>
        </div>
        {missions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              Add 3-5 life areas: Trading Mastery, Health, Faith, Family, Wealth...
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {missions.map((m) => (
              <NodeCard
                key={m.id}
                node={m}
                childrenCount={childrenOf(m.id).length}
                onEdit={() => open("mission", m.parent_id, m)}
                onDelete={() => deleteNode(m.id)}
                onAddChild={() => open("yearly", m.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Yearly goals under each mission */}
      {missions.map((m) => {
        const yearlyGoals = childrenOf(m.id).filter((c) => c.type === "yearly");
        if (yearlyGoals.length === 0) return null;
        return (
          <div key={m.id}>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              {m.title} → Yearly Goals
            </h4>
            <div className="grid gap-2 md:grid-cols-2">
              {yearlyGoals.map((g) => (
                <NodeCard
                  key={g.id}
                  node={g}
                  childrenCount={childrenOf(g.id).length}
                  onEdit={() => open("yearly", g.parent_id, g)}
                  onDelete={() => deleteNode(g.id)}
                  onAddChild={() => open("quarterly", g.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <NodeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialType={creatingType}
        parentId={parentId}
        editing={editing}
        onSubmit={async (data) => {
          if (editing) await updateNode(editing.id, data);
          else await createNode(data);
        }}
      />
    </div>
  );
}
