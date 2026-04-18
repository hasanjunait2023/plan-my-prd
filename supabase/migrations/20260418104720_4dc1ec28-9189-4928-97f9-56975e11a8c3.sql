-- Ensure required extensions exist (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedules with these names so we can re-create cleanly
DO $$
BEGIN
  PERFORM cron.unschedule('lifeos-morning-push');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('lifeos-evening-review');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Morning push: 7:00 AM Asia/Dhaka == 01:00 UTC
SELECT cron.schedule(
  'lifeos-morning-push',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/lifeos-morning-push',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Evening review: 9:00 PM Asia/Dhaka == 15:00 UTC
SELECT cron.schedule(
  'lifeos-evening-review',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/lifeos-evening-review',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);