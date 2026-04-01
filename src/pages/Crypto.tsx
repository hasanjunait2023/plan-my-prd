import { AssetPriceCard } from '@/components/assets/AssetPriceCard';
import { TradingViewChart } from '@/components/assets/TradingViewChart';
import { TradingTipsCard } from '@/components/assets/TradingTipsCard';
import { CorrelationInfo } from '@/components/assets/CorrelationInfo';
import { SessionPanel } from '@/components/correlation/SessionPanel';

export default function Crypto() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          ₿ Crypto
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Bitcoin — live price, chart ও trading insights</p>
      </div>

      {/* Price Card */}
      <AssetPriceCard symbol="BTCUSD" name="Bitcoin" icon="₿" />

      {/* Chart */}
      <TradingViewChart symbol="BTCUSD" title="₿ Bitcoin — Live Chart" />

      {/* Metrics & Correlation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CorrelationInfo symbol="BTCUSD" />
        <TradingTipsCard symbol="BTCUSD" />
      </div>
    </div>
  );
}
