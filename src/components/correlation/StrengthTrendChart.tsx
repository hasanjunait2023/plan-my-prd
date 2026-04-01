import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CurrencyStrengthRecord, CURRENCY_FLAGS } from '@/types/correlation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

const CURRENCY_COLORS: Record<string, string> = {
  EUR: 'hsl(220, 70%, 60%)',
  USD: 'hsl(142, 71%, 50%)',
  GBP: 'hsl(0, 84%, 60%)',
  JPY: 'hsl(48, 96%, 53%)',
  AUD: 'hsl(25, 95%, 53%)',
  NZD: 'hsl(280, 60%, 60%)',
  CAD: 'hsl(340, 70%, 60%)',
  CHF: 'hsl(180, 60%, 50%)',
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
    return (
      <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-xs">লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
        ট্রেন্ড দেখানোর জন্য পর্যাপ্ত ডেটা নেই
      </div>
    );
  }

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
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsla(0, 0%, 100%, 0.05)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'hsl(0, 0%, 50%)', fontWeight: 500 }}
          axisLine={{ stroke: 'hsla(0, 0%, 100%, 0.08)' }}
          tickLine={false}
        />
        <YAxis
          domain={[-10, 10]}
          tick={{ fontSize: 10, fill: 'hsl(0, 0%, 50%)', fontWeight: 500 }}
          axisLine={{ stroke: 'hsla(0, 0%, 100%, 0.08)' }}
          tickLine={false}
        />
        <ReferenceLine y={0} stroke="hsla(0, 0%, 100%, 0.12)" strokeDasharray="4 4" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(0, 0%, 6%)',
            border: '1px solid hsla(0, 0%, 100%, 0.1)',
            borderRadius: '12px',
            fontSize: '11px',
            padding: '10px 14px',
            boxShadow: '0 8px 32px hsla(0, 0%, 0%, 0.5)',
          }}
          labelStyle={{ color: 'hsl(0, 0%, 60%)', fontWeight: 600, marginBottom: 4 }}
          itemStyle={{ padding: '1px 0' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }}
          formatter={(value: string) => (
            <span style={{ color: 'hsl(0, 0%, 70%)', fontWeight: 600 }}>
              {CURRENCY_FLAGS[value] || ''} {value}
            </span>
          )}
        />
        {currencies.map(currency => (
          <Line
            key={currency}
            type="monotone"
            dataKey={currency}
            stroke={CURRENCY_COLORS[currency] || 'hsl(0, 0%, 50%)'}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 0, fill: CURRENCY_COLORS[currency] || 'hsl(0, 0%, 50%)' }}
            activeDot={{
              r: 5,
              strokeWidth: 2,
              stroke: 'hsl(0, 0%, 4%)',
              fill: CURRENCY_COLORS[currency] || 'hsl(0, 0%, 50%)',
            }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
