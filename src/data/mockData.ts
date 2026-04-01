import { Trade, PsychologyLog, TradingRule, AccountSettings, DailyPnL } from '@/types/trade';

export const defaultAccountSettings: AccountSettings = {
  startingBalance: 10000,
  currentBalance: 10000,
  currency: 'USD',
  maxRiskPercent: 1,
  dailyLossLimit: 500,
  maxTradesPerDay: 3,
};

export const smcTagOptions = ['Order Block', 'FVG', 'BOS', 'CHoCH', 'Liquidity Sweep', 'Breaker Block', 'Mitigation Block', 'Premium/Discount', 'EQL', 'EQH', 'Inducement'];
export const mistakeOptions = ['Early Entry', 'Late Entry', 'Ignored HTF', 'Moved SL', 'No Confirmation', 'Revenge Trade', 'Oversize Position', 'Fought the trend', 'Moved SL to BE too early'];
export const pairOptions = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'GBP/JPY', 'USD/CAD', 'AUD/USD', 'NZD/USD', 'EUR/GBP', 'XAU/USD', 'US30', 'NAS100'];
export const strategyOptions = ['Order Block + FVG', 'Liquidity Sweep', 'Breaker Block', 'FVG Rejection', 'CHoCH + OB', 'Market Structure Shift'];
