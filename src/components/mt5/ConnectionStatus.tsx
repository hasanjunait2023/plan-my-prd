import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  connected: boolean;
  lastSync: string | null;
}

export function ConnectionStatus({ connected, lastSync }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2">
      {connected ? (
        <Badge className="bg-primary/15 text-primary border-primary/30 gap-1">
          <Wifi className="w-3 h-3" />
          Connected
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground gap-1">
          <WifiOff className="w-3 h-3" />
          Not synced
        </Badge>
      )}
      {lastSync && (
        <span className="text-[11px] text-muted-foreground">
          Last: {new Date(lastSync).toLocaleString()}
        </span>
      )}
    </div>
  );
}
