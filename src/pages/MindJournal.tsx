import { useState, useMemo, useEffect, useCallback } from 'react';
import { useMindThoughts, MindThought } from '@/hooks/useMindThoughts';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import MindSidebar from '@/components/mind/MindSidebar';
import ThoughtCard from '@/components/mind/ThoughtCard';
import ThoughtDetail from '@/components/mind/ThoughtDetail';
import ThoughtForm from '@/components/mind/ThoughtForm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus, Brain, Lightbulb } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MindJournal = () => {
  const isMobile = useIsMobile();
  const { data: allThoughts = [], isLoading } = useMindThoughts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedThought, setSelectedThought] = useState<MindThought | null>(null);
  const [mobileView, setMobileView] = useState<'dates' | 'thoughts' | 'detail'>('dates');
  const [showForm, setShowForm] = useState(false);

  const filteredThoughts = useMemo(() => {
    if (!searchQuery) return allThoughts;
    const q = searchQuery.toLowerCase();
    return allThoughts.filter(t =>
      t.content.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }, [searchQuery, allThoughts]);

  const dateThoughts = useMemo(() => {
    if (!selectedDate) return [];
    return filteredThoughts.filter(t => t.date === selectedDate);
  }, [filteredThoughts, selectedDate]);

  useEffect(() => {
    if (!selectedDate && filteredThoughts.length > 0) {
      const dates = [...new Set(filteredThoughts.map(t => t.date))].sort((a, b) => b.localeCompare(a));
      setSelectedDate(dates[0]);
    }
  }, [filteredThoughts, selectedDate]);

  useEffect(() => {
    if (dateThoughts.length > 0) {
      setSelectedThought(dateThoughts[0]);
    } else {
      setSelectedThought(null);
    }
  }, [selectedDate, dateThoughts.length]);

  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date);
    if (isMobile) setMobileView('thoughts');
  }, [isMobile]);

  const handleSelectThought = useCallback((thought: MindThought) => {
    setSelectedThought(thought);
    if (isMobile) setMobileView('detail');
  }, [isMobile]);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="flex-1" />
      </div>
    );
  }

  // Empty state
  if (allThoughts.length === 0 && !showForm) {
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col items-center justify-center gap-4">
        <Brain className="w-16 h-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold">Mind Journal খালি!</h2>
        <p className="text-muted-foreground text-sm text-center max-w-md">
          তোমার trading thoughts, ideas, screenshots এখানে store করো। Telegram group থেকেও auto-sync হবে।
        </p>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> প্রথম Thought লেখো
        </Button>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" /> New Thought
              </DialogTitle>
            </DialogHeader>
            <ThoughtForm onClose={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const header = (
    <div className="flex items-center justify-between px-1 pb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-[0_0_12px_hsla(145,63%,49%,0.15)]">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Mind Journal</h1>
          <span className="text-xs text-muted-foreground">{filteredThoughts.length} thoughts</span>
        </div>
      </div>
      <Button size="sm" onClick={() => setShowForm(true)}>
        <Plus className="w-4 h-4 mr-1" /> New Thought
      </Button>
    </div>
  );

  const formDialog = (
    <Dialog open={showForm} onOpenChange={setShowForm}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" /> New Thought
          </DialogTitle>
        </DialogHeader>
        <ThoughtForm onClose={() => setShowForm(false)} />
      </DialogContent>
    </Dialog>
  );

  if (isMobile) {
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col">
        {header}

        {mobileView === 'dates' && (
          <div className="flex-1 overflow-hidden rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm">
            <MindSidebar thoughts={filteredThoughts} selectedDate={selectedDate} onSelectDate={handleSelectDate} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          </div>
        )}

        {mobileView === 'thoughts' && selectedDate && (
          <div className="flex-1 overflow-hidden rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm">
            <div className="p-2 border-b border-border/30">
              <button onClick={() => setMobileView('dates')} className="text-xs text-primary">← Dates</button>
            </div>
            <ScrollArea className="h-[calc(100%-36px)]">
              <div className="p-3 space-y-2">
                {dateThoughts.map(t => (
                  <ThoughtCard key={t.id} thought={t} isSelected={selectedThought?.id === t.id} onClick={() => handleSelectThought(t)} />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {mobileView === 'detail' && selectedThought && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 border-b border-border/30">
              <button onClick={() => setMobileView('thoughts')} className="text-xs text-primary">← Thoughts</button>
            </div>
            <div className="px-3 py-4">
              <ThoughtDetail thought={selectedThought} />
            </div>
          </div>
        )}

        {formDialog}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {header}

      <div className="flex-1 overflow-hidden rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={18} minSize={14} maxSize={28}>
            <MindSidebar thoughts={filteredThoughts} selectedDate={selectedDate} onSelectDate={handleSelectDate} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          </ResizablePanel>
          <ResizableHandle className="bg-border/30" />
          <ResizablePanel defaultSize={22} minSize={16} maxSize={32}>
            {selectedDate ? (
              <ScrollArea className="h-full">
                <div className="p-3 space-y-2">
                  {dateThoughts.map(t => (
                    <ThoughtCard key={t.id} thought={t} isSelected={selectedThought?.id === t.id} onClick={() => handleSelectThought(t)} />
                  ))}
                  {dateThoughts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">এই তারিখে কোনো thought নেই</p>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">একটি তারিখ বেছে নাও</div>
            )}
          </ResizablePanel>
          <ResizableHandle className="bg-border/30" />
          <ResizablePanel defaultSize={60}>
            {selectedThought ? (
              <ScrollArea className="h-full">
                <div className="p-6">
                  <ThoughtDetail thought={selectedThought} />
                </div>
              </ScrollArea>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Brain className="w-12 h-12 opacity-30" />
                <p className="text-sm">একটি thought select করো details দেখতে</p>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      {formDialog}
    </div>
  );
};

export default MindJournal;
