import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExtractedTradeData {
  pair?: string;
  timeframe?: string;
  direction?: 'LONG' | 'SHORT';
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  lotSize?: number;
  riskAmount?: number;
  profitAmount?: number;
  session?: string;
  pips?: number;
}

interface ScreenshotAnalyzerProps {
  imageBase64: string;
  onDataExtracted: (data: ExtractedTradeData) => void;
}

const ScreenshotAnalyzer = ({ imageBase64, onDataExtracted }: ScreenshotAnalyzerProps) => {
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedTradeData | null>(null);

  const analyze = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-trade-screenshot', {
        body: { imageBase64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const extracted = data.data as ExtractedTradeData;
      setExtractedData(extracted);
      toast.success('Screenshot analyze হয়েছে!');
    } catch (e: any) {
      console.error('Analysis error:', e);
      toast.error(e.message || 'Screenshot analyze করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const applyData = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
      toast.success('Data form এ apply হয়েছে!');
    }
  };

  const fields = extractedData
    ? Object.entries(extractedData).filter(([_, v]) => v != null)
    : [];

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={analyze}
        disabled={loading}
        className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? 'Analyzing...' : 'AI দিয়ে Analyze করো'}
      </Button>

      {extractedData && fields.length > 0 && (
        <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
          <p className="text-xs text-muted-foreground font-medium">📊 Extracted Data:</p>
          <div className="flex flex-wrap gap-2">
            {fields.map(([key, value]) => (
              <Badge key={key} variant="secondary" className="text-xs">
                {key}: <span className="font-bold ml-1">{String(value)}</span>
              </Badge>
            ))}
          </div>
          <Button type="button" size="sm" onClick={applyData} className="gap-2">
            <Check className="w-3 h-3" />
            Form এ Apply করো
          </Button>
        </div>
      )}
    </div>
  );
};

export default ScreenshotAnalyzer;
