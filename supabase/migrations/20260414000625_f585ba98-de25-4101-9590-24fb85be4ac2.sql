CREATE TABLE public.session_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name text NOT NULL,
  alert_type text NOT NULL,
  date text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_session_reminders_unique ON public.session_reminders(session_name, alert_type, date);

ALTER TABLE public.session_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access session_reminders"
ON public.session_reminders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated read session_reminders"
ON public.session_reminders
FOR SELECT
TO authenticated
USING (true);