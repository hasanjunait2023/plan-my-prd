import { Trade, PsychologyLog, TradingRule, AccountSettings, DailyPnL } from '@/types/trade';

export const mockAccountSettings: AccountSettings = {
  startingBalance: 10000,
  currentBalance: 12450,
  currency: 'USD',
  maxRiskPercent: 2,
  dailyLossLimit: 500,
  maxTradesPerDay: 5,
};

export const mockRules: TradingRule[] = [
  { id: '1', text: 'Never risk more than 2% per trade', active: true },
  { id: '2', text: 'Always wait for confirmation before entry', active: true },
  { id: '3', text: 'No trading during high-impact news within 15 min', active: true },
  { id: '4', text: 'Maximum 3 trades per session', active: true },
  { id: '5', text: 'Stop trading after 2 consecutive losses', active: true },
  { id: '6', text: 'Always set stop loss before entry', active: true },
  { id: '7', text: 'No revenge trades — walk away after a loss', active: true },
  { id: '8', text: 'Only trade A+ setups from the playbook', active: true },
];

export const mockTrades: Trade[] = [
  {
    id: '1', date: '2026-03-31', pair: 'EUR/USD', direction: 'LONG', session: 'London',
    timeframe: '15M', strategy: 'Order Block + FVG', entryPrice: 1.0825, exitPrice: 1.0870,
    stopLoss: 1.0800, takeProfit: 1.0875, lotSize: 0.5, riskPercent: 1.5, riskDollars: 187.5,
    rrr: 1.8, pnl: 225, pips: 45, outcome: 'WIN', smcTags: ['Order Block', 'FVG', 'BOS'],
    mistakes: [], psychologyState: 8, psychologyEmotion: 'Confident', planAdherence: true,
    preTradeNotes: 'Clean OB on 15M with FVG confluence. London session open sweep.',
    postTradeNotes: 'Executed well, held to TP. Good patience.', screenshots: [],
    partialCloses: [], starred: true, createdAt: '2026-03-31T10:30:00Z',
  },
  {
    id: '2', date: '2026-03-31', pair: 'GBP/USD', direction: 'SHORT', session: 'New York',
    timeframe: '1H', strategy: 'Liquidity Sweep', entryPrice: 1.2950, exitPrice: 1.2980,
    stopLoss: 1.2920, takeProfit: 1.2880, lotSize: 0.3, riskPercent: 1, riskDollars: 125,
    rrr: 2.3, pnl: -90, pips: -30, outcome: 'LOSS', smcTags: ['Liquidity Sweep', 'CHoCH'],
    mistakes: ['Early Entry', 'Ignored HTF'], psychologyState: 5, psychologyEmotion: 'FOMO',
    planAdherence: false, preTradeNotes: 'Saw liquidity sweep on 1H but didn\'t wait for CHoCH confirmation.',
    postTradeNotes: 'Entered too early. Need to wait for full confirmation.', screenshots: [],
    partialCloses: [], starred: false, createdAt: '2026-03-31T15:00:00Z',
  },
  {
    id: '3', date: '2026-03-30', pair: 'USD/JPY', direction: 'LONG', session: 'Asian',
    timeframe: '4H', strategy: 'Breaker Block', entryPrice: 150.20, exitPrice: 150.85,
    stopLoss: 149.80, takeProfit: 151.00, lotSize: 0.4, riskPercent: 1.5, riskDollars: 160,
    rrr: 2.0, pnl: 260, pips: 65, outcome: 'WIN', smcTags: ['Breaker Block', 'Premium/Discount'],
    mistakes: [], psychologyState: 9, psychologyEmotion: 'Patient', planAdherence: true,
    preTradeNotes: 'Beautiful breaker block in discount zone on 4H.', postTradeNotes: 'Perfect execution. Partial at 1:1, rest at TP.',
    screenshots: [], partialCloses: [{ id: 'p1', lots: 0.2, exitPrice: 150.60, pnl: 80 }],
    starred: true, createdAt: '2026-03-30T04:00:00Z',
  },
  {
    id: '4', date: '2026-03-29', pair: 'EUR/USD', direction: 'SHORT', session: 'London Close',
    timeframe: '15M', strategy: 'FVG Rejection', entryPrice: 1.0860, exitPrice: 1.0860,
    stopLoss: 1.0880, takeProfit: 1.0820, lotSize: 0.5, riskPercent: 1, riskDollars: 100,
    rrr: 2.0, pnl: 0, pips: 0, outcome: 'BREAKEVEN', smcTags: ['FVG'],
    mistakes: ['Moved SL to BE too early'], psychologyState: 6, psychologyEmotion: 'Anxious',
    planAdherence: true, preTradeNotes: 'FVG rejection at London close session.',
    postTradeNotes: 'Moved SL to BE after small move, got stopped out. Should have given more room.',
    screenshots: [], partialCloses: [], starred: false, createdAt: '2026-03-29T16:00:00Z',
  },
  {
    id: '5', date: '2026-03-28', pair: 'XAU/USD', direction: 'LONG', session: 'New York',
    timeframe: '1H', strategy: 'Order Block + FVG', entryPrice: 2180.50, exitPrice: 2195.00,
    stopLoss: 2175.00, takeProfit: 2200.00, lotSize: 0.2, riskPercent: 2, riskDollars: 250,
    rrr: 2.6, pnl: 290, pips: 145, outcome: 'WIN', smcTags: ['Order Block', 'FVG', 'EQL'],
    mistakes: [], psychologyState: 8, psychologyEmotion: 'Calm', planAdherence: true,
    preTradeNotes: 'Strong OB with FVG on Gold. EQL below taken before reversal.',
    postTradeNotes: 'Great trade. Held through pullback with conviction.',
    screenshots: [], partialCloses: [], starred: true, createdAt: '2026-03-28T14:30:00Z',
  },
  {
    id: '6', date: '2026-03-27', pair: 'GBP/JPY', direction: 'SHORT', session: 'London',
    timeframe: '15M', strategy: 'Liquidity Sweep', entryPrice: 191.50, exitPrice: 191.80,
    stopLoss: 191.20, takeProfit: 190.80, lotSize: 0.3, riskPercent: 1.5, riskDollars: 180,
    rrr: 2.3, pnl: -90, pips: -30, outcome: 'LOSS', smcTags: ['Liquidity Sweep'],
    mistakes: ['Fought the trend'], psychologyState: 4, psychologyEmotion: 'Revenge',
    planAdherence: false, preTradeNotes: 'Saw sweep but overall trend was bullish.',
    postTradeNotes: 'Revenge trade after previous loss. Should have sat out.',
    screenshots: [], partialCloses: [], starred: false, createdAt: '2026-03-27T09:00:00Z',
  },
  {
    id: '7', date: '2026-03-26', pair: 'EUR/USD', direction: 'LONG', session: 'New York',
    timeframe: '1H', strategy: 'Breaker Block', entryPrice: 1.0790, exitPrice: 1.0835,
    stopLoss: 1.0765, takeProfit: 1.0840, lotSize: 0.5, riskPercent: 1.5, riskDollars: 125,
    rrr: 2.0, pnl: 225, pips: 45, outcome: 'WIN', smcTags: ['Breaker Block', 'BOS'],
    mistakes: [], psychologyState: 7, psychologyEmotion: 'Confident', planAdherence: true,
    preTradeNotes: 'Breaker block with BOS confirmation on 1H.', postTradeNotes: 'Clean execution.',
    screenshots: [], partialCloses: [], starred: false, createdAt: '2026-03-26T14:00:00Z',
  },
  {
    id: '8', date: '2026-03-25', pair: 'USD/CAD', direction: 'SHORT', session: 'New York',
    timeframe: '4H', strategy: 'Order Block + FVG', entryPrice: 1.3620, exitPrice: 1.3570,
    stopLoss: 1.3650, takeProfit: 1.3550, lotSize: 0.4, riskPercent: 1, riskDollars: 120,
    rrr: 2.3, pnl: 200, pips: 50, outcome: 'WIN', smcTags: ['Order Block', 'FVG', 'Premium/Discount'],
    mistakes: [], psychologyState: 8, psychologyEmotion: 'Patient', planAdherence: true,
    preTradeNotes: 'OB in premium zone with FVG confluence.',
    postTradeNotes: 'Waited patiently for price to reach OB. Rewarded.',
    screenshots: [], partialCloses: [], starred: false, createdAt: '2026-03-25T15:30:00Z',
  },
];

