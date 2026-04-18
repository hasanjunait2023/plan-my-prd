import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { useLifeNodes } from "@/hooks/useLifeNodes";
import { NodeCard } from "./NodeCard";

export function WeekTab() {
  const { byType, childrenOf, deleteNode } = useLifeNodes();
  const weekly = byType("weekly");

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">This Week's Focus Blocks</h3>
            <p className="text-xs text-muted-foreground">Max 5 per week — fewer means deeper focus.</p>
          </div>
        </CardContent>
      </Card>

      {weekly.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No weekly blocks yet. Create them under a Monthly Milestone in the Vision tab.
            <br /><br />
            <em>Drag-and-drop scheduling coming in Phase 2.</em>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {weekly.map((w) => (
            <NodeCard
              key={w.id}
              node={w}
              childrenCount={childrenOf(w.id).length}
              onDelete={() => deleteNode(w.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
