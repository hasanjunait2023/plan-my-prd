
-- Ensure extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Unschedule existing job if present
do $$
begin
  if exists (select 1 from cron.job where jobname = 'rules-telegram-checkin-poll') then
    perform cron.unschedule('rules-telegram-checkin-poll');
  end if;
end $$;

select cron.schedule(
  'rules-telegram-checkin-poll',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/rules-telegram-checkin-poll',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
