import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, FileText, File } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Trade, TradeOutcome } from '@/types/trade';
import { filterTrades, exportToPdf, exportToDocx } from '@/lib/exportTrades';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trades: Trade[];
}

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ExportDialog = ({ open, onOpenChange, trades }: ExportDialogProps) => {
  const [fileFormat, setFileFormat] = useState<'pdf' | 'docx'>('pdf');
  const [dateMode, setDateMode] = useState<'monthly' | 'yearly' | 'custom'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [outcomes, setOutcomes] = useState<TradeOutcome[]>(['WIN', 'LOSS', 'BREAKEVEN']);
  const [includeScreenshots, setIncludeScreenshots] = useState(true);
  const [exporting, setExporting] = useState(false);

  const years = useMemo(() => {
    const allYears = [...new Set(trades.map(t => parseInt(t.date.substring(0, 4))))];
    return allYears.sort((a, b) => b - a);
  }, [trades]);

  const dateValue = useMemo(() => ({
    month: selectedMonth,
    year: selectedYear,
    startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
    endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
  }), [selectedMonth, selectedYear, startDate, endDate]);

  const filteredTrades = useMemo(() =>
    filterTrades(trades, dateMode, dateValue, outcomes),
    [trades, dateMode, dateValue, outcomes]
  );

  const dateLabel = useMemo(() => {
    if (dateMode === 'monthly') return `${months[selectedMonth]} ${selectedYear}`;
    if (dateMode === 'yearly') return `${selectedYear}`;
    if (startDate && endDate) return `${format(startDate, 'dd MMM yyyy')} - ${format(endDate, 'dd MMM yyyy')}`;
    return 'Custom Range';
  }, [dateMode, selectedMonth, selectedYear, startDate, endDate]);

  const toggleOutcome = (outcome: TradeOutcome) => {
    setOutcomes(prev =>
      prev.includes(outcome)
        ? prev.filter(o => o !== outcome)
        : [...prev, outcome]
    );
  };

  const handleExport = async () => {
    if (filteredTrades.length === 0) return;
    setExporting(true);
    try {
      const opts = { format: fileFormat, trades: filteredTrades, dateLabel, outcomeFilters: outcomes, includeScreenshots };
      if (fileFormat === 'pdf') await exportToPdf(opts);
      else await exportToDocx(opts);
      onOpenChange(false);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Download className="w-5 h-5 text-primary" />
            Export Trade Journal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Format */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Format</Label>
            <RadioGroup value={fileFormat} onValueChange={(v) => setFileFormat(v as 'pdf' | 'docx')} className="flex gap-3">
              <Label className={cn("flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors", fileFormat === 'pdf' ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-border')}>
                <RadioGroupItem value="pdf" className="sr-only" />
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">PDF</span>
              </Label>
              <Label className={cn("flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors", fileFormat === 'docx' ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-border')}>
                <RadioGroupItem value="docx" className="sr-only" />
                <File className="w-4 h-4" />
                <span className="text-sm font-medium">DOCX</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Date Range</Label>
            <RadioGroup value={dateMode} onValueChange={(v) => setDateMode(v as any)} className="flex gap-2">
              {(['monthly', 'yearly', 'custom'] as const).map(mode => (
                <Label key={mode} className={cn("px-3 py-1.5 rounded-md border cursor-pointer text-xs font-medium transition-colors", dateMode === mode ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-border')}>
                  <RadioGroupItem value={mode} className="sr-only" />
                  {mode === 'monthly' ? 'Monthly' : mode === 'yearly' ? 'Yearly' : 'Custom'}
                </Label>
              ))}
            </RadioGroup>

            {dateMode === 'monthly' && (
              <div className="flex gap-2 mt-2">
                <Select value={`${selectedMonth}`} onValueChange={v => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger className="flex-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map((m, i) => <SelectItem key={i} value={`${i}`}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={`${selectedYear}`} onValueChange={v => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={`${y}`}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {dateMode === 'yearly' && (
              <Select value={`${selectedYear}`} onValueChange={v => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-32 h-9 mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={`${y}`}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {dateMode === 'custom' && (
              <div className="flex gap-2 mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("flex-1 justify-start text-left font-normal h-9", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                      {startDate ? format(startDate, 'dd MMM yyyy') : 'Start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("flex-1 justify-start text-left font-normal h-9", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                      {endDate ? format(endDate, 'dd MMM yyyy') : 'End date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Outcome Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Trade Outcome</Label>
            <div className="flex gap-4">
              {([
                { value: 'WIN' as TradeOutcome, label: 'Winning', color: 'text-green-400' },
                { value: 'LOSS' as TradeOutcome, label: 'Losing', color: 'text-red-400' },
                { value: 'BREAKEVEN' as TradeOutcome, label: 'Breakeven', color: 'text-yellow-400' },
              ]).map(item => (
                <label key={item.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={outcomes.includes(item.value)}
                    onCheckedChange={() => toggleOutcome(item.value)}
                  />
                  <span className={cn("text-sm", item.color)}>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preview count */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border border-border/30">
            <span className="text-sm text-muted-foreground">Trades found</span>
            <span className={cn("text-sm font-bold", filteredTrades.length > 0 ? 'text-primary' : 'text-destructive')}>
              {filteredTrades.length}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleExport} disabled={filteredTrades.length === 0 || exporting || outcomes.length === 0}>
            <Download className="w-4 h-4 mr-1.5" />
            {exporting ? 'Exporting...' : `Export ${fileFormat.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
