
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- EMA alignment scan results
CREATE TABLE public.ema_alignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pair text NOT NULL,
  direction text NOT NULL,
  timeframe text NOT NULL,
  ema_9 numeric NOT NULL,
  ema_15 numeric NOT NULL,
  ema_200 numeric NOT NULL,
  current_price numeric NOT NULL,
  is_aligned boolean NOT NULL DEFAULT false,
  alignment_type text NOT NULL DEFAULT 'NONE',
  scan_batch_id uuid NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- EMA scan notification alerts
CREATE TABLE public.ema_scan_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pair text NOT NULL,
  direction text NOT NULL,
  alignment_score integer NOT NULL DEFAULT 0,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  scan_batch_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies for ema_alignments
ALTER TABLE public.ema_alignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on ema_alignments"
  ON public.ema_alignments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow service role insert on ema_alignments"
  ON public.ema_alignments FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow service role delete on ema_alignments"
  ON public.ema_alignments FOR DELETE
  TO service_role
  USING (true);

-- RLS policies for ema_scan_notifications
ALTER TABLE public.ema_scan_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on ema_scan_notifications"
  ON public.ema_scan_notifications FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow service role insert on ema_scan_notifications"
  ON public.ema_scan_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow public update on ema_scan_notifications"
  ON public.ema_scan_notifications FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role delete on ema_scan_notifications"
  ON public.ema_scan_notifications FOR DELETE
  TO service_role
  USING (true);

-- Indexes
CREATE INDEX idx_ema_alignments_scanned_at ON public.ema_alignments (scanned_at DESC);
CREATE INDEX idx_ema_alignments_pair ON public.ema_alignments (pair);
CREATE INDEX idx_ema_alignments_batch ON public.ema_alignments (scan_batch_id);
CREATE INDEX idx_ema_notifications_created ON public.ema_scan_notifications (created_at DESC);
CREATE INDEX idx_ema_notifications_unread ON public.ema_scan_notifications (is_read) WHERE is_read = false;
