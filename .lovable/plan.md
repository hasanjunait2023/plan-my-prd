

## Plan: News Alert — Important Event এর আগে Telegram Push Notification

### কি হবে
একটা নতুন Edge Function `news-alert` তৈরি হবে যেটা প্রতি ৫ মিনিটে run করবে। এটা Forex Factory calendar data check করবে এবং **High/Medium impact** news যেগুলো আগামী ৫-১০ মিনিটের মধ্যে release হবে, সেগুলোর notification Telegram এ push করবে।

### Alert Message Format
```
⚠️ 🇺🇸 HIGH IMPACT — 5 min left!

📰 Non-Farm Payrolls
⏰ Time: 13:30 UTC
📊 Forecast: 180K | Previous: 175K

💥 Affected pairs: EUR/USD, GBP/USD, USD/JPY, XAU/USD
🥇 Gold mover: Yes

⏳ Prepare your positions!
```

### Logic Flow
```text
Every 5 min (cron) → fetch calendar API
  → filter: High + Medium impact only
  → filter: event time is 5-10 min from now
  → check alert_log: already sent for this event?
    → No → send Telegram message + log to alert_log
    → Yes → skip (duplicate prevention)
```

### Duplicate Prevention
`alert_log` table এ entry থাকবে `alert_type = 'news_alert'` এবং `metadata` তে event title + date। একই event এর জন্য দুইবার alert যাবে না।

### Affected Pairs Detection
- Event এর currency (USD, EUR, GBP etc.) থেকে automatically major pairs identify করবে
- Gold-moving events (CPI, NFP, FOMC, Interest Rate) detect করলে XAU/USD ও include করবে

### Technical Details

**New file:** `supabase/functions/news-alert/index.ts`

| Step | Detail |
|------|--------|
| Data source | Same FF calendar API (`nfs.faireconomy.media/ff_calendar_thisweek.json`) |
| Filter | `impact === 'High'` or `impact === 'Medium'`, event time 5-10 min from now |
| Telegram | `TELEGRAM_BOT_TOKEN` + `alert_settings.telegram_chat_id` (existing) |
| Dedup | Check `alert_log` where `alert_type = 'news_alert'` and matching event title+date |
| Logging | Insert to `alert_log` after successful send |

**New cron job** (via SQL insert):
```sql
SELECT cron.schedule('news-alert-check', '*/5 * * * *', $$
  SELECT net.http_post(
    url:='https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/news-alert',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body:='{}'::jsonb
  );
$$);
```

**No DB changes needed** — existing `alert_log` table এবং `alert_settings` table ব্যবহার করা হবে।

