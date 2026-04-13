
-- Create api_key_pool table
CREATE TABLE public.api_key_pool (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'twelvedata',
  api_key text NOT NULL,
  label text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  calls_today integer NOT NULL DEFAULT 0,
  daily_limit integer NOT NULL DEFAULT 800,
  last_used_at timestamp with time zone,
  last_error_at timestamp with time zone,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS: service_role only
ALTER TABLE public.api_key_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access api_key_pool"
  ON public.api_key_pool
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Daily reset cron job at midnight UTC
SELECT cron.schedule(
  'reset-api-key-calls-daily',
  '0 0 * * *',
  $$UPDATE public.api_key_pool SET calls_today = 0$$
);
