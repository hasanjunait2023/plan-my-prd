import { Badge } from "@/components/ui/badge";
import { Compass } from "lucide-react";

interface Props {
  score: number; // 0-100
}

export function AlignmentBadge({ score }: Props) {
  const tone =
    score >= 70
      ? "bg-success/15 text-success border-success/30"
      : score >= 40
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-destructive/15 text-destructive border-destructive/30";

  const label = score >= 70 ? "Aligned" : score >= 40 ? "Drifting" : "Off-track";

  return (
    <Badge variant="outline" className={`${tone} gap-1`}>
      <Compass className="h-3 w-3" />
      {Math.round(score)}% · {label}
    </Badge>
  );
}
