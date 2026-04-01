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