export const mockPsychologyLogs: PsychologyLog[] = [
  { id: '1', date: '2026-03-31', mentalState: 7, sleepQuality: 8, lifeStress: 3, intention: 'Focus on A+ setups only', reflection: 'Good day overall. One FOMO trade brought me down.', ruleAdherence: false, emotions: ['Confident', 'FOMO'], overallScore: 7 },
  { id: '2', date: '2026-03-30', mentalState: 9, sleepQuality: 9, lifeStress: 2, intention: 'Patient execution', reflection: 'Excellent day. Waited for the setup and it paid off.', ruleAdherence: true, emotions: ['Patient', 'Calm'], overallScore: 9 },
  { id: '3', date: '2026-03-29', mentalState: 6, sleepQuality: 6, lifeStress: 5, intention: 'Conservative approach', reflection: 'Moved SL too early out of anxiety. Need to trust the setup.', ruleAdherence: true, emotions: ['Anxious'], overallScore: 6 },
  { id: '4', date: '2026-03-28', mentalState: 8, sleepQuality: 7, lifeStress: 3, intention: 'Trade Gold if setup appears', reflection: 'Great gold trade. Held through the pullback.', ruleAdherence: true, emotions: ['Calm', 'Confident'], overallScore: 8 },
  { id: '5', date: '2026-03-27', mentalState: 4, sleepQuality: 5, lifeStress: 7, intention: 'Should have taken the day off', reflection: 'Revenge traded after a loss. Broke my rules. Bad day.', ruleAdherence: false, emotions: ['Revenge', 'Frustrated'], overallScore: 3 },
  { id: '6', date: '2026-03-26', mentalState: 7, sleepQuality: 8, lifeStress: 3, intention: 'Follow the process', reflection: 'Solid day. Followed the plan.', ruleAdherence: true, emotions: ['Confident'], overallScore: 7 },
  { id: '7', date: '2026-03-25', mentalState: 8, sleepQuality: 8, lifeStress: 2, intention: 'Wait for 4H setup', reflection: 'Patient approach paid off with USD/CAD short.', ruleAdherence: true, emotions: ['Patient'], overallScore: 8 },
];

