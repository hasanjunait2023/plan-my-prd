
CREATE TABLE public.namaz_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waqt text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  quote_sent text NOT NULL DEFAULT '',
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(waqt, date)
);

ALTER TABLE public.namaz_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access namaz_reminders"
  ON public.namaz_reminders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated read namaz_reminders"
  ON public.namaz_reminders FOR SELECT
  TO authenticated
  USING (true);
