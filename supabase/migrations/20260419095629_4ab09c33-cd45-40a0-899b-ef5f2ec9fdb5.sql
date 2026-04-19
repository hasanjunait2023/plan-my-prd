select cron.schedule(
  'rules-hourly-checkin-nudge',
  '0 * * * *',
  $$select net.http_post(
    url:='https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/rules-hourly-checkin-nudge',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;$$
);