import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CurrencyStrengthRecord, CURRENCY_FLAGS, CATEGORY_COLORS } from '@/types/correlation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

const CURRENCY_COLORS: Record<string, string> = {
  EUR: 'hsl(220, 70%, 55%)',
  USD: 'hsl(142, 71%, 45%)',
  GBP: 'hsl(0, 84%, 60%)',
  JPY: 'hsl(48, 96%, 53%)',
  AUD: 'hsl(25, 95%, 53%)',
  NZD: 'hsl(280, 60%, 55%)',
  CAD: 'hsl(340, 70%, 55%)',
  CHF: 'hsl(180, 60%, 45%)',
};

interface StrengthTrendChartProps {
  timeframe: string;
}

export function StrengthTrendChart({ timeframe }: StrengthTrendChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['currency-strength-trend', timeframe],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_strength')
        .select('*')
        .eq('timeframe', timeframe)
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      return data as CurrencyStrengthRecord[];
    },
  });

  if (isLoading) {
    return <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">লোড হচ্ছে...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">ট্রেন্ড দেখানোর জন্য পর্যাপ্ত ডেটা নেই</div>;
  }

  // Group by recorded_at timestamp, then pivot currencies as columns
  const timeMap = new Map<string, Record<string, number | string>>();
  for (const row of data) {
    const key = row.recorded_at;
    if (!timeMap.has(key)) {
      timeMap.set(key, { date: format(new Date(key), 'dd MMM') });
    }
    timeMap.get(key)![row.currency] = row.strength;
  }

  const chartData = Array.from(timeMap.values());
  const currencies = [...new Set(data.map(d => d.currency))];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(0, 0%, 60%)' }} />
        <YAxis domain={[-10, 10]} tick={{ fontSize: 11, fill: 'hsl(0, 0%, 60%)' }} />
        <ReferenceLine y={0} stroke="hsl(0, 0%, 40%)" strokeDasharray="4 4" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(0, 0%, 8%)',
            border: '1px solid hsl(0, 0%, 20%)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          labelStyle={{ color: 'hsl(0, 0%, 70%)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px' }}
          formatter={(value: string) => `${CURRENCY_FLAGS[value] || ''} ${value}`}
        />
        {currencies.map(currency => (
          <Line
            key={currency}
            type="monotone"
            dataKey={currency}
            stroke={CURRENCY_COLORS[currency] || 'hsl(0, 0%, 50%)'}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
