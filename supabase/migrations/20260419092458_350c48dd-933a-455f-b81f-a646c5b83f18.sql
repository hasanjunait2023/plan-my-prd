-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule existing jobs if they exist (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('rules-daily-checkin-930pm-dhaka');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('rules-coaching-plan-sunday-10pm-dhaka');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 9:30 PM Dhaka (UTC+6) = 15:30 UTC every day
SELECT cron.schedule(
  'rules-daily-checkin-930pm-dhaka',
  '30 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/rules-daily-checkin-push',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Sunday 10 PM Dhaka (UTC+6) = 16:00 UTC Sunday
SELECT cron.schedule(
  'rules-coaching-plan-sunday-10pm-dhaka',
  '0 16 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/rules-coaching-plan',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);