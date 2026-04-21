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
  restricted?: boolean; // true when both currencies share same extreme tier (avoid trading)
  restrictedReason?: 'BOTH_STRONG' | 'BOTH_WEAK';
}

// Currency strength tiers
type Tier = 'STRONG' | 'MED_STRONG' | 'NEUTRAL' | 'MID_WEAK' | 'WEAK';

const STRENGTH_TIERS = {
  STRONG: 5,
  MED_STRONG: 2,
  NEUTRAL_LOW: -2,
  MID_WEAK_LOW: -5,
} as const;

function tierOf(s: number): Tier {
  if (s >= STRENGTH_TIERS.STRONG) return 'STRONG';
  if (s >= STRENGTH_TIERS.MED_STRONG) return 'MED_STRONG';
  if (s > STRENGTH_TIERS.NEUTRAL_LOW) return 'NEUTRAL';
  if (s > STRENGTH_TIERS.MID_WEAK_LOW) return 'MID_WEAK';
  return 'WEAK';
}

// Quote/base "non-strong" — i.e. NEUTRAL or weaker (qualifies as a target for a strong base buy)
function isNonStrong(t: Tier): boolean {
  return t === 'NEUTRAL' || t === 'MID_WEAK' || t === 'WEAK';
}

/**
 * Calculate bias using STRICT major-currency logic.
 * A real BUY/SELL signal requires ONE currency to be strong (or medium-strong)
 * AND the other to be neutral/weak. Two strong or two weak currencies → Neutral.
 *
 * Falls back to differential-only logic when base/quote strengths are not provided
 * (e.g. non-forex pairs like XAUUSD/BTCUSD).
 */
export function calculateBias(
  diff: number,
  baseStrength?: number,
  quoteStrength?: number,
): BiasInfo {
  // Fallback: non-forex pair → use diff-only logic
  if (baseStrength === undefined || quoteStrength === undefined) {
    return calculateBiasFromDiff(diff);
  }

  const baseTier = tierOf(baseStrength);
  const quoteTier = tierOf(quoteStrength);

  // Decision matrix (in priority order)
  // 1. Strong base vs non-strong quote → HQ BUY
  if (baseTier === 'STRONG' && isNonStrong(quoteTier)) {
    return makeBias('HIGH', 'BUY');
  }
  // 2. Strong quote vs non-strong base → HQ SELL
  if (quoteTier === 'STRONG' && isNonStrong(baseTier)) {
    return makeBias('HIGH', 'SELL');
  }
  // 3. Med-strong base vs non-strong quote → MED BUY
  if (baseTier === 'MED_STRONG' && isNonStrong(quoteTier)) {
    return makeBias('MEDIUM', 'BUY');
  }
  // 4. Med-strong quote vs non-strong base → MED SELL
  if (quoteTier === 'MED_STRONG' && isNonStrong(baseTier)) {
    return makeBias('MEDIUM', 'SELL');
  }
  // 5. Weak quote drives a buy when base is at least neutral
  if (quoteTier === 'WEAK' && (baseTier === 'NEUTRAL' || baseTier === 'MED_STRONG' || baseTier === 'STRONG')) {
    return makeBias('MEDIUM', 'BUY');
  }
  // 6. Weak base drives a sell when quote is at least neutral
  if (baseTier === 'WEAK' && (quoteTier === 'NEUTRAL' || quoteTier === 'MED_STRONG' || quoteTier === 'STRONG')) {
    return makeBias('MEDIUM', 'SELL');
  }
  // 7. Everything else → Neutral
  return makeNeutral();
}

/** Legacy diff-only path for non-forex pairs. */
function calculateBiasFromDiff(diff: number): BiasInfo {
  const abs = Math.abs(diff);
  if (abs < BIAS_THRESHOLDS.MEDIUM) return makeNeutral();
  const isBuy = diff > 0;
  const tier: 'HIGH' | 'MEDIUM' = abs >= BIAS_THRESHOLDS.HIGH ? 'HIGH' : 'MEDIUM';
  return makeBias(tier, isBuy ? 'BUY' : 'SELL');
}

function makeBias(tier: 'HIGH' | 'MEDIUM', dir: 'BUY' | 'SELL'): BiasInfo {
  const isBuy = dir === 'BUY';
  if (tier === 'HIGH') {
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

function makeNeutral(): BiasInfo {
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

export const BIAS_FILTER_OPTIONS: Array<{ value: BiasQuality | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'HIGH_BUY', label: 'High Quality Buy' },
  { value: 'MEDIUM_BUY', label: 'Medium Buy' },
  { value: 'NEUTRAL', label: 'Neutral' },
  { value: 'MEDIUM_SELL', label: 'Medium Sell' },
  { value: 'HIGH_SELL', label: 'High Quality Sell' },
];
