import { useState } from 'react';
import { ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { NavItem } from '@/hooks/useNavConfig';

interface NavEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allItems: NavItem[];
  primaryUrls: string[];
  onSave: (urls: string[]) => void;
  onReset: () => void;
  defaultUrls: string[];
  maxItems?: number;
}

export function NavEditDialog({
  open,
  onOpenChange,
  allItems,
  primaryUrls,
  onSave,
  onReset,
  defaultUrls,
  maxItems = 6,
}: NavEditDialogProps) {
  const [selected, setSelected] = useState<string[]>(primaryUrls);

  // Reset local state when dialog opens
  const handleOpenChange = (val: boolean) => {
    if (val) setSelected(primaryUrls);
    onOpenChange(val);
  };

  const toggleItem = (url: string) => {
    setSelected(prev => {
      if (prev.includes(url)) {
        if (prev.length <= 3) return prev; // min 3
        return prev.filter(u => u !== url);
      }
      if (prev.length >= maxItems) return prev; // max limit
      return [...prev, url];
    });
  };

  const moveUp = (url: string) => {
    setSelected(prev => {
      const idx = prev.indexOf(url);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (url: string) => {
    setSelected(prev => {
      const idx = prev.indexOf(url);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const handleSave = () => {
    onSave(selected);
    onOpenChange(false);
  };

  const handleReset = () => {
    setSelected(defaultUrls);
  };

  const isDefault = JSON.stringify(selected) === JSON.stringify(defaultUrls);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Customize Navigation</DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            Select {maxItems > 5 ? '3–6' : '3–5'} items for your nav bar. Drag to reorder.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-1 py-2">
          {/* Selected items first — with reorder */}
          {selected.map((url, idx) => {
            const item = allItems.find(i => i.url === url);
            if (!item) return null;
            return (
              <div
                key={url}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20"
              >
                <Checkbox
                  checked={true}
                  onCheckedChange={() => toggleItem(url)}
                  className="shrink-0"
                />
                <item.icon className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-foreground flex-1">{item.title}</span>
                <span className="text-[10px] text-muted-foreground/60 mr-1">{idx + 1}</span>
                <button
                  onClick={() => moveUp(url)}
                  disabled={idx === 0}
                  className="p-0.5 rounded hover:bg-muted/50 disabled:opacity-30 transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => moveDown(url)}
                  disabled={idx === selected.length - 1}
                  className="p-0.5 rounded hover:bg-muted/50 disabled:opacity-30 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            );
          })}

          {/* Divider */}
          {allItems.filter(i => !selected.includes(i.url)).length > 0 && (
            <div className="flex items-center gap-2 py-2">
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Available</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>
          )}

          {/* Unselected items */}
          {allItems
            .filter(i => !selected.includes(i.url))
            .map((item) => (
              <div
                key={item.url}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <Checkbox
                  checked={false}
                  onCheckedChange={() => toggleItem(item.url)}
                  disabled={selected.length >= maxItems}
                  className="shrink-0"
                />
                <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium text-muted-foreground flex-1">{item.title}</span>
              </div>
            ))}
        </div>

        {selected.length >= maxItems && (
          <p className="text-[10px] text-amber-400 px-1">
            Maximum {maxItems} items reached. Remove one to add another.
          </p>
        )}

        <DialogFooter className="flex-row justify-between gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isDefault}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} className="text-xs">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
