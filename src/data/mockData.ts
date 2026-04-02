import { Trade, PsychologyLog, TradingRule, AccountSettings, DailyPnL } from '@/types/trade';

export const defaultAccountSettings: AccountSettings = {
  startingBalance: 10000,
  currentBalance: 10000,
  currency: 'USD',
  maxRiskPercent: 1,
  dailyLossLimit: 500,
  maxTradesPerDay: 3,
  allowedSessions: ['Asian', 'London', 'New York', 'London Close'],
  maxWinningTrades: 3,
  maxLosingTrades: 2,
  maxLotSize: 1.0,
  maxDrawdownPercent: 5,
  minConfidence: 5,
  minRrr: 1.5,
  minSmcTags: 1,
};

export const smcTagOptions = ['Order Block', 'FVG', 'BOS', 'CHoCH', 'Liquidity Sweep', 'Breaker Block', 'Mitigation Block', 'Premium/Discount', 'EQL', 'EQH', 'Inducement'];
export const mistakeOptions = ['Early Entry', 'Late Entry', 'Ignored HTF', 'Moved SL', 'No Confirmation', 'Revenge Trade', 'Oversize Position', 'Fought the trend', 'Moved SL to BE too early'];
export const pairOptions = [
  'EUR/USD','EUR/GBP','EUR/JPY','EUR/AUD','EUR/NZD','EUR/CAD','EUR/CHF',
  'GBP/USD','GBP/JPY','GBP/AUD','GBP/NZD','GBP/CAD','GBP/CHF',
  'USD/JPY','USD/CAD','USD/CHF',
  'AUD/USD','AUD/JPY','AUD/NZD','AUD/CAD','AUD/CHF',
  'NZD/USD','NZD/JPY','NZD/CAD','NZD/CHF',
  'CAD/JPY','CAD/CHF','CHF/JPY',
  'XAU/USD','US30','NAS100',
];
export const strategyOptions = ['Order Block + FVG', 'Liquidity Sweep', 'Breaker Block', 'FVG Rejection', 'CHoCH + OB', 'Market Structure Shift'];
