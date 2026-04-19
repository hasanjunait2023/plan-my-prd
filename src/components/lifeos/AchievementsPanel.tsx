import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAchievements } from "@/hooks/useAchievements";
import { Trophy, Lock, Download, Flame } from "lucide-react";
import { generateYearEndReport } from "@/lib/yearEndReport";
import { useLifeNodes } from "@/hooks/useLifeNodes";
import { useStreakStats } from "@/hooks/useStreakStats";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState } from "react";

const tierClasses: Record<string, string> = {
  bronze: "from-amber-700/20 to-amber-900/10 border-amber-700/40",
  silver: "from-slate-400/20 to-slate-600/10 border-slate-400/40",
  gold: "from-yellow-500/20 to-amber-600/10 border-yellow-500/40",
  platinum: "from-primary/30 to-primary/5 border-primary/50",
};

const tierTextClasses: Record<string, string> = {
  bronze: "text-amber-500",
  silver: "text-slate-300",
  gold: "text-yellow-400",
  platinum: "text-primary",
};

export function AchievementsPanel() {
  const { achievements, unlockedCount, totalCount, currentStreak, longestStreak } =
    useAchievements();
  const { nodes } = useLifeNodes();
  const { last30, last7Rate, totalCompletedAllTime } = useStreakStats();
  const [generating, setGenerating] = useState(false);

  const handleExport = async () => {
    setGenerating(true);
    try {
      await generateYearEndReport({
        nodes,
        achievements,
        stats: {
          currentStreak,
          longestStreak,
          last7Rate,
          totalCompletedAllTime,
          last30,
        },
      });
      toast({ title: "Year-end report ready", description: "PDF downloaded" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-primary" />
            Achievements
            <Badge variant="secondary" className="ml-1">
              {unlockedCount} / {totalCount}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Flame className="h-3 w-3 text-orange-500" /> {currentStreak}d streak
            </Badge>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={generating}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              {generating ? "Generating…" : "Year report"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <TooltipProvider delayDuration={200}>
            {achievements.map((a) => {
              const Icon = a.icon;
              return (
                <Tooltip key={a.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "relative rounded-lg border p-3 bg-gradient-to-br transition cursor-default",
                        a.unlocked
                          ? tierClasses[a.tier]
                          : "from-muted/30 to-transparent border-border/40 opacity-60",
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div
                          className={cn(
                            "h-9 w-9 rounded-md flex items-center justify-center",
                            a.unlocked ? "bg-background/40" : "bg-muted/40",
                          )}
                        >
                          {a.unlocked ? (
                            <Icon className={cn("h-5 w-5", tierTextClasses[a.tier])} />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] uppercase tracking-wider",
                            a.unlocked && tierTextClasses[a.tier],
                          )}
                        >
                          {a.tier}
                        </Badge>
                      </div>
                      <div className="text-sm font-semibold leading-tight">{a.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {a.description}
                      </div>
                      {!a.unlocked && (
                        <Progress value={a.progress} className="h-1 mt-2" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <div className="font-semibold">{a.title}</div>
                      <div className="text-muted-foreground">{a.hint}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
        <div className="text-[11px] text-muted-foreground mt-3 text-center">
          Longest streak: <strong>{longestStreak}</strong> days · 7-day avg{" "}
          <strong>{last7Rate}%</strong> · Total completions{" "}
          <strong>{totalCompletedAllTime}</strong>
        </div>
      </CardContent>
    </Card>
  );
}
