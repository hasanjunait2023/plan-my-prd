import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LifeNode, LifeNodeType } from "@/hooks/useLifeNodes";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialType: LifeNodeType;
  parentId?: string | null;
  editing?: LifeNode | null;
  onSubmit: (data: {
    title: string;
    description: string;
    type: LifeNodeType;
    parent_id: string | null;
    target_value?: number | null;
    unit?: string;
    due_date?: string | null;
    priority?: number;
    metadata?: Record<string, any>;
  }) => Promise<void> | void;
}

const TYPE_LABELS: Record<LifeNodeType, string> = {
  vision: "Vision",
  mission: "Mission",
  yearly: "Yearly Goal",
  quarterly: "Quarterly Objective",
  monthly: "Monthly Milestone",
  weekly: "Weekly Focus",
  daily: "Daily Task",
};

export function NodeFormDialog({ open, onOpenChange, initialType, parentId, editing, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<LifeNodeType>(initialType);
  const [targetValue, setTargetValue] = useState<string>("");
  const [unit, setUnit] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [priority, setPriority] = useState<string>("2");
  const [module, setModule] = useState<string>("none");

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setType(editing.type);
      setTargetValue(editing.target_value?.toString() ?? "");
      setUnit(editing.unit ?? "");
      setDueDate(editing.due_date ?? "");
      setPriority(String(editing.priority ?? 2));
      setModule((editing.metadata as any)?.module ?? "none");
    } else {
      setTitle("");
      setDescription("");
      setType(initialType);
      setTargetValue("");
      setUnit("");
      setDueDate("");
      setPriority("2");
      setModule("none");
    }
  }, [editing, initialType, open]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const metadata: Record<string, any> = {};
    if (type === "mission" && module !== "none") metadata.module = module;
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      type,
      parent_id: parentId ?? null,
      target_value: targetValue ? Number(targetValue) : null,
      unit,
      due_date: dueDate || null,
      priority: Number(priority),
      metadata,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit" : "New"} {TYPE_LABELS[type]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as LifeNodeType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Become a profitable trader" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target</Label>
              <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="100" />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="$, %, days" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Critical</SelectItem>
                  <SelectItem value="2">High</SelectItem>
                  <SelectItem value="3">Medium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {type === "mission" && (
            <div>
              <Label>Auto-feed source (optional)</Label>
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="trading">Trading PnL (auto-sums closed trades)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Pick "Trading PnL" to make this mission's current value auto-update from your closed trades.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>{editing ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
