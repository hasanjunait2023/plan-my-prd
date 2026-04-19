-- Spaced repetition tracking per rule per user
CREATE TABLE IF NOT EXISTS public.rule_memorization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rule_id uuid NOT NULL REFERENCES public.trading_rules(id) ON DELETE CASCADE,
  confidence_score int NOT NULL DEFAULT 0,
  repeat_count int NOT NULL DEFAULT 0,
  last_shown_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, rule_id)
);

ALTER TABLE public.rule_memorization ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rule_memorization"
  ON public.rule_memorization FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rule_memorization"
  ON public.rule_memorization FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rule_memorization"
  ON public.rule_memorization FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rule_memorization"
  ON public.rule_memorization FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rule_memorization_user ON public.rule_memorization(user_id);

-- Settings columns for the morning/evening rule pushes
ALTER TABLE public.alert_settings
  ADD COLUMN IF NOT EXISTS rules_morning_push boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rules_evening_push boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rules_per_push int NOT NULL DEFAULT 5;