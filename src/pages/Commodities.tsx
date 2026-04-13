import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetPriceCard } from '@/components/assets/AssetPriceCard';
import { TradingViewChart } from '@/components/assets/TradingViewChart';
import { TradingTipsCard } from '@/components/assets/TradingTipsCard';
import { CorrelationInfo } from '@/components/assets/CorrelationInfo';
import { SessionPanel } from '@/components/correlation/SessionPanel';

const ASSETS = [
  { key: 'XAUUSD', name: 'Gold', icon: '🥇', label: '🥇 Gold' },
  { key: 'XAGUSD', name: 'Silver', icon: '🥈', label: '🥈 Silver' },
  { key: 'USOIL', name: 'Crude Oil', icon: '🛢️', label: '🛢️ Oil' },
  { key: 'BTCUSD', name: 'Bitcoin', icon: '₿', label: '₿ Bitcoin' },
];

export default function Commodities() {
  const [activeTab, setActiveTab] = useState('XAUUSD');
  const asset = ASSETS.find(a => a.key === activeTab)!;

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          🥇 Commodities & Crypto
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Gold, Silver, Oil & Bitcoin — live prices, charts ও trading insights</p>
      </div>

      <SessionPanel />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/30 border border-border/30">
          {ASSETS.map(a => (
            <TabsTrigger key={a.key} value={a.key} className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              {a.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {ASSETS.map(a => (
          <TabsContent key={a.key} value={a.key} className="space-y-4 mt-4">
            <AssetPriceCard symbol={a.key} name={a.name} icon={a.icon} />
            <TradingViewChart symbol={a.key} title={`${a.icon} ${a.name} — Live Chart`} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CorrelationInfo symbol={a.key} />
              <TradingTipsCard symbol={a.key} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
