import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ImagePlus, X, Loader2, Send } from 'lucide-react';
import { useAddMindThought, uploadMindImage } from '@/hooks/useMindThoughts';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const PRESET_TAGS = ['setup', 'lesson', 'idea', 'mistake', 'psychology', 'strategy'];

interface Props {
  onClose: () => void;
}

const ThoughtForm = ({ onClose }: Props) => {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const addThought = useAddMindThought();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!content.trim() && !imageFile) {
      toast.error('Content বা image দিতে হবে');
      return;
    }

    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadMindImage(imageFile);
      }

      const thought = await addThought.mutateAsync({
        content: content.trim(),
        image_url: imageUrl,
        tags: selectedTags,
        date: format(new Date(), 'yyyy-MM-dd'),
      });

      // Auto-post to Telegram
      try {
        await supabase.functions.invoke('mind-telegram-sync', {
          body: { action: 'post', thought_id: thought.id, content: content.trim(), image_url: imageUrl },
        });
      } catch {
        // Non-blocking — thought saved even if Telegram fails
      }

      toast.success('Thought saved! 🧠');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="তোমার trading thought লেখো..."
        value={content}
        onChange={e => setContent(e.target.value)}
        className="min-h-[120px] bg-secondary/30 border-border/50"
        autoFocus
      />

      {/* Image upload */}
      <div>
        {imagePreview ? (
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="h-24 rounded-lg object-cover" />
            <button
              onClick={() => { setImageFile(null); setImagePreview(null); }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="w-4 h-4 mr-1" /> Image যোগ করো
          </Button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {PRESET_TAGS.map(tag => (
          <Badge
            key={tag}
            variant={selectedTags.includes(tag) ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </Badge>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
          Save Thought
        </Button>
      </div>
    </div>
  );
};

export default ThoughtForm;
