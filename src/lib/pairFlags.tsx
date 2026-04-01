const CURRENCY_FLAGS: Record<string, string> = {
  EUR: '🇪🇺',
  USD: '🇺🇸',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  AUD: '🇦🇺',
  NZD: '🇳🇿',
  CAD: '🇨🇦',
  CHF: '🇨🇭',
  XAU: '🥇',
  XAG: '🥈',
  BTC: '₿',
  HKD: '🇭🇰',
  SGD: '🇸🇬',
  SEK: '🇸🇪',
  NOK: '🇳🇴',
  MXN: '🇲🇽',
  ZAR: '🇿🇦',
  OIL: '🛢️',
  USO: '🛢️',
};

export function getPairFlags(pair: string): { base: string; quote: string } {
  // Handle formats: "EURUSD", "EUR/USD", "EURUSD"
  const clean = pair.replace(/[^A-Za-z]/g, '').toUpperCase();
  const base = clean.slice(0, 3);
  const quote = clean.slice(3, 6);
  return {
    base: CURRENCY_FLAGS[base] || '',
    quote: CURRENCY_FLAGS[quote] || '',
  };
}

export function formatPairWithFlags(pair: string): string {
  const { base, quote } = getPairFlags(pair);
  return `${base}${quote} ${pair}`;
}

interface PairWithFlagsProps {
  pair: string;
  className?: string;
}

export function PairWithFlags({ pair, className = '' }: PairWithFlagsProps) {
  const { base, quote } = getPairFlags(pair);
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="text-[0.85em]">{base}{quote}</span>
      <span>{pair}</span>
    </span>
  );
}
