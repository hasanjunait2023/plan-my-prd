
-- Table to store per-pair AI scan results
CREATE TABLE public.ai_scan_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_batch_id uuid NOT NULL,
  timeframe text NOT NULL,
  pair text NOT NULL,
  result integer NOT NULL DEFAULT 0,
  strength_label text NOT NULL DEFAULT 'NEUTRAL',
  scanned_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_scan_results ENABLE ROW LEVEL SECURITY;

-- Service role can insert and delete
CREATE POLICY "Service role full access ai_scan_results"
  ON public.ai_scan_results FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Authenticated users can read
CREATE POLICY "Authenticated read ai_scan_results"
  ON public.ai_scan_results FOR SELECT
  TO authenticated
  USING (true);

-- Index for fast lookups
CREATE INDEX idx_ai_scan_results_batch ON public.ai_scan_results (scan_batch_id);
CREATE INDEX idx_ai_scan_results_timeframe ON public.ai_scan_results (timeframe, scanned_at DESC);
