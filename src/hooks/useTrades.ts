import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trade } from '@/types/trade';
import { mockTrades } from '@/data/mockTrades';

// Map DB row to Trade type
const mapRow = (r: any): Trade => ({
  id: r.id,
  date: r.date,
  pair: r.pair,
  direction: r.direction,
  session: r.session,
  timeframe: r.timeframe,
  strategy: r.strategy,
  entryPrice: Number(r.entry_price),
  exitPrice: Number(r.exit_price),
  stopLoss: Number(r.stop_loss),
  takeProfit: Number(r.take_profit),
  lotSize: Number(r.lot_size),
  riskPercent: Number(r.risk_percent),
  riskDollars: Number(r.risk_dollars),
  rrr: Number(r.rrr),
  pnl: Number(r.pnl),
  pips: Number(r.pips),
  outcome: r.outcome,
  smcTags: r.smc_tags || [],
  mistakes: r.mistakes || [],
  psychologyState: r.psychology_state,
  psychologyEmotion: r.psychology_emotion,
  planAdherence: r.plan_adherence,
  preTradeNotes: r.pre_trade_notes,
  postTradeNotes: r.post_trade_notes,
  reasonForEntry: r.reason_for_entry,
  confidenceLevel: r.confidence_level,
  preSituation: r.pre_situation,
  duringSituation: r.during_situation,
  postSituation: r.post_situation,
  whatWentWell: r.what_went_well,
  improvementNotes: r.improvement_notes,
  entryScreenshots: r.entry_screenshots || [],
  exitScreenshots: r.exit_screenshots || [],
  screenshots: r.screenshots || [],
  partialCloses: r.partial_closes || [],
  status: r.status || 'CLOSED',
  starred: r.starred,
  createdAt: r.created_at,
  ruleChecklist: r.rule_checklist || [],
  ruleScore: Number(r.rule_score || 0),
  revisionNotes: r.revision_notes || '',
  revisionTakeaway: r.revision_takeaway || '',
  revisionWouldTakeAgain: r.revision_would_take_again ?? null,
  revisionRating: r.revision_rating ?? null,
  revisedAt: r.revised_at || null,
});

export const useTrades = () => {
  return useQuery({
    queryKey: ['trades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map(mapRow);
      // Fallback to mock data when DB is empty
      return mapped.length > 0 ? mapped : mockTrades;
    },
  });
};

export const useInsertTrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (trade: Omit<Trade, 'id' | 'createdAt'>) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { error } = await supabase.from('trades').insert({
        user_id: session.user.id,
        date: trade.date,
        pair: trade.pair,
        direction: trade.direction,
        session: trade.session,
        timeframe: trade.timeframe,
        strategy: trade.strategy,
        entry_price: trade.entryPrice,
        exit_price: trade.exitPrice,
        stop_loss: trade.stopLoss,
        take_profit: trade.takeProfit,
        lot_size: trade.lotSize,
        risk_percent: trade.riskPercent,
        risk_dollars: trade.riskDollars,
        rrr: trade.rrr,
        pnl: trade.pnl,
        pips: trade.pips,
        outcome: trade.outcome,
        smc_tags: trade.smcTags,
        mistakes: trade.mistakes,
        psychology_state: trade.psychologyState,
        psychology_emotion: trade.psychologyEmotion,
        plan_adherence: trade.planAdherence,
        pre_trade_notes: trade.preTradeNotes,
        post_trade_notes: trade.postTradeNotes,
        reason_for_entry: trade.reasonForEntry,
        confidence_level: trade.confidenceLevel,
        pre_situation: trade.preSituation,
        during_situation: trade.duringSituation,
        post_situation: trade.postSituation,
        what_went_well: trade.whatWentWell,
        improvement_notes: trade.improvementNotes,
        entry_screenshots: trade.entryScreenshots,
        exit_screenshots: trade.exitScreenshots,
        screenshots: trade.screenshots,
        partial_closes: JSON.parse(JSON.stringify(trade.partialCloses)),
        starred: trade.starred,
        status: trade.status || 'PENDING',
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trades'] }),
  });
};

export const useUpdateTrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string } & Record<string, any>) => {
      const dbFields: Record<string, any> = {};
      const map: Record<string, string> = {
        exitPrice: 'exit_price', pnl: 'pnl', pips: 'pips', outcome: 'outcome', status: 'status',
        exitScreenshots: 'exit_screenshots', duringSituation: 'during_situation',
        postSituation: 'post_situation', whatWentWell: 'what_went_well',
        improvementNotes: 'improvement_notes', mistakes: 'mistakes',
        partialCloses: 'partial_closes', postTradeNotes: 'post_trade_notes',
        rrr: 'rrr', riskDollars: 'risk_dollars',
        ruleChecklist: 'rule_checklist', ruleScore: 'rule_score',
        revisionNotes: 'revision_notes', revisionTakeaway: 'revision_takeaway',
        revisionWouldTakeAgain: 'revision_would_take_again',
        revisionRating: 'revision_rating', revisedAt: 'revised_at',
      };
      Object.entries(fields).forEach(([k, v]) => {
        const dbKey = map[k] || k;
        dbFields[dbKey] = k === 'partialCloses' ? JSON.parse(JSON.stringify(v)) : v;
      });
      const { error } = await supabase.from('trades').update(dbFields).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trades'] }),
  });
};
