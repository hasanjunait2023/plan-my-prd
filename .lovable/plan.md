

## Plan: AI Scanner — 3 Session Cron Schedule

### Goal
তিনটি সেশনের জন্য automatic cron job সেটআপ করা যা নির্দিষ্ট সময়ে AI Currency Scanner চালাবে।

### Schedule (Bangladesh Time → UTC)
| Session | BDT Time | UTC Time | Cron Expression |
|---------|----------|----------|-----------------|
| Asian | সকাল 7:00 | 01:00 UTC | `0 1 * * 1-5` |
| London | দুপুর 11:00 | 05:00 UTC | `0 5 * * 1-5` |
| New York | বিকেল 7:00 | 13:00 UTC | `0 13 * * 1-5` |

*শুধু weekdays (Mon-Fri) চালাবে — weekend এ forex market বন্ধ।*

### Technical Steps

**1. Enable pg_cron and pg_net extensions**
- Database migration দিয়ে `pg_cron` এবং `pg_net` extensions enable করা

**2. Create 3 cron jobs via SQL insert**
- প্রতিটি job `net.http_post()` দিয়ে `ai-currency-scanner` edge function call করবে
- Body তে session name পাঠাবে: `{"session": "Asian"}`, `{"session": "London"}`, `{"session": "New York"}`
- Authorization header এ anon key থাকবে

### SQL (Supabase SQL Editor এ run হবে — migration নয়, কারণ project-specific credentials আছে)

```sql
-- Enable extensions
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Asian session — 7 AM BDT (1:00 UTC) weekdays
select cron.schedule(
  'ai-scanner-asian',
  '0 1 * * 1-5',
  $$
  select net.http_post(
    url:='https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/ai-currency-scanner',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body:='{"session":"Asian","timeframe":"1H"}'::jsonb
  ) as request_id;
  $$
);

-- London session — 11 AM BDT (5:00 UTC) weekdays
select cron.schedule(
  'ai-scanner-london',
  '0 5 * * 1-5',
  $$
  select net.http_post(
    url:='https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/ai-currency-scanner',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body:='{"session":"London","timeframe":"1H"}'::jsonb
  ) as request_id;
  $$
);

-- New York session — 7 PM BDT (13:00 UTC) weekdays
select cron.schedule(
  'ai-scanner-newyork',
  '0 13 * * 1-5',
  $$
  select net.http_post(
    url:='https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/ai-currency-scanner',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo"}'::jsonb,
    body:='{"session":"New York","timeframe":"1H"}'::jsonb
  ) as request_id;
  $$
);
```

### What Happens
- প্রতিদিন সোম-শুক্র তিনবার automatic scan হবে
- প্রতিটি scan session name সহ `currency_strength` table এ store হবে
- AI Scanner page এ session tab অনুযায়ী data দেখাবে

