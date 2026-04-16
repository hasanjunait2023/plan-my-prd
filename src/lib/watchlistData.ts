export type WatchlistCategory =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'AUD'
  | 'NZD'
  | 'CAD'
  | 'CHF'
  | 'JPY'
  | 'METALS'
  | 'CRYPTO';

export interface WatchlistItem {
  category: WatchlistCategory;
  symbol: string;     // e.g. EURUSD
  name: string;       // human-readable
  tvSymbol: string;   // TradingView symbol
}

// All 28 major/cross forex pairs + commodities + crypto
export const WATCHLIST: WatchlistItem[] = [
  // USD majors
  { category: 'USD', symbol: 'EURUSD', name: 'Euro / U.S. Dollar', tvSymbol: 'OANDA:EURUSD' },
  { category: 'USD', symbol: 'GBPUSD', name: 'British Pound / U.S. Dollar', tvSymbol: 'OANDA:GBPUSD' },
  { category: 'USD', symbol: 'AUDUSD', name: 'Australian Dollar / U.S. Dollar', tvSymbol: 'OANDA:AUDUSD' },
  { category: 'USD', symbol: 'NZDUSD', name: 'New Zealand Dollar / U.S. Dollar', tvSymbol: 'OANDA:NZDUSD' },
  { category: 'USD', symbol: 'USDJPY', name: 'U.S. Dollar / Japanese Yen', tvSymbol: 'OANDA:USDJPY' },
  { category: 'USD', symbol: 'USDCAD', name: 'U.S. Dollar / Canadian Dollar', tvSymbol: 'OANDA:USDCAD' },
  { category: 'USD', symbol: 'USDCHF', name: 'U.S. Dollar / Swiss Franc', tvSymbol: 'OANDA:USDCHF' },

  // EUR crosses
  { category: 'EUR', symbol: 'EURGBP', name: 'Euro / British Pound', tvSymbol: 'OANDA:EURGBP' },
  { category: 'EUR', symbol: 'EURJPY', name: 'Euro / Japanese Yen', tvSymbol: 'OANDA:EURJPY' },
  { category: 'EUR', symbol: 'EURAUD', name: 'Euro / Australian Dollar', tvSymbol: 'OANDA:EURAUD' },
  { category: 'EUR', symbol: 'EURNZD', name: 'Euro / New Zealand Dollar', tvSymbol: 'OANDA:EURNZD' },
  { category: 'EUR', symbol: 'EURCAD', name: 'Euro / Canadian Dollar', tvSymbol: 'OANDA:EURCAD' },
  { category: 'EUR', symbol: 'EURCHF', name: 'Euro / Swiss Franc', tvSymbol: 'OANDA:EURCHF' },

  // GBP crosses
  { category: 'GBP', symbol: 'GBPJPY', name: 'British Pound / Japanese Yen', tvSymbol: 'OANDA:GBPJPY' },
  { category: 'GBP', symbol: 'GBPAUD', name: 'British Pound / Australian Dollar', tvSymbol: 'OANDA:GBPAUD' },
  { category: 'GBP', symbol: 'GBPNZD', name: 'British Pound / New Zealand Dollar', tvSymbol: 'OANDA:GBPNZD' },
  { category: 'GBP', symbol: 'GBPCAD', name: 'British Pound / Canadian Dollar', tvSymbol: 'OANDA:GBPCAD' },
  { category: 'GBP', symbol: 'GBPCHF', name: 'British Pound / Swiss Franc', tvSymbol: 'OANDA:GBPCHF' },

  // AUD crosses
  { category: 'AUD', symbol: 'AUDJPY', name: 'Australian Dollar / Japanese Yen', tvSymbol: 'OANDA:AUDJPY' },
  { category: 'AUD', symbol: 'AUDNZD', name: 'Australian Dollar / New Zealand Dollar', tvSymbol: 'OANDA:AUDNZD' },
  { category: 'AUD', symbol: 'AUDCAD', name: 'Australian Dollar / Canadian Dollar', tvSymbol: 'OANDA:AUDCAD' },
  { category: 'AUD', symbol: 'AUDCHF', name: 'Australian Dollar / Swiss Franc', tvSymbol: 'OANDA:AUDCHF' },

  // NZD crosses
  { category: 'NZD', symbol: 'NZDJPY', name: 'New Zealand Dollar / Japanese Yen', tvSymbol: 'OANDA:NZDJPY' },
  { category: 'NZD', symbol: 'NZDCAD', name: 'New Zealand Dollar / Canadian Dollar', tvSymbol: 'OANDA:NZDCAD' },
  { category: 'NZD', symbol: 'NZDCHF', name: 'New Zealand Dollar / Swiss Franc', tvSymbol: 'OANDA:NZDCHF' },

  // CAD crosses
  { category: 'CAD', symbol: 'CADJPY', name: 'Canadian Dollar / Japanese Yen', tvSymbol: 'OANDA:CADJPY' },
  { category: 'CAD', symbol: 'CADCHF', name: 'Canadian Dollar / Swiss Franc', tvSymbol: 'OANDA:CADCHF' },

  // CHF cross
  { category: 'CHF', symbol: 'CHFJPY', name: 'Swiss Franc / Japanese Yen', tvSymbol: 'OANDA:CHFJPY' },

  // Metals & commodities
  { category: 'METALS', symbol: 'XAUUSD', name: 'Gold / U.S. Dollar', tvSymbol: 'OANDA:XAUUSD' },
  { category: 'METALS', symbol: 'XAGUSD', name: 'Silver / U.S. Dollar', tvSymbol: 'OANDA:XAGUSD' },
  { category: 'METALS', symbol: 'USOIL', name: 'WTI Crude Oil', tvSymbol: 'TVC:USOIL' },

  // Crypto
  { category: 'CRYPTO', symbol: 'BTCUSD', name: 'Bitcoin / U.S. Dollar', tvSymbol: 'BITSTAMP:BTCUSD' },
  { category: 'CRYPTO', symbol: 'ETHUSD', name: 'Ethereum / U.S. Dollar', tvSymbol: 'BITSTAMP:ETHUSD' },
  { category: 'CRYPTO', symbol: 'SOLUSD', name: 'Solana / U.S. Dollar', tvSymbol: 'COINBASE:SOLUSD' },
];

export const WATCHLIST_CATEGORIES: { key: WatchlistCategory | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All Pair' },
  { key: 'USD', label: 'USD' },
  { key: 'EUR', label: 'EUR' },
  { key: 'GBP', label: 'GBP' },
  { key: 'AUD', label: 'AUD' },
  { key: 'NZD', label: 'NZD' },
  { key: 'CAD', label: 'CAD' },
  { key: 'CHF', label: 'CHF' },
  { key: 'JPY', label: 'JPY' },
  { key: 'METALS', label: 'Metals' },
  { key: 'CRYPTO', label: 'Crypto' },
];

export function findWatchlistItem(symbol: string): WatchlistItem | undefined {
  return WATCHLIST.find((w) => w.symbol === symbol);
}
