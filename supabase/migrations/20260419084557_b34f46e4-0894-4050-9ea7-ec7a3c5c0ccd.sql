-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing jobs with same name (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('rules-memorize-morning');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('rules-memorize-evening');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Morning push: 6 AM Dhaka = 00:00 UTC
SELECT cron.schedule(
  'rules-memorize-morning',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/rules-memorize-push',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body := '{"slot": "morning"}'::jsonb
  ) AS request_id;
  $$
);

-- Evening push: 10 PM Dhaka = 16:00 UTC
SELECT cron.schedule(
  'rules-memorize-evening',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/rules-memorize-push',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body := '{"slot": "evening"}'::jsonb
  ) AS request_id;
  $$
);