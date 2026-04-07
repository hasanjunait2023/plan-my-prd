import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CompletionNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitName: string;
  onConfirm: (note: string) => void;
}

export function CompletionNoteDialog({ open, onOpenChange, habitName, onConfirm }: CompletionNoteDialogProps) {
  const [note, setNote] = useState('');

  const handleConfirm = () => {
    onConfirm(note.trim());
    setNote('');
    onOpenChange(false);
  };

  const handleSkip = () => {
    onConfirm('');
    setNote('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border/40">
        <DialogHeader>
          <DialogTitle className="text-sm">Complete: {habitName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Optional note... (e.g. how did it go?)"
            rows={3}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button onClick={handleSkip} variant="outline" size="sm" className="flex-1">
              Skip Note
            </Button>
            <Button onClick={handleConfirm} size="sm" className="flex-1">
              ✅ Complete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
