ALTER TABLE public.account_settings
  ADD COLUMN allowed_sessions text[] NOT NULL DEFAULT '{Asian,London,New York,London Close}',
  ADD COLUMN max_winning_trades integer NOT NULL DEFAULT 3,
  ADD COLUMN max_losing_trades integer NOT NULL DEFAULT 2,
  ADD COLUMN max_lot_size numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN max_drawdown_percent numeric NOT NULL DEFAULT 5,
  ADD COLUMN min_confidence integer NOT NULL DEFAULT 5,
  ADD COLUMN min_rrr numeric NOT NULL DEFAULT 1.5,
  ADD COLUMN min_smc_tags integer NOT NULL DEFAULT 1;