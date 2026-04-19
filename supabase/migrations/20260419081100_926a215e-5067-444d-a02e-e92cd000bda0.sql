DO $$ BEGIN PERFORM cron.unschedule('lifeos-evening-slot'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'lifeos-evening-slot',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url:='https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/lifeos-slot-push?slot=evening',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);