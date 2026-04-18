import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLifeNodes } from "@/hooks/useLifeNodes";
import { Sparkles } from "lucide-react";

const LAYERS: { type: any; label: string; widthClass: string }[] = [
  { type: "vision", label: "VISION", widthClass: "w-[30%]" },
  { type: "mission", label: "MISSIONS", widthClass: "w-[45%]" },
  { type: "yearly", label: "YEARLY", widthClass: "w-[60%]" },
  { type: "quarterly", label: "QUARTERLY", widthClass: "w-[72%]" },
  { type: "monthly", label: "MONTHLY", widthClass: "w-[82%]" },
  { type: "weekly", label: "WEEKLY", widthClass: "w-[91%]" },
  { type: "daily", label: "DAILY", widthClass: "w-full" },
];

export function PyramidView() {
  const { byType, nodes } = useLifeNodes();

  const totalDaily = byType("daily").length;
  const completedDaily = byType("daily").filter((n) => n.progress >= 100).length;
  const overallProgress = totalDaily ? (completedDaily / totalDaily) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
        <CardContent className="p-5 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm uppercase tracking-wider text-muted-foreground">North Star</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">
              {byType("vision")[0]?.title ?? "Set your vision in the Vision tab →"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Today's progress</div>
            <div className="text-lg font-bold text-primary">{Math.round(overallProgress)}%</div>
          </div>
        </CardContent>
      </Card>

      {/* Pyramid */}
      <Card>
        <CardContent className="p-6 space-y-2">
          {LAYERS.map((layer) => {
            const layerNodes = byType(layer.type);
            const avg =
              layerNodes.length === 0
                ? 0
                : layerNodes.reduce((s, n) => s + Number(n.progress), 0) / layerNodes.length;
            return (
              <div key={layer.type} className="flex flex-col items-center">
                <div
                  className={`${layer.widthClass} bg-card border border-border/60 rounded-md px-4 py-2 hover:border-primary/40 transition`}
                  style={{
                    background: `linear-gradient(90deg, hsl(var(--primary) / 0.08) ${avg}%, transparent ${avg}%)`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold tracking-widest text-muted-foreground">
                      {layer.label}
                    </div>
                    <div className="text-xs">
                      {layerNodes.length} · {Math.round(avg)}%
                    </div>
                  </div>
                  <div className="text-sm mt-1 truncate">
                    {layerNodes.length === 0 ? (
                      <span className="text-muted-foreground italic text-xs">Empty</span>
                    ) : (
                      layerNodes.slice(0, 2).map((n) => n.title).join(" · ") +
                      (layerNodes.length > 2 ? ` +${layerNodes.length - 2} more` : "")
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {nodes.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            Start by setting your <strong>Vision</strong> in the Vision & Missions tab, then break it down into Missions → Yearly Goals → all the way to Daily Tasks.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
