-- Ensure extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule if previously set
DO $$
BEGIN
  PERFORM cron.unschedule('lifeos-ai-weekly-review');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('lifeos-ai-drift-check');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('lifeos-ai-reflection-sunday');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drift detection: daily 11am Dhaka = 05:00 UTC
SELECT cron.schedule(
  'lifeos-ai-drift-check',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/lifeos-ai-coach?mode=drift',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Weekly review: Friday 8pm Dhaka = 14:00 UTC Friday
SELECT cron.schedule(
  'lifeos-ai-weekly-review',
  '0 14 * * 5',
  $$
  SELECT net.http_post(
    url := 'https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/lifeos-ai-coach?mode=weekly',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Reflection analysis: Sunday 7pm Dhaka = 13:00 UTC Sunday
SELECT cron.schedule(
  'lifeos-ai-reflection-sunday',
  '0 13 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/lifeos-ai-coach?mode=reflection',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);