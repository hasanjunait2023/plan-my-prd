
CREATE TABLE public.confluence_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair text NOT NULL,
  grade text NOT NULL DEFAULT 'D',
  strength_diff numeric NOT NULL DEFAULT 0,
  ema_score integer NOT NULL DEFAULT 0,
  session_active boolean NOT NULL DEFAULT false,
  active_session text,
  direction text NOT NULL DEFAULT 'NONE',
  base_currency text,
  quote_currency text,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.confluence_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on confluence_scores" ON public.confluence_scores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow service role insert on confluence_scores" ON public.confluence_scores FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Allow service role delete on confluence_scores" ON public.confluence_scores FOR DELETE TO service_role USING (true);

CREATE TABLE public.adr_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair text NOT NULL,
  adr_pips numeric NOT NULL DEFAULT 0,
  today_range_pips numeric NOT NULL DEFAULT 0,
  adr_percent_used numeric NOT NULL DEFAULT 0,
  today_high numeric NOT NULL DEFAULT 0,
  today_low numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'normal',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.adr_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on adr_data" ON public.adr_data FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow service role insert on adr_data" ON public.adr_data FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Allow service role delete on adr_data" ON public.adr_data FOR DELETE TO service_role USING (true);
