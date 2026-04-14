import { MindThought, useDeleteMindThought } from '@/hooks/useMindThoughts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { Send, Trash2, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  thought: MindThought;
}

const ThoughtDetail = ({ thought }: Props) => {
  const deleteMutation = useDeleteMindThought();

  const handleDelete = async () => {
    if (!confirm('এই thought মুছে ফেলতে চাও?')) return;
    try {
      await deleteMutation.mutateAsync(thought.id);
      toast.success('Thought deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {format(parseISO(thought.date), 'MMMM d, yyyy')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {format(parseISO(thought.created_at), 'hh:mm a')}
          </span>
          {thought.source === 'telegram' && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Send className="w-2.5 h-2.5" /> Telegram
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Tags */}
      {thought.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {thought.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Content */}
      {thought.content && (
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {thought.content}
        </div>
      )}

      {/* Image */}
      {thought.image_url && (
        <div className="mt-4">
          <img
            src={thought.image_url}
            alt="Mind thought"
            className="w-full max-w-lg rounded-lg border border-border/30 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(thought.image_url!, '_blank')}
          />
        </div>
      )}
    </div>
  );
};

export default ThoughtDetail;
