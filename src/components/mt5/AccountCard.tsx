import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, Shield, Unlock, Server, Clock } from 'lucide-react';

interface AccountInfo {
  account_id: string;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  leverage: number;
  server: string | null;
  broker: string | null;
  currency: string | null;
  synced_at: string;
}

interface AccountCardProps {
  data: AccountInfo | null;
  loading: boolean;
}

export function AccountCard({ data, loading }: AccountCardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="bg-card/50 border-border/30">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-7 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="bg-card/50 border-border/30">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          No account data yet. Click "Sync Now" to fetch from MT5.
        </CardContent>
      </Card>
    );
  }

  const currency = data.currency || 'USD';
  const metrics = [
    { label: 'Balance', value: `${data.balance.toFixed(2)} ${currency}`, icon: DollarSign, color: 'text-primary' },
    { label: 'Equity', value: `${data.equity.toFixed(2)} ${currency}`, icon: TrendingUp, color: 'text-blue-400' },
    { label: 'Margin', value: `${data.margin.toFixed(2)} ${currency}`, icon: Shield, color: 'text-yellow-400' },
    { label: 'Free Margin', value: `${data.free_margin.toFixed(2)} ${currency}`, icon: Unlock, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <Card key={m.label} className="bg-card/50 border-border/30 hover:border-primary/20 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <m.icon className={`w-4 h-4 ${m.color}`} />
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {data.server && (
          <div className="flex items-center gap-1">
            <Server className="w-3.5 h-3.5" />
            <span>{data.server}</span>
          </div>
        )}
        {data.broker && <Badge variant="outline" className="text-[10px]">{data.broker}</Badge>}
        {data.leverage > 0 && <Badge variant="secondary" className="text-[10px]">1:{data.leverage}</Badge>}
        <div className="flex items-center gap-1 ml-auto">
          <Clock className="w-3.5 h-3.5" />
          <span>Synced: {new Date(data.synced_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
