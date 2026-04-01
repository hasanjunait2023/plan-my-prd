
CREATE TABLE public.market_scan_temp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id text NOT NULL,
  pair text NOT NULL,
  current_price numeric NOT NULL DEFAULT 0,
  previous_close numeric NOT NULL DEFAULT 0,
  change_percent numeric NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.market_scan_temp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on market_scan_temp"
ON public.market_scan_temp
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX idx_market_scan_temp_scan_id ON public.market_scan_temp(scan_id);
