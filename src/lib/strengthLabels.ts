// Convert numeric strength values to full human-readable labels

export interface StrengthLabel {
  label: string;       // "Strong", "Medium Strong", etc.
  short: string;       // "S", "MS", etc.
  color: string;       // hsl color
  bgColor: string;     // hsla translucent
}

/**
 * Convert a numeric strength score to a full descriptive label.
 * Positive = stronger, negative = weaker.
 */
export function getStrengthLabel(strength: number): StrengthLabel {
  if (strength >= 5) {
    return {
      label: 'Strong',
      short: 'S',
      color: 'hsl(142, 76%, 50%)',
      bgColor: 'hsla(142, 76%, 50%, 0.15)',
    };
  }
  if (strength >= 2) {
    return {
      label: 'Medium Strong',
      short: 'MS',
      color: 'hsl(142, 55%, 55%)',
      bgColor: 'hsla(142, 55%, 55%, 0.12)',
    };
  }
  if (strength > -2) {
    return {
      label: 'Neutral',
      short: 'N',
      color: 'hsl(48, 96%, 53%)',
      bgColor: 'hsla(48, 96%, 53%, 0.12)',
    };
  }
  if (strength > -5) {
    return {
      label: 'Medium Weak',
      short: 'MW',
      color: 'hsl(25, 95%, 58%)',
      bgColor: 'hsla(25, 95%, 58%, 0.12)',
    };
  }
  return {
    label: 'Weak',
    short: 'W',
    color: 'hsl(0, 84%, 62%)',
    bgColor: 'hsla(0, 84%, 62%, 0.15)',
  };
}

/**
 * Format e.g. "EUR Strong" (full label) instead of "EUR S".
 */
export function formatCurrencyStrength(currency: string, strength: number): string {
  return `${currency} ${getStrengthLabel(strength).label}`;
}
