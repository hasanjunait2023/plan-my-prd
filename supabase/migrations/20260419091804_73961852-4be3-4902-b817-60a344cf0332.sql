
-- Daily rule adherence check-in (one row per user per day)
CREATE TABLE public.daily_rule_adherence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  total_rules integer NOT NULL DEFAULT 0,
  followed_count integer NOT NULL DEFAULT 0,
  violated_count integer NOT NULL DEFAULT 0,
  adherence_score numeric NOT NULL DEFAULT 0,
  mood text NOT NULL DEFAULT 'Calm',
  trades_count integer NOT NULL DEFAULT 0,
  general_note text NOT NULL DEFAULT '',
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_rule_adherence_user_date ON public.daily_rule_adherence(user_id, date DESC);

ALTER TABLE public.daily_rule_adherence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own adherence" ON public.daily_rule_adherence
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own adherence" ON public.daily_rule_adherence
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own adherence" ON public.daily_rule_adherence
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own adherence" ON public.daily_rule_adherence
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access adherence" ON public.daily_rule_adherence
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_daily_rule_adherence_updated_at
  BEFORE UPDATE ON public.daily_rule_adherence
  FOR EACH ROW EXECUTE FUNCTION public.update_user_preferences_updated_at();

-- Granular rule violations (one row per violated rule per day)
CREATE TABLE public.rule_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  rule_id uuid NOT NULL,
  rule_text_snapshot text NOT NULL DEFAULT '',
  category_snapshot text NOT NULL DEFAULT 'General',
  reason text NOT NULL DEFAULT '',
  mood text NOT NULL DEFAULT 'Calm',
  trade_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_rule_violations_user_date ON public.rule_violations(user_id, date DESC);
CREATE INDEX idx_rule_violations_rule ON public.rule_violations(rule_id);

ALTER TABLE public.rule_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own violations" ON public.rule_violations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own violations" ON public.rule_violations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own violations" ON public.rule_violations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own violations" ON public.rule_violations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access violations" ON public.rule_violations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- AI-generated weekly coaching plans
CREATE TABLE public.coaching_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  focus_rule_ids uuid[] NOT NULL DEFAULT '{}',
  summary text NOT NULL DEFAULT '',
  action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  sent_to_telegram boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX idx_coaching_plans_user_week ON public.coaching_plans(user_id, week_start DESC);

ALTER TABLE public.coaching_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coaching_plans" ON public.coaching_plans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own coaching_plans" ON public.coaching_plans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own coaching_plans" ON public.coaching_plans
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access coaching_plans" ON public.coaching_plans
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add daily check-in reminder toggle to alert_settings
ALTER TABLE public.alert_settings 
  ADD COLUMN IF NOT EXISTS rules_checkin_push boolean NOT NULL DEFAULT true;
