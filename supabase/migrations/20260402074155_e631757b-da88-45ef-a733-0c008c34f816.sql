
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS rule_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rule_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revision_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS revision_takeaway text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS revision_would_take_again boolean DEFAULT null,
  ADD COLUMN IF NOT EXISTS revision_rating integer DEFAULT null,
  ADD COLUMN IF NOT EXISTS revised_at timestamptz DEFAULT null;
