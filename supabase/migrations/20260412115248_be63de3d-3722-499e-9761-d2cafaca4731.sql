
CREATE TABLE public.mt5_candles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  open_time TIMESTAMPTZ NOT NULL,
  open DECIMAL NOT NULL,
  high DECIMAL NOT NULL,
  low DECIMAL NOT NULL,
  close DECIMAL NOT NULL,
  volume BIGINT NOT NULL DEFAULT 0,
  tick_volume BIGINT NOT NULL DEFAULT 0,
  real_volume BIGINT NOT NULL DEFAULT 0,
  pushed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(symbol, timeframe, open_time)
);

-- Index for fast queries
CREATE INDEX idx_mt5_candles_symbol_tf ON public.mt5_candles (symbol, timeframe, open_time DESC);

-- RLS policies
CREATE POLICY "Authenticated read mt5_candles"
  ON public.mt5_candles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role insert mt5_candles"
  ON public.mt5_candles FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role update mt5_candles"
  ON public.mt5_candles FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role delete mt5_candles"
  ON public.mt5_candles FOR DELETE
  TO service_role
  USING (true);

-- Anon insert for EA direct push (EA uses service_role key, but adding anon as fallback)
CREATE POLICY "Anon insert mt5_candles"
  ON public.mt5_candles FOR INSERT
  TO anon
  WITH CHECK (true);
