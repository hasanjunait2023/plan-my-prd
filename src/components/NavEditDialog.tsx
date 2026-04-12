import { useState } from 'react';
import { ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { NavItem } from '@/hooks/useNavConfig';

interface NavEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allItems: NavItem[];
  primaryUrls: string[];
  onSave: (urls: string[]) => void;
  onReset: () => void;
  defaultUrls: string[];
  maxItems: number;
  currentMaxMobile: number;
  currentMaxDesktop: number;
  onMaxChange: (mobile: number, desktop: number) => void;
  isMobile: boolean;
}

export function NavEditDialog({
  open,
  onOpenChange,
  allItems,
  primaryUrls,
  onSave,
  onReset,
  defaultUrls,
  maxItems,
  currentMaxMobile,
  currentMaxDesktop,
  onMaxChange,
  isMobile,
}: NavEditDialogProps) {
  const [selected, setSelected] = useState<string[]>(primaryUrls);
  const [localMaxMobile, setLocalMaxMobile] = useState(currentMaxMobile);
  const [localMaxDesktop, setLocalMaxDesktop] = useState(currentMaxDesktop);

  const activeMax = isMobile ? localMaxMobile : localMaxDesktop;

  const handleOpenChange = (val: boolean) => {
    if (val) {
      setSelected(primaryUrls);
      setLocalMaxMobile(currentMaxMobile);
      setLocalMaxDesktop(currentMaxDesktop);
    }
    onOpenChange(val);
  };

  const toggleItem = (url: string) => {
    setSelected(prev => {
      if (prev.includes(url)) {
        if (prev.length <= 3) return prev;
        return prev.filter(u => u !== url);
      }
      if (prev.length >= activeMax) return prev;
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
    onMaxChange(localMaxMobile, localMaxDesktop);
    onSave(selected);
    onOpenChange(false);
  };

  const handleReset = () => {
    setSelected(defaultUrls);
    setLocalMaxMobile(5);
    setLocalMaxDesktop(6);
  };

  // When max decreases, trim selected
  const handleMaxChange = (value: string, type: 'mobile' | 'desktop') => {
    const num = parseInt(value);
    if (type === 'mobile') setLocalMaxMobile(num);
    else setLocalMaxDesktop(num);

    const newMax = type === (isMobile ? 'mobile' : 'desktop') ? num : activeMax;
    if (selected.length > newMax) {
      setSelected(prev => prev.slice(0, newMax));
    }
  };

  const isDefault = JSON.stringify(selected) === JSON.stringify(defaultUrls) && localMaxMobile === 5 && localMaxDesktop === 6;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Customize Navigation</DialogTitle>
        </DialogHeader>

        {/* Max items settings */}
        <div className="flex items-center gap-3 px-1 py-2 border-b border-border/30">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">Mobile:</span>
            <Select value={String(localMaxMobile)} onValueChange={(v) => handleMaxChange(v, 'mobile')}>
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 4, 5, 6, 7, 8].map(n => (
                  <SelectItem key={n} value={String(n)} className="text-xs">{n} items</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">Desktop:</span>
            <Select value={String(localMaxDesktop)} onValueChange={(v) => handleMaxChange(v, 'desktop')}>
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <SelectItem key={n} value={String(n)} className="text-xs">{n} items</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground px-1">
          Currently: {selected.length}/{activeMax} selected ({isMobile ? 'Mobile' : 'Desktop'} view)
        </p>

        <div className="flex-1 overflow-y-auto space-y-1 py-1">
          {/* Selected items with reorder */}
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
                  disabled={selected.length >= activeMax}
                  className="shrink-0"
                />
                <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium text-muted-foreground flex-1">{item.title}</span>
              </div>
            ))}
        </div>

        {selected.length >= activeMax && (
          <p className="text-[10px] text-destructive px-1">
            Maximum {activeMax} items reached. Remove one or increase limit.
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
