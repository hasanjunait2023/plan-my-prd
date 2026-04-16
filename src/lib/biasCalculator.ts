// Bias quality classification based on strength differential between two currencies

export type BiasQuality = 'HIGH_BUY' | 'MEDIUM_BUY' | 'NEUTRAL' | 'MEDIUM_SELL' | 'HIGH_SELL';

export const BIAS_THRESHOLDS = {
  HIGH: 3,
  MEDIUM: 1.5,
} as const;

export interface BiasInfo {
  quality: BiasQuality;
  label: string;
  shortLabel: string;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  color: string;        // hsl color for text/icon
  bgColor: string;      // hsla translucent bg
  borderColor: string;  // hsla translucent border
  rank: number;         // higher = stronger conviction (used for sorting)
}

/**
 * Calculate bias from a strength differential (base − quote).
 * Positive diff → BUY bias, negative → SELL bias.
 */
export function calculateBias(diff: number): BiasInfo {
  const abs = Math.abs(diff);

  if (abs < BIAS_THRESHOLDS.MEDIUM) {
    return {
      quality: 'NEUTRAL',
      label: 'Neutral',
      shortLabel: 'NEUT',
      direction: 'NEUTRAL',
      color: 'hsl(48, 96%, 53%)',
      bgColor: 'hsla(48, 96%, 53%, 0.12)',
      borderColor: 'hsla(48, 96%, 53%, 0.25)',
      rank: 0,
    };
  }

  const isBuy = diff > 0;

  if (abs >= BIAS_THRESHOLDS.HIGH) {
    return isBuy
      ? {
          quality: 'HIGH_BUY',
          label: 'High Quality Buy',
          shortLabel: 'HQ BUY',
          direction: 'BUY',
          color: 'hsl(142, 76%, 50%)',
          bgColor: 'hsla(142, 76%, 50%, 0.18)',
          borderColor: 'hsla(142, 76%, 50%, 0.4)',
          rank: 4,
        }
      : {
          quality: 'HIGH_SELL',
          label: 'High Quality Sell',
          shortLabel: 'HQ SELL',
          direction: 'SELL',
          color: 'hsl(0, 84%, 62%)',
          bgColor: 'hsla(0, 84%, 62%, 0.18)',
          borderColor: 'hsla(0, 84%, 62%, 0.4)',
          rank: 4,
        };
  }

  // MEDIUM
  return isBuy
    ? {
        quality: 'MEDIUM_BUY',
        label: 'Medium Buy',
        shortLabel: 'MED BUY',
        direction: 'BUY',
        color: 'hsl(142, 60%, 55%)',
        bgColor: 'hsla(142, 60%, 55%, 0.12)',
        borderColor: 'hsla(142, 60%, 55%, 0.25)',
        rank: 2,
      }
    : {
        quality: 'MEDIUM_SELL',
        label: 'Medium Sell',
        shortLabel: 'MED SELL',
        direction: 'SELL',
        color: 'hsl(15, 85%, 60%)',
        bgColor: 'hsla(15, 85%, 60%, 0.12)',
        borderColor: 'hsla(15, 85%, 60%, 0.25)',
        rank: 2,
      };
}

export const BIAS_FILTER_OPTIONS: Array<{ value: BiasQuality | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'HIGH_BUY', label: 'High Quality Buy' },
  { value: 'MEDIUM_BUY', label: 'Medium Buy' },
  { value: 'NEUTRAL', label: 'Neutral' },
  { value: 'MEDIUM_SELL', label: 'Medium Sell' },
  { value: 'HIGH_SELL', label: 'High Quality Sell' },
];
