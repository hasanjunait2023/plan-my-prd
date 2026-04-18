import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Plus, Target } from "lucide-react";
import type { LifeNode } from "@/hooks/useLifeNodes";

interface Props {
  node: LifeNode;
  childrenCount?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddChild?: () => void;
  onClick?: () => void;
}

export function NodeCard({ node, childrenCount = 0, onEdit, onDelete, onAddChild, onClick }: Props) {
  const overdue = node.due_date && new Date(node.due_date) < new Date() && node.progress < 100;

  return (
    <Card
      className="hover:border-primary/40 transition cursor-pointer"
      onClick={onClick}
      style={{ borderLeftColor: node.color, borderLeftWidth: 4 }}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold truncate">{node.title}</h4>
              <Badge variant="outline" className="text-xs capitalize">{node.type}</Badge>
              {overdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
              {node.status === "completed" && <Badge className="text-xs bg-success/20 text-success border-success/30">Done</Badge>}
            </div>
            {node.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{node.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onAddChild && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onAddChild(); }}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Target className="h-3 w-3" />
          <span>{Math.round(node.progress)}%</span>
          {node.target_value && (
            <span>· {node.current_value}/{node.target_value} {node.unit}</span>
          )}
          {childrenCount > 0 && <span>· {childrenCount} sub-items</span>}
          {node.due_date && <span className="ml-auto">Due {node.due_date}</span>}
        </div>
        <Progress value={node.progress} className="h-1.5" />
      </CardContent>
    </Card>
  );
}
