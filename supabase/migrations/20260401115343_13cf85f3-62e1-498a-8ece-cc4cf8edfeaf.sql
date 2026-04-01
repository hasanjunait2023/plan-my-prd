
SELECT cron.schedule(
  'calculate-confluence-trading-hours',
  '0 6,7,8,13,14,19,20 * * 1-5',
  $$
  SELECT net.http_post(
    url:='https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/calculate-confluence',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'fetch-adr-daily',
  '0 6 * * 1-5',
  $$
  SELECT net.http_post(
    url:='https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/fetch-adr',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body:='{"pairs": ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD"]}'::jsonb
  ) AS request_id;
  $$
);
