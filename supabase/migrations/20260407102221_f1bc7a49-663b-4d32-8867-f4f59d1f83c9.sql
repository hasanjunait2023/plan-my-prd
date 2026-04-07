ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;