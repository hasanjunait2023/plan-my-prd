-- Unschedule the old single 7 AM morning push
DO $$ BEGIN
  PERFORM cron.unschedule('lifeos-morning-push');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Also drop slot jobs if they exist (for re-runs)
DO $$ BEGIN PERFORM cron.unschedule('lifeos-morning-slot'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('lifeos-afternoon-slot'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('lifeos-evening-slot'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Morning slot — 6 AM Asia/Dhaka = 00:00 UTC
SELECT cron.schedule(
  'lifeos-morning-slot',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url:='https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/lifeos-slot-push?slot=morning',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

-- Afternoon slot — 12 PM Asia/Dhaka = 06:00 UTC
SELECT cron.schedule(
  'lifeos-afternoon-slot',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url:='https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/lifeos-slot-push?slot=afternoon',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

-- Evening slot — 6 PM Asia/Dhaka = 12:00 UTC
SELECT cron.schedule(
  'lifeos-evening-slot',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url:='https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/lifeos-slot-push?slot=evening',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IksxNiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);