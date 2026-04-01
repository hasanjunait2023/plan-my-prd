import { useState, useMemo, useEffect, useCallback } from 'react';
import { mockTrades } from '@/data/mockData';
import { Trade } from '@/types/trade';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import NotebookSidebar from '@/components/journal/NotebookSidebar';
import TradePageList from '@/components/journal/TradePageList';
import TradeDocument from '@/components/journal/TradeDocument';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

const TradeJournal = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  // Mobile drill-down: 'dates' → 'trades' → 'document'
  const [mobileView, setMobileView] = useState<'dates' | 'trades' | 'document'>('dates');

  // Filter trades by search
  const filteredTrades = useMemo(() => {
    if (!searchQuery) return mockTrades;
    const q = searchQuery.toLowerCase();
    return mockTrades.filter(t =>
      t.pair.toLowerCase().includes(q) ||
      t.strategy.toLowerCase().includes(q) ||
      t.reasonForEntry?.toLowerCase().includes(q) ||
      t.preTradeNotes.toLowerCase().includes(q) ||
      t.postTradeNotes.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Trades for selected date
  const dateTrades = useMemo(() => {
    if (!selectedDate) return [];
    return filteredTrades.filter(t => t.date === selectedDate);
  }, [filteredTrades, selectedDate]);

  // Auto-select first date
  useEffect(() => {
    if (!selectedDate && filteredTrades.length > 0) {
      const dates = [...new Set(filteredTrades.map(t => t.date))].sort((a, b) => b.localeCompare(a));
      setSelectedDate(dates[0]);
    }
  }, [filteredTrades, selectedDate]);

  // Auto-select first trade when date changes
  useEffect(() => {
    if (dateTrades.length > 0) {
      setSelectedTrade(dateTrades[0]);
    } else {
      setSelectedTrade(null);
    }
  }, [selectedDate, dateTrades.length]);

  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date);
    if (isMobile) setMobileView('trades');
  }, [isMobile]);

  const handleSelectTrade = useCallback((trade: Trade) => {
    setSelectedTrade(trade);
    if (isMobile) setMobileView('document');
  }, [isMobile]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      const dates = [...new Set(filteredTrades.map(t => t.date))].sort((a, b) => b.localeCompare(a));
      const currentDateIdx = selectedDate ? dates.indexOf(selectedDate) : -1;
      const currentTradeIdx = selectedTrade ? dateTrades.findIndex(t => t.id === selectedTrade.id) : -1;

      if (e.key === 'ArrowUp' && e.altKey && currentDateIdx > 0) {
        e.preventDefault();
        setSelectedDate(dates[currentDateIdx - 1]);
      } else if (e.key === 'ArrowDown' && e.altKey && currentDateIdx < dates.length - 1) {
        e.preventDefault();
        setSelectedDate(dates[currentDateIdx + 1]);
      } else if (e.key === 'ArrowUp' && !e.altKey && currentTradeIdx > 0) {
        e.preventDefault();
        setSelectedTrade(dateTrades[currentTradeIdx - 1]);
      } else if (e.key === 'ArrowDown' && !e.altKey && currentTradeIdx < dateTrades.length - 1) {
        e.preventDefault();
        setSelectedTrade(dateTrades[currentTradeIdx + 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredTrades, selectedDate, selectedTrade, dateTrades]);

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-1 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Trade Journal</h1>
          </div>
          <Button size="sm" onClick={() => navigate('/new-trade')}>
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>
        </div>

        {mobileView === 'dates' && (
          <div className="flex-1 overflow-hidden rounded-lg border border-border">
            <NotebookSidebar
              trades={filteredTrades}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        )}

        {mobileView === 'trades' && selectedDate && (
          <div className="flex-1 overflow-hidden rounded-lg border border-border">
            <div className="p-2 border-b border-border">
              <button onClick={() => setMobileView('dates')} className="text-xs text-primary">← Dates</button>
            </div>
            <TradePageList
              trades={dateTrades}
              selectedDate={selectedDate}
              selectedTradeId={selectedTrade?.id ?? null}
              onSelectTrade={handleSelectTrade}
            />
          </div>
        )}

        {mobileView === 'document' && selectedTrade && (
          <div className="flex-1 overflow-auto">
            <div className="p-2 border-b border-border">
              <button onClick={() => setMobileView('trades')} className="text-xs text-primary">← Trades</button>
            </div>
            <div className="p-4">
              <TradeDocument trade={selectedTrade} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop 3-panel layout
  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Trade Journal</h1>
          <span className="text-xs text-muted-foreground">{filteredTrades.length} trades</span>
        </div>
        <Button size="sm" onClick={() => navigate('/new-trade')}>
          <Plus className="w-4 h-4 mr-1" /> New Trade
        </Button>
      </div>

      {/* 3-Panel Notebook */}
      <div className="flex-1 overflow-hidden rounded-lg border border-border">
        <ResizablePanelGroup direction="horizontal">
          {/* Panel 1: Date Sections */}
          <ResizablePanel defaultSize={18} minSize={14} maxSize={28}>
            <NotebookSidebar
              trades={filteredTrades}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </ResizablePanel>

          <ResizableHandle />

          {/* Panel 2: Trade Pages */}
          <ResizablePanel defaultSize={22} minSize={16} maxSize={32}>
            {selectedDate ? (
              <TradePageList
                trades={dateTrades}
                selectedDate={selectedDate}
                selectedTradeId={selectedTrade?.id ?? null}
                onSelectTrade={handleSelectTrade}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                একটি তারিখ বেছে নাও
              </div>
            )}
          </ResizablePanel>

          <ResizableHandle />

          {/* Panel 3: Document Content */}
          <ResizablePanel defaultSize={60}>
            {selectedTrade ? (
              <ScrollArea className="h-full">
                <div className="p-6">
                  <TradeDocument trade={selectedTrade} />
                </div>
              </ScrollArea>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <BookOpen className="w-12 h-12 opacity-30" />
                <p className="text-sm">একটি trade select করো document দেখতে</p>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default TradeJournal;
