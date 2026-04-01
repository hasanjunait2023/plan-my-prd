export interface EmaAlignment {
  id: string;
  pair: string;
  direction: string;
  timeframe: string;
  ema_9: number;
  ema_15: number;
  ema_200: number;
  current_price: number;
  is_aligned: boolean;
  alignment_type: string;
  scan_batch_id: string;
  scanned_at: string;
  created_at: string;
}

export interface EmaScanNotification {
  id: string;
  pair: string;
  direction: string;
  alignment_score: number;
  message: string;
  is_read: boolean;
  scan_batch_id: string;
  created_at: string;
}

export interface PairAlignmentSummary {
  pair: string;
  direction: string;
  alignments: {
    '5min': { ema_9: boolean; ema_15: boolean; ema_200: boolean; aligned: boolean };
    '15min': { ema_9: boolean; ema_15: boolean; ema_200: boolean; aligned: boolean };
    '1h': { ema_9: boolean; ema_15: boolean; ema_200: boolean; aligned: boolean };
  };
  score: number;
  scanned_at: string;
}
