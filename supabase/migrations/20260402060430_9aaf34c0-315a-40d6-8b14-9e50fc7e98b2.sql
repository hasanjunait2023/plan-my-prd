
-- Add user_id to personal tables
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.psychology_logs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.account_settings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.trading_rules ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Drop old RLS policies on trades
DROP POLICY IF EXISTS "Allow public delete on trades" ON public.trades;
DROP POLICY IF EXISTS "Allow public insert on trades" ON public.trades;
DROP POLICY IF EXISTS "Allow public read on trades" ON public.trades;
DROP POLICY IF EXISTS "Allow public update on trades" ON public.trades;

-- New RLS for trades
CREATE POLICY "Users can view own trades" ON public.trades FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trades" ON public.trades FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trades" ON public.trades FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trades" ON public.trades FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Drop old RLS policies on psychology_logs
DROP POLICY IF EXISTS "Allow public delete on psychology_logs" ON public.psychology_logs;
DROP POLICY IF EXISTS "Allow public insert on psychology_logs" ON public.psychology_logs;
DROP POLICY IF EXISTS "Allow public read on psychology_logs" ON public.psychology_logs;
DROP POLICY IF EXISTS "Allow public update on psychology_logs" ON public.psychology_logs;

-- New RLS for psychology_logs
CREATE POLICY "Users can view own psychology_logs" ON public.psychology_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own psychology_logs" ON public.psychology_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own psychology_logs" ON public.psychology_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own psychology_logs" ON public.psychology_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Drop old RLS policies on account_settings
DROP POLICY IF EXISTS "Allow public insert on account_settings" ON public.account_settings;
DROP POLICY IF EXISTS "Allow public read on account_settings" ON public.account_settings;
DROP POLICY IF EXISTS "Allow public update on account_settings" ON public.account_settings;

-- New RLS for account_settings
CREATE POLICY "Users can view own settings" ON public.account_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.account_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.account_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Drop old RLS policies on trading_rules
DROP POLICY IF EXISTS "Allow public delete on trading_rules" ON public.trading_rules;
DROP POLICY IF EXISTS "Allow public insert on trading_rules" ON public.trading_rules;
DROP POLICY IF EXISTS "Allow public read on trading_rules" ON public.trading_rules;
DROP POLICY IF EXISTS "Allow public update on trading_rules" ON public.trading_rules;

-- New RLS for trading_rules
CREATE POLICY "Users can view own rules" ON public.trading_rules FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rules" ON public.trading_rules FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rules" ON public.trading_rules FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rules" ON public.trading_rules FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Update shared tables: require authentication
-- currency_strength
DROP POLICY IF EXISTS "Allow public read access on currency_strength" ON public.currency_strength;
CREATE POLICY "Authenticated read currency_strength" ON public.currency_strength FOR SELECT TO authenticated USING (true);

-- ema_alignments
DROP POLICY IF EXISTS "Allow public read on ema_alignments" ON public.ema_alignments;
CREATE POLICY "Authenticated read ema_alignments" ON public.ema_alignments FOR SELECT TO authenticated USING (true);

-- ema_scan_notifications
DROP POLICY IF EXISTS "Allow public read on ema_scan_notifications" ON public.ema_scan_notifications;
DROP POLICY IF EXISTS "Allow public update on ema_scan_notifications" ON public.ema_scan_notifications;
CREATE POLICY "Authenticated read ema_scan_notifications" ON public.ema_scan_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated update ema_scan_notifications" ON public.ema_scan_notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- confluence_scores
DROP POLICY IF EXISTS "Allow public read on confluence_scores" ON public.confluence_scores;
CREATE POLICY "Authenticated read confluence_scores" ON public.confluence_scores FOR SELECT TO authenticated USING (true);

-- adr_data
DROP POLICY IF EXISTS "Allow public read on adr_data" ON public.adr_data;
CREATE POLICY "Authenticated read adr_data" ON public.adr_data FOR SELECT TO authenticated USING (true);

-- alert_log
DROP POLICY IF EXISTS "Allow public read on alert_log" ON public.alert_log;
CREATE POLICY "Authenticated read alert_log" ON public.alert_log FOR SELECT TO authenticated USING (true);

-- alert_settings
DROP POLICY IF EXISTS "Allow public insert on alert_settings" ON public.alert_settings;
DROP POLICY IF EXISTS "Allow public read on alert_settings" ON public.alert_settings;
DROP POLICY IF EXISTS "Allow public update on alert_settings" ON public.alert_settings;
CREATE POLICY "Authenticated read alert_settings" ON public.alert_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert alert_settings" ON public.alert_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update alert_settings" ON public.alert_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- mt5_account_info
DROP POLICY IF EXISTS "Public read mt5_account_info" ON public.mt5_account_info;
CREATE POLICY "Authenticated read mt5_account_info" ON public.mt5_account_info FOR SELECT TO authenticated USING (true);

-- mt5_trades
DROP POLICY IF EXISTS "Public read mt5_trades" ON public.mt5_trades;
DROP POLICY IF EXISTS "Anon update imported flag mt5_trades" ON public.mt5_trades;
CREATE POLICY "Authenticated read mt5_trades" ON public.mt5_trades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated update mt5_trades" ON public.mt5_trades FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
