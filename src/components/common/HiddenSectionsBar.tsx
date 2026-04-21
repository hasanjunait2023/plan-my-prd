import { Eye, X } from 'lucide-react';
import { useSectionVisibility } from '@/contexts/SectionVisibilityContext';
import { cn } from '@/lib/utils';

export function HiddenSectionsBar({ className }: { className?: string }) {
  const ctx = useSectionVisibility();
  if (!ctx) return null;
  if (ctx.hiddenIds.length === 0) return null;

  // Build label list — fall back to id if title not registered (yet)
  const items = ctx.hiddenIds.map(id => {
    const reg = ctx.registered.find(r => r.id === id);
    return { id, title: reg?.title ?? id };
  });

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border/50 bg-muted/30 px-3 py-2',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Eye className="h-3.5 w-3.5" />
        <span>{ctx.hiddenIds.length} hidden</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 flex-1">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => ctx.show(item.id)}
            className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-card/60 hover:bg-card hover:border-primary/40 px-2 py-0.5 text-[11px] font-medium text-foreground/80 hover:text-foreground transition-colors"
            title={`Show "${item.title}"`}
          >
            <span className="max-w-[180px] truncate">{item.title}</span>
            <X className="h-3 w-3 opacity-60" />
          </button>
        ))}
      </div>
      {ctx.hiddenIds.length >= 2 && (
        <button
          type="button"
          onClick={ctx.showAll}
          className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Show all
        </button>
      )}
    </div>
  );
}
