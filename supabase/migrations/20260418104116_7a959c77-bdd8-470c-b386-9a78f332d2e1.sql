-- Daily focus: stores the top 3 auto-selected tasks for each day per user
CREATE TABLE public.daily_focus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  node_id UUID NOT NULL REFERENCES public.life_nodes(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'auto',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, node_id)
);

CREATE INDEX idx_daily_focus_user_date ON public.daily_focus(user_id, date DESC);

ALTER TABLE public.daily_focus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily_focus"
  ON public.daily_focus FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily_focus"
  ON public.daily_focus FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily_focus"
  ON public.daily_focus FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily_focus"
  ON public.daily_focus FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access daily_focus"
  ON public.daily_focus FOR ALL TO service_role
  USING (true) WITH CHECK (true);