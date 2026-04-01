
-- Alert settings table (singleton-style, one row per user/system)
CREATE TABLE public.alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id text,
  confluence_alert boolean NOT NULL DEFAULT true,
  min_confluence_grade text NOT NULL DEFAULT 'A',
  ema_shift_alert boolean NOT NULL DEFAULT true,
  risk_breach_alert boolean NOT NULL DEFAULT true,
  session_reminder_alert boolean NOT NULL DEFAULT true,
  mt5_trade_alert boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on alert_settings" ON public.alert_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert on alert_settings" ON public.alert_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update on alert_settings" ON public.alert_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Alert log table for tracking sent alerts and duplicate prevention
CREATE TABLE public.alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  pair text,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on alert_log" ON public.alert_log FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow service role insert on alert_log" ON public.alert_log FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Allow service role delete on alert_log" ON public.alert_log FOR DELETE TO service_role USING (true);

-- Index for duplicate checking
CREATE INDEX idx_alert_log_type_pair_sent ON public.alert_log (alert_type, pair, sent_at DESC);

-- Insert default settings row
INSERT INTO public.alert_settings (id, telegram_chat_id) VALUES (gen_random_uuid(), null);
