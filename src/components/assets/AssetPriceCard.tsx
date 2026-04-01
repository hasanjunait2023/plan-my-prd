import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AssetPriceCardProps {
  symbol: string;
  name: string;
  icon: string;
}

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  todayHigh: number;
  todayLow: number;
  marketState: string;
}

export function AssetPriceCard({ symbol, name, icon }: AssetPriceCardProps) {
  const { data, isLoading, error, refetch } = useQuery<PriceData>({
    queryKey: ['asset-price', symbol],
    queryFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/fetch-asset-price?symbol=${symbol}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!res.ok) throw new Error('Failed to fetch price');
      return res.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const isPositive = (data?.changePercent ?? 0) >= 0;

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <div>
              <h3 className="text-sm font-bold text-foreground">{name}</h3>
              <span className="text-[10px] text-muted-foreground">{symbol}</span>
            </div>
          </div>
          <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-xs text-destructive py-2">Price unavailable</div>
        ) : data ? (
          <>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-2xl font-bold text-foreground">${data.price.toLocaleString()}</span>
              <div className={`flex items-center gap-0.5 text-xs font-semibold pb-1 ${isPositive ? 'text-primary' : 'text-destructive'}`}>
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>High: <span className="text-foreground font-medium">${data.todayHigh.toLocaleString()}</span></span>
              <span>Low: <span className="text-foreground font-medium">${data.todayLow.toLocaleString()}</span></span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                data.marketState === 'REGULAR' ? 'bg-primary/15 text-primary' : 'bg-muted/50 text-muted-foreground'
              }`}>
                {data.marketState === 'REGULAR' ? 'LIVE' : data.marketState}
              </span>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