export const mockDailyPnL: DailyPnL[] = [
  { date: '2026-03-25', pnl: 200, trades: 1 },
  { date: '2026-03-26', pnl: 225, trades: 1 },
  { date: '2026-03-27', pnl: -90, trades: 1 },
  { date: '2026-03-28', pnl: 290, trades: 1 },
  { date: '2026-03-29', pnl: 0, trades: 1 },
  { date: '2026-03-30', pnl: 260, trades: 1 },
  { date: '2026-03-31', pnl: 135, trades: 2 },
];

export const smcTagOptions = ['Order Block', 'FVG', 'BOS', 'CHoCH', 'Liquidity Sweep', 'Breaker Block', 'Mitigation Block', 'Premium/Discount', 'EQL', 'EQH', 'Inducement'];
export const mistakeOptions = ['Early Entry', 'Late Entry', 'Ignored HTF', 'Moved SL', 'No Confirmation', 'Revenge Trade', 'Oversize Position', 'Fought the trend', 'Moved SL to BE too early'];
export const pairOptions = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'GBP/JPY', 'USD/CAD', 'AUD/USD', 'NZD/USD', 'EUR/GBP', 'XAU/USD', 'US30', 'NAS100'];
export const strategyOptions = ['Order Block + FVG', 'Liquidity Sweep', 'Breaker Block', 'FVG Rejection', 'CHoCH + OB', 'Market Structure Shift'];
