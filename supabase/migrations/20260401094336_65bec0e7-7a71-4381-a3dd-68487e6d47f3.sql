
CREATE TABLE public.currency_strength (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency text NOT NULL,
  strength integer NOT NULL,
  category text NOT NULL,
  timeframe text NOT NULL,
  recorded_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.currency_strength ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on currency_strength"
  ON public.currency_strength
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow service role insert on currency_strength"
  ON public.currency_strength
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow service role delete on currency_strength"
  ON public.currency_strength
  FOR DELETE
  TO service_role
  USING (true);
