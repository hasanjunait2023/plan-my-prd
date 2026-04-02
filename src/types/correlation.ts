export interface CurrencyStrengthRecord {
  id: string;
  currency: string;
  strength: number;
  category: string;
  timeframe: string;
  recorded_at: string;
  created_at: string;
}

export type StrengthCategory = 'STRONG' | 'NEUTRAL' | 'MID WEAK' | 'WEAK';

export interface PairSuggestion {
  pair: string;
  direction: 'BUY' | 'SELL';
  strongCurrency: string;
  weakCurrency: string;
  strengthDiff: number;
}

export const CURRENCY_FLAGS: Record<string, string> = {
  EUR: '🇪🇺',
  USD: '🇺🇸',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  AUD: '🇦🇺',
  NZD: '🇳🇿',
  CAD: '🇨🇦',
  CHF: '🇨🇭',
};

export const CATEGORY_COLORS: Record<string, string> = {
  'STRONG': 'hsl(142, 71%, 45%)',
  'NEUTRAL': 'hsl(48, 96%, 53%)',
  'MID WEAK': 'hsl(25, 95%, 53%)',
  'WEAK': 'hsl(0, 84%, 60%)',
};

export const TRADEABLE_PAIRS = [
  'EUR/USD','EUR/GBP','EUR/JPY','EUR/AUD','EUR/NZD','EUR/CAD','EUR/CHF',
  'GBP/USD','GBP/JPY','GBP/AUD','GBP/NZD','GBP/CAD','GBP/CHF',
  'AUD/USD','AUD/JPY','AUD/NZD','AUD/CAD','AUD/CHF',
  'NZD/USD','NZD/JPY','NZD/CAD','NZD/CHF',
  'USD/JPY','USD/CAD','USD/CHF',
  'CAD/JPY','CAD/CHF',
  'CHF/JPY',
];

export function generatePairSuggestions(data: CurrencyStrengthRecord[]): PairSuggestion[] {
  if (data.length < 2) return [];

  const strengthMap = new Map<string, number>();
  for (const d of data) {
    strengthMap.set(d.currency, d.strength);
  }

  const suggestions: PairSuggestion[] = [];

  for (const pair of TRADEABLE_PAIRS) {
    const [base, quote] = pair.split('/');
    const baseStr = strengthMap.get(base);
    const quoteStr = strengthMap.get(quote);
    if (baseStr === undefined || quoteStr === undefined) continue;

    const diff = baseStr - quoteStr;
    const absDiff = Math.abs(diff);

    // Skip weak signals
    if (absDiff < 3) continue;

    if (diff > 0) {
      suggestions.push({
        pair,
        direction: 'BUY',
        strongCurrency: base,
        weakCurrency: quote,
        strengthDiff: absDiff,
      });
    } else {
      suggestions.push({
        pair,
        direction: 'SELL',
        strongCurrency: quote,
        weakCurrency: base,
        strengthDiff: absDiff,
      });
    }
  }

  return suggestions.sort((a, b) => b.strengthDiff - a.strengthDiff);
}
