-- Store custom colors per category, per user
CREATE TABLE IF NOT EXISTS public.rule_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#00C9A7',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.rule_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rule_categories"
  ON public.rule_categories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rule_categories"
  ON public.rule_categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rule_categories"
  ON public.rule_categories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rule_categories"
  ON public.rule_categories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);