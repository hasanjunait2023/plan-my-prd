
-- Price snapshots for spike detection
CREATE TABLE public.price_snapshots (
  pair text PRIMARY KEY,
  price numeric NOT NULL,
  previous_price numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access price_snapshots"
  ON public.price_snapshots FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read price_snapshots"
  ON public.price_snapshots FOR SELECT TO authenticated
  USING (true);

-- Spike thresholds (configurable)
CREATE TABLE public.spike_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE,
  threshold_percent numeric NOT NULL,
  cooldown_minutes integer NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.spike_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access spike_thresholds"
  ON public.spike_thresholds FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read spike_thresholds"
  ON public.spike_thresholds FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated update spike_thresholds"
  ON public.spike_thresholds FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Seed default thresholds
INSERT INTO public.spike_thresholds (category, threshold_percent, cooldown_minutes) VALUES
  ('major', 0.15, 5),
  ('cross', 0.20, 5),
  ('gold', 0.30, 5);
