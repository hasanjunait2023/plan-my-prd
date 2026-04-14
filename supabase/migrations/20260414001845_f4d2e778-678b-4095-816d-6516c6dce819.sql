ALTER TABLE public.alert_settings
  ADD COLUMN namaz_reminder_alert boolean NOT NULL DEFAULT true,
  ADD COLUMN habit_reminder_alert boolean NOT NULL DEFAULT true,
  ADD COLUMN news_alert boolean NOT NULL DEFAULT true,
  ADD COLUMN price_spike_alert boolean NOT NULL DEFAULT true,
  ADD COLUMN volume_spike_alert boolean NOT NULL DEFAULT true;