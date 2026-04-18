ALTER TABLE public.daily_focus
  ADD COLUMN IF NOT EXISTS time_slot TEXT NOT NULL DEFAULT 'unset',
  ADD COLUMN IF NOT EXISTS start_hour INTEGER;

-- Backfill existing rows by rank
UPDATE public.daily_focus
SET time_slot = CASE
  WHEN rank = 1 THEN 'morning'
  WHEN rank = 2 THEN 'afternoon'
  WHEN rank = 3 THEN 'evening'
  ELSE 'unset'
END
WHERE time_slot = 'unset';

CREATE INDEX IF NOT EXISTS idx_daily_focus_user_date_slot ON public.daily_focus(user_id, date, time_slot);