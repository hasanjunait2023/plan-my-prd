export type Direction = 'LONG' | 'SHORT';
export type TradeOutcome = 'WIN' | 'LOSS' | 'BREAKEVEN';
export type TradeStatus = 'PENDING' | 'CLOSED';
export type Session = 'Asian' | 'London' | 'New York' | 'London Close';
export type Timeframe = '1M' | '5M' | '15M' | '1H' | '4H' | 'D' | 'W';
export type PsychEmotion = 'Confident' | 'Fearful' | 'Greedy' | 'Calm' | 'Anxious' | 'Revenge' | 'FOMO' | 'Patient' | 'Frustrated';

export interface RuleCheck {
  ruleId: string;
  ruleText: string;
  followed: boolean;
  explanation: string;
}

export interface PartialClose {
  id: string;
  lots: number;
  exitPrice: number;
  pnl: number;
}

export interface Trade {
  id: string;
  date: string;
  pair: string;
  direction: Direction;
  session: Session;
  timeframe: Timeframe;
  strategy: string;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  riskPercent: number;
  riskDollars: number;
  rrr: number;
  pnl: number;
  pips: number;
  outcome: TradeOutcome;
  smcTags: string[];
  mistakes: string[];
  psychologyState: number; // 1-10
  psychologyEmotion: PsychEmotion;
  planAdherence: boolean;
  preTradeNotes: string;
  postTradeNotes: string;
  reasonForEntry: string;
  confidenceLevel: number; // 1-10
  preSituation: string;
  duringSituation: string;
  postSituation: string;
  whatWentWell: string;
  improvementNotes: string;
  entryScreenshots: string[];
  exitScreenshots: string[];
  screenshots: string[];
  partialCloses: PartialClose[];
  status: TradeStatus;
  starred: boolean;
  createdAt: string;
}

export interface PsychologyLog {
  id: string;
  date: string;
  mentalState: number; // 1-10
  sleepQuality: number; // 1-10
  lifeStress: number; // 1-10
  intention: string;
  reflection: string;
  ruleAdherence: boolean;
  emotions: PsychEmotion[];
  overallScore: number;
}

export interface TradingRule {
  id: string;
  text: string;
  active: boolean;
}

export interface AccountSettings {
  startingBalance: number;
  currentBalance: number;
  currency: string;
  maxRiskPercent: number;
  dailyLossLimit: number;
  maxTradesPerDay: number;
}

export interface DailyPnL {
  date: string;
  pnl: number;
  trades: number;
}

export interface WeeklyStats {
  weekStart: string;
  pnl: number;
  winRate: number;
  trades: number;
}
