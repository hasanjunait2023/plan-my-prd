import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpRight, ArrowDownRight, BookOpen, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Trade {
  id: string;
  ticket: string;
  pair: string;
  direction: string;
  entry_price: number;
  exit_price: number | null;
  sl: number | null;
  tp: number | null;
  lot_size: number;
  pnl: number;
  commission: number;
  swap: number;
  open_time: string | null;
  close_time: string | null;
  is_open: boolean;
  imported_to_journal: boolean;
}

interface TradesListProps {
  trades: Trade[];
  loading: boolean;
  onRefresh: () => void;
}

export function TradesList({ trades, loading, onRefresh }: TradesListProps) {
  const openTrades = trades.filter(t => t.is_open);
  const closedTrades = trades.filter(t => !t.is_open);

  const importToJournal = async (trade: Trade) => {
    const { error } = await supabase
      .from('mt5_trades')
      .update({ imported_to_journal: true } as any)
      .eq('id', trade.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to mark as imported', variant: 'destructive' });
    } else {
      toast({ title: 'Imported!', description: `${trade.pair} trade marked for journal` });
      onRefresh();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Card key={i} className="bg-card/50 border-border/30">
            <CardContent className="p-4">
              <Skeleton className="h-6 w-40 mb-3" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Open Positions */}
      <Card className="bg-card/50 border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Open Positions
            <Badge variant="secondary" className="text-[10px]">{openTrades.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {openTrades.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No open positions</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="text-xs">Pair</TableHead>
                    <TableHead className="text-xs">Dir</TableHead>
                    <TableHead className="text-xs">Lot</TableHead>
                    <TableHead className="text-xs">Entry</TableHead>
                    <TableHead className="text-xs">Current</TableHead>
                    <TableHead className="text-xs">SL</TableHead>
                    <TableHead className="text-xs">TP</TableHead>
                    <TableHead className="text-xs text-right">P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openTrades.map(t => (
                    <TableRow key={t.id} className="border-border/20">
                      <TableCell className="text-xs font-medium">{t.pair}</TableCell>
                      <TableCell>
                        <Badge variant={t.direction === 'BUY' ? 'default' : 'destructive'} className="text-[10px] px-1.5">
                          {t.direction === 'BUY' ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                          {t.direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{t.lot_size}</TableCell>
                      <TableCell className="text-xs">{t.entry_price}</TableCell>
                      <TableCell className="text-xs">{t.exit_price ?? '-'}</TableCell>
                      <TableCell className="text-xs">{t.sl ?? '-'}</TableCell>
                      <TableCell className="text-xs">{t.tp ?? '-'}</TableCell>
                      <TableCell className={`text-xs text-right font-semibold ${t.pnl >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Closed Trades */}
      <Card className="bg-card/50 border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            Trade History
            <Badge variant="secondary" className="text-[10px]">{closedTrades.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {closedTrades.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No closed trades yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="text-xs">Pair</TableHead>
                    <TableHead className="text-xs">Dir</TableHead>
                    <TableHead className="text-xs">Lot</TableHead>
                    <TableHead className="text-xs">Entry</TableHead>
                    <TableHead className="text-xs">Exit</TableHead>
                    <TableHead className="text-xs text-right">P&L</TableHead>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs text-center">Journal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closedTrades.map(t => (
                    <TableRow key={t.id} className="border-border/20">
                      <TableCell className="text-xs font-medium">{t.pair}</TableCell>
                      <TableCell>
                        <Badge variant={t.direction === 'BUY' ? 'default' : 'destructive'} className="text-[10px] px-1.5">
                          {t.direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{t.lot_size}</TableCell>
                      <TableCell className="text-xs">{t.entry_price}</TableCell>
                      <TableCell className="text-xs">{t.exit_price ?? '-'}</TableCell>
                      <TableCell className={`text-xs text-right font-semibold ${t.pnl >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.close_time ? new Date(t.close_time).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {t.imported_to_journal ? (
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Imported</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] px-2 text-muted-foreground hover:text-primary"
                            onClick={() => importToJournal(t)}
                          >
                            Import
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
