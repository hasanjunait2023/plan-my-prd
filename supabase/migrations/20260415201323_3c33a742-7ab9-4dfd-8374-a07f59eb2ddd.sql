
CREATE TABLE public.session_pair_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pair TEXT NOT NULL,
  session TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'NONE',
  total_score INTEGER NOT NULL DEFAULT 0,
  differential INTEGER NOT NULL DEFAULT 0,
  bias_4h TEXT NOT NULL DEFAULT 'UNKNOWN',
  overextension_pct NUMERIC NOT NULL DEFAULT 0,
  daily_structure TEXT NOT NULL DEFAULT 'CLEAR',
  adr_remaining NUMERIC NOT NULL DEFAULT 0,
  atr_status TEXT NOT NULL DEFAULT 'NORMAL',
  reasoning TEXT NOT NULL DEFAULT '',
  is_qualified BOOLEAN NOT NULL DEFAULT false,
  rank INTEGER NOT NULL DEFAULT 0,
  scan_batch_id UUID NOT NULL DEFAULT gen_random_uuid(),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.session_pair_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access session_pair_recommendations"
ON public.session_pair_recommendations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated read session_pair_recommendations"
ON public.session_pair_recommendations
FOR SELECT
TO authenticated
USING (true);

CREATE INDEX idx_session_pair_recommendations_session ON public.session_pair_recommendations (session, scanned_at DESC);
CREATE INDEX idx_session_pair_recommendations_batch ON public.session_pair_recommendations (scan_batch_id);
