import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sun, Coffee, Moon, Clock, ArrowRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DailyFocus, TimeSlot } from "@/hooks/useDailyFocus";
import type { LifeNode } from "@/hooks/useLifeNodes";

type SlotMeta = {
  key: TimeSlot;
  label: string;
  hours: string;
  Icon: typeof Sun;
  gradient: string;
  border: string;
  text: string;
};

const SLOTS: SlotMeta[] = [
  {
    key: "morning",
    label: "Morning",
    hours: "6 AM – 12 PM",
    Icon: Sun,
    gradient: "from-amber-500/15 to-orange-500/5",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "afternoon",
    label: "Afternoon",
    hours: "12 PM – 6 PM",
    Icon: Coffee,
    gradient: "from-sky-500/15 to-blue-500/5",
    border: "border-sky-500/30",
    text: "text-sky-600 dark:text-sky-400",
  },
  {
    key: "evening",
    label: "Evening",
    hours: "6 PM – 11 PM",
    Icon: Moon,
    gradient: "from-indigo-500/15 to-purple-500/5",
    border: "border-indigo-500/30",
    text: "text-indigo-600 dark:text-indigo-400",
  },
];

function getCurrentSlot(): TimeSlot {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 23) return "evening";
  return "unset";
}

interface Props {
  focus: DailyFocus[];
  resolveNode: (id: string) => LifeNode | undefined;
  ancestorChain: (id: string) => LifeNode[];
  isDone: (id: string) => boolean;
  toggleDone: (id: string, done: boolean) => void | Promise<void>;
  updateSlot: (id: string, slot: TimeSlot, hour?: number | null) => void | Promise<void>;
}

export function TimeBlockTimeline({
  focus,
  resolveNode,
  ancestorChain,
  isDone,
  toggleDone,
  updateSlot,
}: Props) {
  const currentSlot = getCurrentSlot();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  if (focus.length === 0) return null;

  const itemsBySlot = (slot: TimeSlot) =>
    focus
      .filter((f) => (f.time_slot ?? "unset") === slot)
      .map((f) => ({ focus: f, node: resolveNode(f.node_id) }))
      .filter((x): x is { focus: DailyFocus; node: LifeNode } => !!x.node);

  const unset = itemsBySlot("unset");

  const renderTask = (
    item: { focus: DailyFocus; node: LifeNode },
    slotMeta: SlotMeta | null,
  ) => {
    const { focus: f, node: t } = item;
    const chain = ancestorChain(t.id);
    const breadcrumb = chain.slice(0, -1).map((c) => c.title).join(" → ");
    const done = isDone(t.id);

    return (
      <div
        key={f.id}
        draggable
        onDragStart={() => setDraggingId(f.id)}
        onDragEnd={() => setDraggingId(null)}
        className={`group flex items-start gap-3 p-3 rounded-md bg-card border border-border/40 hover:border-border transition cursor-grab active:cursor-grabbing ${
          draggingId === f.id ? "opacity-50" : ""
        }`}
      >
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <Checkbox checked={done} onCheckedChange={(v) => toggleDone(t.id, !!v)} />
          <span className={`text-[10px] font-bold ${slotMeta?.text ?? "text-muted-foreground"}`}>
            #{f.rank}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-tight ${done ? "line-through text-muted-foreground" : ""}`}>
            {t.title}
          </p>
          {breadcrumb && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{breadcrumb}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 opacity-0 group-hover:opacity-100 transition"
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SLOTS.filter((s) => s.key !== f.time_slot).map((s) => (
              <DropdownMenuItem key={s.key} onClick={() => updateSlot(f.id, s.key)}>
                <s.Icon className="h-3 w-3 mr-2" /> Move to {s.label}
              </DropdownMenuItem>
            ))}
            {f.time_slot !== "unset" && (
              <DropdownMenuItem onClick={() => updateSlot(f.id, "unset")}>
                <Clock className="h-3 w-3 mr-2" /> Unschedule
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const handleDrop = (slot: TimeSlot) => {
    if (draggingId) {
      updateSlot(draggingId, slot);
      setDraggingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Today's Schedule
          <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            drag to reschedule
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {SLOTS.map((slot) => {
          const items = itemsBySlot(slot.key);
          const isCurrent = slot.key === currentSlot;
          const completed = items.filter((i) => isDone(i.node.id)).length;

          return (
            <div
              key={slot.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(slot.key)}
              className={`relative rounded-lg border ${slot.border} bg-gradient-to-br ${slot.gradient} p-3 transition ${
                isCurrent ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background" : ""
              } ${draggingId ? "border-dashed" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <slot.Icon className={`h-4 w-4 ${slot.text}`} />
                  <span className={`text-sm font-semibold ${slot.text}`}>{slot.label}</span>
                  <span className="text-[10px] text-muted-foreground">{slot.hours}</span>
                  {isCurrent && (
                    <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4">
                      NOW
                    </Badge>
                  )}
                </div>
                {items.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {completed}/{items.length}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {items.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic px-2 py-3 text-center border border-dashed border-border/40 rounded-md">
                    Drop a task here
                  </p>
                ) : (
                  items.map((item) => renderTask(item, slot))
                )}
              </div>
            </div>
          );
        })}

        {unset.length > 0 && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop("unset")}
            className="rounded-lg border border-dashed border-border p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">Unscheduled</span>
            </div>
            <div className="space-y-1.5">{unset.map((item) => renderTask(item, null))}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
