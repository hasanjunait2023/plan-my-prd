import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AccountSettings } from '@/types/trade';
import { defaultAccountSettings } from '@/data/mockData';

export const useAccountSettings = () => {
  return useQuery({
    queryKey: ['account_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_settings')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (!data) return defaultAccountSettings;
      return {
        startingBalance: Number(data.starting_balance),
        currentBalance: Number(data.current_balance),
        currency: data.currency,
        maxRiskPercent: Number(data.max_risk_percent),
        dailyLossLimit: Number(data.daily_loss_limit),
        maxTradesPerDay: data.max_trades_per_day,
        allowedSessions: (data as any).allowed_sessions || ['Asian', 'London', 'New York', 'London Close'],
        maxWinningTrades: (data as any).max_winning_trades ?? 3,
        maxLosingTrades: (data as any).max_losing_trades ?? 2,
        maxLotSize: Number((data as any).max_lot_size ?? 1),
        maxDrawdownPercent: Number((data as any).max_drawdown_percent ?? 5),
        minConfidence: (data as any).min_confidence ?? 5,
        minRrr: Number((data as any).min_rrr ?? 1.5),
        minSmcTags: (data as any).min_smc_tags ?? 1,
      } as AccountSettings;
    },
  });
};

export const useSaveAccountSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: AccountSettings) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('account_settings')
        .select('id')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('account_settings')
          .update({
            starting_balance: settings.startingBalance,
            current_balance: settings.currentBalance,
            currency: settings.currency,
            max_risk_percent: settings.maxRiskPercent,
            daily_loss_limit: settings.dailyLossLimit,
            max_trades_per_day: settings.maxTradesPerDay,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('account_settings')
          .insert({
            user_id: session.user.id,
            starting_balance: settings.startingBalance,
            current_balance: settings.currentBalance,
            currency: settings.currency,
            max_risk_percent: settings.maxRiskPercent,
            daily_loss_limit: settings.dailyLossLimit,
            max_trades_per_day: settings.maxTradesPerDay,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account_settings'] }),
  });
};
