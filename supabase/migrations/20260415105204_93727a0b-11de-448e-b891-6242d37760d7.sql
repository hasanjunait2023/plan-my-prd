ALTER TABLE public.alert_settings
  ADD COLUMN IF NOT EXISTS feature_currency_scanner boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_price_spike boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_ema_scanner boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_adr boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_supply_demand boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_ny_breaks boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_volume_spike boolean NOT NULL DEFAULT true;