import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLifeNodes, type LifeNode } from "@/hooks/useLifeNodes";
import { Trello, Target, Filter, CheckCircle2, Circle, Clock } from "lucide-react";

// Extract a year (number) from a node — first try metadata.year, then due_date, then title pattern (e.g., 2025 or 2025-2026)
function extractYear(node: LifeNode): number | null {
  const meta = (node.metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.year === "number") return meta.year;
  if (typeof meta.year === "string" && /^\d{4}$/.test(meta.year)) return parseInt(meta.year, 10);
  if (node.due_date) {
    const y = new Date(node.due_date).getFullYear();
    if (!Number.isNaN(y)) return y;
  }
  const m = node.title.match(/(20\d{2})/);
  if (m) return parseInt(m[1], 10);
  return null;
}

const MISSION_COLORS: Record<string, string> = {
  "Trader Mastery": "hsl(var(--primary))",
  "Wealth & Business": "hsl(45 90% 55%)",
  "Family & Lifestyle": "hsl(330 75% 60%)",
  "Knowledge & Discipline": "hsl(200 80% 60%)",
  "Deen & Charity": "hsl(150 60% 50%)",
};

export function YearlyBoard() {
  const { nodes, byType, findById } = useLifeNodes();
  const [missionFilter, setMissionFilter] = useState<string>("all");

  const missions = byType("mission");

  // Build year → mission → cards structure
  const { years, byYearMission, unassigned } = useMemo(() => {
    const yearly = byType("yearly");
    const yearSet = new Set<number>();
    const map: Record<number, Record<string, LifeNode[]>> = {};
    const orphan: LifeNode[] = [];

    yearly.forEach((node) => {
      const y = extractYear(node);
      if (y === null) {
        orphan.push(node);
        return;
      }
      yearSet.add(y);
      // walk up to find mission ancestor
      let cur: LifeNode | undefined = node;
      let missionTitle = "Unassigned";
      while (cur?.parent_id) {
        const parent = findById(cur.parent_id);
        if (!parent) break;
        if (parent.type === "mission") {
          missionTitle = parent.title;
          break;
        }
        cur = parent;
      }
      if (!map[y]) map[y] = {};
      if (!map[y][missionTitle]) map[y][missionTitle] = [];
      map[y][missionTitle].push(node);
    });

    return {
      years: Array.from(yearSet).sort((a, b) => a - b),
      byYearMission: map,
      unassigned: orphan,
    };
  }, [nodes, byType, findById]);

  const filteredMissions = (missionTitles: string[]) =>
    missionFilter === "all" ? missionTitles : missionTitles.filter((m) => m === missionFilter);

  const yearProgress = (year: number) => {
    const allCards = Object.values(byYearMission[year] ?? {}).flat();
    if (!allCards.length) return 0;
    return allCards.reduce((s, n) => s + Number(n.progress), 0) / allCards.length;
  };

  const statusIcon = (n: LifeNode) => {
    if (n.progress >= 100) return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    if (n.progress > 0) return <Clock className="h-3.5 w-3.5 text-primary" />;
    return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Trello className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Yearly Roadmap Board</h3>
          </div>
          <Badge variant="outline" className="ml-2">
            {years.length} {years.length === 1 ? "year" : "years"} · {Object.values(byYearMission).reduce((s, m) => s + Object.values(m).flat().length, 0)} goals
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={missionFilter} onValueChange={setMissionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter mission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All missions</SelectItem>
                {missions.map((m) => (
                  <SelectItem key={m.id} value={m.title}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Board */}
      {years.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground text-sm">
            No yearly goals yet. Import your vision board or add yearly nodes.
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            {years.map((year) => {
              const missionsInYear = Object.keys(byYearMission[year] ?? {});
              const visibleMissions = filteredMissions(missionsInYear);
              const yearProg = yearProgress(year);
              const isCurrent = year === currentYear;
              const isPast = year < currentYear;

              return (
                <div
                  key={year}
                  className={`shrink-0 w-[320px] rounded-lg border bg-card/40 ${
                    isCurrent ? "border-primary/60 ring-2 ring-primary/20" : "border-border"
                  }`}
                >
                  {/* Column header */}
                  <div className="p-3 border-b sticky top-0 bg-card/95 backdrop-blur rounded-t-lg z-10">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{year}</span>
                        {isCurrent && <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">CURRENT</Badge>}
                        {isPast && <Badge variant="outline" className="text-[10px] opacity-60">PAST</Badge>}
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{Math.round(yearProg)}%</span>
                    </div>
                    <Progress value={yearProg} className="h-1 mt-2" />
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {Object.values(byYearMission[year] ?? {}).flat().length} goals · {visibleMissions.length} missions
                    </div>
                  </div>

                  {/* Cards grouped by mission */}
                  <div className="p-3 space-y-3 max-h-[65vh] overflow-y-auto">
                    {visibleMissions.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-6 italic">
                        No goals match filter
                      </div>
                    )}
                    {visibleMissions.map((mission) => {
                      const cards = byYearMission[year][mission] ?? [];
                      const color = MISSION_COLORS[mission] ?? "hsl(var(--muted-foreground))";
                      return (
                        <div key={mission} className="space-y-1.5">
                          <div className="flex items-center gap-2 px-1">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ background: color }}
                            />
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                              {mission}
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-auto">{cards.length}</span>
                          </div>
                          {cards.map((card) => (
                            <div
                              key={card.id}
                              className="rounded-md border border-border/60 bg-background p-2.5 hover:border-primary/40 transition cursor-pointer group"
                              style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                            >
                              <div className="flex items-start gap-2">
                                <span className="mt-0.5 shrink-0">{statusIcon(card)}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium leading-snug whitespace-normal break-words">
                                    {card.title}
                                  </p>
                                  {card.description && (
                                    <p className="text-[10px] text-muted-foreground mt-1 whitespace-normal break-words line-clamp-2">
                                      {card.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <Progress value={card.progress} className="h-1 flex-1" />
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                      {Math.round(card.progress)}%
                                    </span>
                                  </div>
                                  {card.target_value && (
                                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                      <Target className="h-2.5 w-2.5" />
                                      {card.current_value}/{card.target_value} {card.unit}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {unassigned.length > 0 && (
        <Card className="border-warning/30">
          <CardContent className="p-4">
            <div className="text-sm font-semibold mb-2">Unscheduled ({unassigned.length})</div>
            <p className="text-xs text-muted-foreground mb-3">
              These yearly goals don't have a year set. Add a due date or year metadata.
            </p>
            <div className="flex flex-wrap gap-2">
              {unassigned.map((n) => (
                <Badge key={n.id} variant="outline" className="text-xs">{n.title}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
