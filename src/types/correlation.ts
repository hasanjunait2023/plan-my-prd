export interface CurrencyStrengthRecord {
  id: string;
  currency: string;
  strength: number;
  category: string;
  timeframe: string;
  recorded_at: string;
  created_at: string;
}

export type StrengthCategory = 'STRONG' | 'MID STRONG' | 'NEUTRAL' | 'MID WEAK' | 'WEAK';

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
  'MID STRONG': 'hsl(100, 60%, 45%)',
  'NEUTRAL': 'hsl(48, 96%, 53%)',
  'MID WEAK': 'hsl(25, 95%, 53%)',
  'WEAK': 'hsl(0, 84%, 60%)',
};

export function generatePairSuggestions(data: CurrencyStrengthRecord[]): PairSuggestion[] {
  if (data.length < 2) return [];
  const sorted = [...data].sort((a, b) => b.strength - a.strength);
  const strong = sorted.filter(c => c.strength > 0);
  const weak = sorted.filter(c => c.strength < 0).reverse(); // weakest first

  const suggestions: PairSuggestion[] = [];

  // BUY pairs: strong base / weak quote
  for (const s of strong.slice(0, 3)) {
    for (const w of weak.slice(0, 2)) {
      suggestions.push({
        pair: `${s.currency}/${w.currency}`,
        direction: 'BUY',
        strongCurrency: s.currency,
        weakCurrency: w.currency,
        strengthDiff: s.strength - w.strength,
      });
    }
  }

  // SELL pairs: weak base / strong quote
  for (const w of weak.slice(0, 3)) {
    for (const s of strong.slice(0, 2)) {
      suggestions.push({
        pair: `${w.currency}/${s.currency}`,
        direction: 'SELL',
        strongCurrency: s.currency,
        weakCurrency: w.currency,
        strengthDiff: s.strength - w.strength,
      });
    }
  }

  // Sort by strength difference and take top suggestions
  return suggestions.sort((a, b) => b.strengthDiff - a.strengthDiff);
}
