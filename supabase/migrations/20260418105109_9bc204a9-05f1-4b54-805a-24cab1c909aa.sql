CREATE TABLE public.lifeos_ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_to_telegram BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lifeos_ai_insights_user_kind ON public.lifeos_ai_insights(user_id, kind, created_at DESC);

ALTER TABLE public.lifeos_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own insights"
  ON public.lifeos_ai_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own insights"
  ON public.lifeos_ai_insights FOR DELETE
  USING (auth.uid() = user_id);