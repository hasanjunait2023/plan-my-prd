import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { mockTrades, pairOptions, strategyOptions } from '@/data/mockData';
import { Trade, TradeOutcome, Session } from '@/types/trade';
import { Search, Star, Filter, X } from 'lucide-react';

const TradeJournal = () => {
  const [search, setSearch] = useState('');
  const [filterPair, setFilterPair] = useState<string>('all');
  const [filterOutcome, setFilterOutcome] = useState<string>('all');
  const [filterSession, setFilterSession] = useState<string>('all');
  const [filterStrategy, setFilterStrategy] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Trade>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredTrades = useMemo(() => {
    let trades = [...mockTrades];
    if (search) {
      const s = search.toLowerCase();
      trades = trades.filter(t =>
        t.pair.toLowerCase().includes(s) ||
        t.strategy.toLowerCase().includes(s) ||
        t.preTradeNotes.toLowerCase().includes(s) ||
        t.postTradeNotes.toLowerCase().includes(s) ||
        t.smcTags.some(tag => tag.toLowerCase().includes(s))
      );
    }
    if (filterPair !== 'all') trades = trades.filter(t => t.pair === filterPair);
    if (filterOutcome !== 'all') trades = trades.filter(t => t.outcome === filterOutcome);
    if (filterSession !== 'all') trades = trades.filter(t => t.session === filterSession);
    if (filterStrategy !== 'all') trades = trades.filter(t => t.strategy === filterStrategy);

    trades.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return trades;
  }, [search, filterPair, filterOutcome, filterSession, filterStrategy, sortField, sortDir]);

  const handleSort = (field: keyof Trade) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: keyof Trade }) => (
    sortField === field ? <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span> : null
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trade Journal</h1>
          <p className="text-sm text-muted-foreground">{filteredTrades.length} trades</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="w-4 h-4 mr-1" />
          Filters
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search trades..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Select value={filterPair} onValueChange={setFilterPair}>
                <SelectTrigger><SelectValue placeholder="Pair" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pairs</SelectItem>
                  {pairOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterOutcome} onValueChange={setFilterOutcome}>
                <SelectTrigger><SelectValue placeholder="Outcome" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="WIN">Win</SelectItem>
                  <SelectItem value="LOSS">Loss</SelectItem>
                  <SelectItem value="BREAKEVEN">Breakeven</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSession} onValueChange={setFilterSession}>
                <SelectTrigger><SelectValue placeholder="Session" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  {['Asian', 'London', 'New York', 'London Close'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStrategy} onValueChange={setFilterStrategy}>
                <SelectTrigger><SelectValue placeholder="Strategy" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Strategies</SelectItem>
                  {strategyOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>Date<SortIcon field="date" /></TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('pair')}>Pair<SortIcon field="pair" /></TableHead>
                  <TableHead>Dir</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('pnl')}>P&L<SortIcon field="pnl" /></TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('rrr')}>RRR<SortIcon field="rrr" /></TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrades.map(trade => (
                  <TableRow key={trade.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedTrade(trade)}>
                    <TableCell>{trade.starred && <Star className="w-3 h-3 text-warning fill-warning" />}</TableCell>
                    <TableCell className="text-sm">{trade.date}</TableCell>
                    <TableCell className="font-medium">{trade.pair}</TableCell>
                    <TableCell>
                      <Badge variant={trade.direction === 'LONG' ? 'default' : 'destructive'} className="text-[10px]">
                        {trade.direction}
                      </Badge>
                    </TableCell>
                    <TableCell className={`font-semibold ${trade.pnl > 0 ? 'text-profit' : trade.pnl < 0 ? 'text-loss' : 'text-muted-foreground'}`}>
                      {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(0)}
                    </TableCell>
                    <TableCell>{trade.rrr.toFixed(1)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{trade.strategy}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${
                        trade.outcome === 'WIN' ? 'border-profit text-profit' :
                        trade.outcome === 'LOSS' ? 'border-loss text-loss' : 'border-muted-foreground'
                      }`}>
                        {trade.outcome}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{trade.session}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Trade Detail Dialog */}
      <Dialog open={!!selectedTrade} onOpenChange={() => setSelectedTrade(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedTrade && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge variant={selectedTrade.direction === 'LONG' ? 'default' : 'destructive'}>{selectedTrade.direction}</Badge>
                  {selectedTrade.pair}
                  <span className="text-muted-foreground font-normal text-sm">{selectedTrade.date}</span>
                  {selectedTrade.starred && <Star className="w-4 h-4 text-warning fill-warning" />}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* P&L & Core Info */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-accent/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">P&L</p>
                    <p className={`text-xl font-bold ${selectedTrade.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {selectedTrade.pnl >= 0 ? '+' : ''}${selectedTrade.pnl.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-accent/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Pips</p>
                    <p className="text-xl font-bold">{selectedTrade.pips}</p>
                  </div>
                  <div className="bg-accent/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">RRR</p>
                    <p className="text-xl font-bold">{selectedTrade.rrr}</p>
                  </div>
                </div>

                {/* Trade Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Strategy:</span> <span className="ml-1 font-medium">{selectedTrade.strategy}</span></div>
                  <div><span className="text-muted-foreground">Session:</span> <span className="ml-1">{selectedTrade.session}</span></div>
                  <div><span className="text-muted-foreground">Timeframe:</span> <span className="ml-1">{selectedTrade.timeframe}</span></div>
                  <div><span className="text-muted-foreground">Lot Size:</span> <span className="ml-1">{selectedTrade.lotSize}</span></div>
                  <div><span className="text-muted-foreground">Entry:</span> <span className="ml-1">{selectedTrade.entryPrice}</span></div>
                  <div><span className="text-muted-foreground">Exit:</span> <span className="ml-1">{selectedTrade.exitPrice}</span></div>
                  <div><span className="text-muted-foreground">SL:</span> <span className="ml-1">{selectedTrade.stopLoss}</span></div>
                  <div><span className="text-muted-foreground">TP:</span> <span className="ml-1">{selectedTrade.takeProfit}</span></div>
                  <div><span className="text-muted-foreground">Risk %:</span> <span className="ml-1">{selectedTrade.riskPercent}%</span></div>
                  <div><span className="text-muted-foreground">Risk $:</span> <span className="ml-1">${selectedTrade.riskDollars}</span></div>
                </div>

                {/* Tags */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">SMC Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTrade.smcTags.map(tag => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}
                  </div>
                </div>
                {selectedTrade.mistakes.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mistakes</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTrade.mistakes.map(m => <Badge key={m} variant="destructive" className="text-[10px]">{m}</Badge>)}
                    </div>
                  </div>
                )}

                {/* Psychology */}
                <div className="bg-accent/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Psychology</p>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{selectedTrade.psychologyState}/10</span>
                    <Badge variant="secondary">{selectedTrade.psychologyEmotion}</Badge>
                    <Badge variant={selectedTrade.planAdherence ? 'default' : 'destructive'}>
                      {selectedTrade.planAdherence ? '✓ Plan Followed' : '✗ Plan Broken'}
                    </Badge>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Pre-Trade Reasoning</p>
                  <p className="text-sm bg-accent/30 rounded p-2">{selectedTrade.preTradeNotes}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Post-Trade Review</p>
                  <p className="text-sm bg-accent/30 rounded p-2">{selectedTrade.postTradeNotes}</p>
                </div>

                {/* Partial Closes */}
                {selectedTrade.partialCloses.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Partial Closes</p>
                    {selectedTrade.partialCloses.map(pc => (
                      <div key={pc.id} className="text-sm flex gap-3">
                        <span>{pc.lots} lots @ {pc.exitPrice}</span>
                        <span className={pc.pnl >= 0 ? 'text-profit' : 'text-loss'}>${pc.pnl}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TradeJournal;
