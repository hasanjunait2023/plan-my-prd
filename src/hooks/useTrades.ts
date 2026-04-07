import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TablesUpdate } from '@/integrations/supabase/types';
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

type TradeUpdateInput = {
  id: string;
} & Partial<
  Pick<
    Trade,
    | 'exitPrice'
    | 'pnl'
    | 'pips'
    | 'outcome'
    | 'status'
    | 'exitScreenshots'
    | 'duringSituation'
    | 'postSituation'
    | 'whatWentWell'
    | 'improvementNotes'
    | 'mistakes'
    | 'partialCloses'
    | 'postTradeNotes'
    | 'rrr'
    | 'riskDollars'
    | 'ruleChecklist'
    | 'ruleScore'
    | 'revisionNotes'
    | 'revisionTakeaway'
    | 'revisionWouldTakeAgain'
    | 'revisionRating'
    | 'revisedAt'
  >
>;

const buildTradeUpdate = (fields: Omit<TradeUpdateInput, 'id'>): TablesUpdate<'trades'> => {
  const update: TablesUpdate<'trades'> = {};

  if (fields.exitPrice !== undefined) update.exit_price = fields.exitPrice;
  if (fields.pnl !== undefined) update.pnl = fields.pnl;
  if (fields.pips !== undefined) update.pips = fields.pips;
  if (fields.outcome !== undefined) update.outcome = fields.outcome;
  if (fields.status !== undefined) update.status = fields.status;
  if (fields.exitScreenshots !== undefined) update.exit_screenshots = fields.exitScreenshots;
  if (fields.duringSituation !== undefined) update.during_situation = fields.duringSituation;
  if (fields.postSituation !== undefined) update.post_situation = fields.postSituation;
  if (fields.whatWentWell !== undefined) update.what_went_well = fields.whatWentWell;
  if (fields.improvementNotes !== undefined) update.improvement_notes = fields.improvementNotes;
  if (fields.mistakes !== undefined) update.mistakes = fields.mistakes;
  if (fields.partialCloses !== undefined) {
    update.partial_closes = JSON.parse(JSON.stringify(fields.partialCloses));
  }
  if (fields.postTradeNotes !== undefined) update.post_trade_notes = fields.postTradeNotes;
  if (fields.rrr !== undefined) update.rrr = fields.rrr;
  if (fields.riskDollars !== undefined) update.risk_dollars = fields.riskDollars;
  if (fields.ruleChecklist !== undefined) {
    update.rule_checklist = JSON.parse(JSON.stringify(fields.ruleChecklist));
  }
  if (fields.ruleScore !== undefined) update.rule_score = fields.ruleScore;
  if (fields.revisionNotes !== undefined) update.revision_notes = fields.revisionNotes;
  if (fields.revisionTakeaway !== undefined) update.revision_takeaway = fields.revisionTakeaway;
  if (fields.revisionWouldTakeAgain !== undefined) {
    update.revision_would_take_again = fields.revisionWouldTakeAgain;
  }
  if (fields.revisionRating !== undefined) update.revision_rating = fields.revisionRating;
  if (fields.revisedAt !== undefined) update.revised_at = fields.revisedAt;

  return update;
};

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
    mutationFn: async ({ id, ...fields }: TradeUpdateInput) => {
      const { error } = await supabase.from('trades').update(buildTradeUpdate(fields)).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trades'] }),
  });
};