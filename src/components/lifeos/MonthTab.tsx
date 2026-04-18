import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { useLifeNodes } from "@/hooks/useLifeNodes";
import { NodeCard } from "./NodeCard";

export function MonthTab() {
  const { byType, childrenOf, deleteNode } = useLifeNodes();
  const monthly = byType("monthly");
  const quarterly = byType("quarterly");

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">Month & Quarter View</h3>
            <p className="text-xs text-muted-foreground">Track milestones and quarterly objectives.</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          Quarterly Objectives ({quarterly.length})
        </h4>
        {quarterly.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No quarterly objectives yet.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {quarterly.map((q) => (
              <NodeCard key={q.id} node={q} childrenCount={childrenOf(q.id).length} onDelete={() => deleteNode(q.id)} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          Monthly Milestones ({monthly.length})
        </h4>
        {monthly.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No monthly milestones yet.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {monthly.map((m) => (
              <NodeCard key={m.id} node={m} childrenCount={childrenOf(m.id).length} onDelete={() => deleteNode(m.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
