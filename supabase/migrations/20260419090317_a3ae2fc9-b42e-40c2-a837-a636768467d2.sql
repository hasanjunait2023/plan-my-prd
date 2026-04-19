CREATE TABLE public.memorize_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_date)
);

ALTER TABLE public.memorize_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memorize_sessions"
ON public.memorize_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memorize_sessions"
ON public.memorize_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memorize_sessions"
ON public.memorize_sessions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_memorize_sessions_user_date ON public.memorize_sessions(user_id, session_date DESC);