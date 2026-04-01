
-- MT5 Account Info table
CREATE TABLE public.mt5_account_info (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id text NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  equity numeric NOT NULL DEFAULT 0,
  margin numeric NOT NULL DEFAULT 0,
  free_margin numeric NOT NULL DEFAULT 0,
  leverage integer NOT NULL DEFAULT 0,
  server text,
  broker text,
  currency text DEFAULT 'USD',
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for mt5_account_info
ALTER TABLE public.mt5_account_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read mt5_account_info"
  ON public.mt5_account_info FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role insert mt5_account_info"
  ON public.mt5_account_info FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role update mt5_account_info"
  ON public.mt5_account_info FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role delete mt5_account_info"
  ON public.mt5_account_info FOR DELETE
  TO service_role
  USING (true);

-- MT5 Trades table
CREATE TABLE public.mt5_trades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket text NOT NULL UNIQUE,
  pair text NOT NULL,
  direction text NOT NULL,
  entry_price numeric NOT NULL DEFAULT 0,
  exit_price numeric,
  sl numeric,
  tp numeric,
  lot_size numeric NOT NULL DEFAULT 0,
  pnl numeric DEFAULT 0,
  pips numeric DEFAULT 0,
  commission numeric DEFAULT 0,
  swap numeric DEFAULT 0,
  open_time timestamp with time zone,
  close_time timestamp with time zone,
  is_open boolean NOT NULL DEFAULT false,
  imported_to_journal boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for mt5_trades
ALTER TABLE public.mt5_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read mt5_trades"
  ON public.mt5_trades FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role insert mt5_trades"
  ON public.mt5_trades FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role update mt5_trades"
  ON public.mt5_trades FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role delete mt5_trades"
  ON public.mt5_trades FOR DELETE
  TO service_role
  USING (true);

CREATE POLICY "Anon update imported flag mt5_trades"
  ON public.mt5_trades FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
