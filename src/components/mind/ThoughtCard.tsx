import { MindThought } from '@/hooks/useMindThoughts';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Image, Send } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  thought: MindThought;
  isSelected: boolean;
  onClick: () => void;
}

const ThoughtCard = ({ thought, isSelected, onClick }: Props) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left border rounded-lg p-3 transition-colors',
        isSelected
          ? 'bg-primary/10 border-primary/30'
          : 'bg-card hover:bg-accent/50 border-border/50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm line-clamp-2 flex-1">{thought.content || '(image only)'}</p>
        <div className="flex items-center gap-1 shrink-0">
          {thought.image_url && <Image className="w-3.5 h-3.5 text-muted-foreground/60" />}
          {thought.source === 'telegram' && <Send className="w-3 h-3 text-blue-400/70" />}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-muted-foreground">
          {format(parseISO(thought.created_at), 'hh:mm a')}
        </span>
        {thought.tags.map(tag => (
          <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
            {tag}
          </Badge>
        ))}
      </div>
    </button>
  );
};

export default ThoughtCard;
