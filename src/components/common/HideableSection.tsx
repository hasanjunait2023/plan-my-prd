import { ReactNode, useEffect } from 'react';
import { EyeOff } from 'lucide-react';
import { useSectionVisibility } from '@/contexts/SectionVisibilityContext';
import { cn } from '@/lib/utils';

interface HideableSectionProps {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}

export function HideableSection({ id, title, children, className }: HideableSectionProps) {
  const ctx = useSectionVisibility();

  // Register this section so the HiddenSectionsBar knows its title
  useEffect(() => {
    if (!ctx) return;
    ctx.register(id, title);
    return () => {
      ctx.unregister(id);
    };
  }, [ctx, id, title]);

  if (!ctx) {
    // No provider → render children plainly
    return <>{children}</>;
  }

  if (ctx.isHidden(id)) return null;

  return (
    <div className={cn('relative group/hideable', className)}>
      <button
        type="button"
        onClick={() => ctx.hide(id)}
        title={`Hide "${title}"`}
        aria-label={`Hide ${title}`}
        className={cn(
          'absolute top-2 right-2 z-30 h-7 w-7 rounded-md',
          'flex items-center justify-center',
          'bg-card/70 backdrop-blur-sm border border-border/40',
          'text-muted-foreground hover:text-foreground',
          'opacity-0 group-hover/hideable:opacity-100 focus:opacity-100',
          'transition-opacity duration-150 shadow-sm',
        )}
      >
        <EyeOff className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  );
}
