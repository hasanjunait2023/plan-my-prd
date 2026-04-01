
SELECT cron.schedule(
  'ema-alignment-scan-trading-hours',
  '0 0-3,7-9,13-15 * * 1-5',
  $$
  SELECT net.http_post(
    url:='https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/scan-ema-alignment',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo'
    ),
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
