

## Plan: সব Telegram Alert এ Web Push Notification যোগ

### বর্তমান অবস্থা
শুধু `price-spike-detector` এ push notification আছে। বাকি ৫টা Edge Function এ Telegram message যায় কিন্তু push notification যায় না।

### যা যা আপডেট হবে

#### 1. `telegram-trade-alerts/index.ts` — 6 ধরনের alert এ push যোগ
- 🟢 Confluence A/A+ setup alert
- ⚡ EMA alignment shift
- 🔴 Risk breach warning
- 🕐 Session reminder (London/NY)
- 📊 MT5 trade open/close
- 🔴 High impact calendar event

প্রতিটা alert Telegram এ পাঠানোর পরে `send-push-notification` invoke করবে।

#### 2. `news-alert/index.ts` — Economic news alert এ push যোগ
- High/Medium impact news এর 5-10 min আগে push notification

#### 3. `habit-reminder/index.ts` — Habit reminder এ push যোগ
- যে habit complete হয়নি সেটার push reminder

#### 4. `habit-daily-summary/index.ts` — Daily summary ও streak break এ push যোগ
- Streak break alert: "⚠️ X day streak lost!"
- Daily summary: "✅ 5/7 done (71%)"

#### 5. `habit-weekly-recap/index.ts` — Weekly recap এ push যোগ
- সপ্তাহের summary push notification

#### 6. `send-push-notification/index.ts` — Minor improvement
- `url` parameter support যোগ — notification click করলে specific page এ যাবে
- `sw.js` এ click handler আপডেট

### প্রতিটা function এ যা যোগ হবে (pattern)
```typescript
// Telegram alert পাঠানোর পরে:
try {
  await supabase.functions.invoke('send-push-notification', {
    body: { 
      title: '🟢 A+ Setup: EUR/USD', 
      body: 'BUY — Strength 85 | EMA 3/3 ✓\n🕐 02:30 PM (BD)',
      tag: 'confluence-alert',
      url: '/trade-intelligence'  // click destination
    },
  });
} catch (e) { console.error('Push error:', e); }
```

### sw.js আপডেট — Click-to-open
```js
self.addEventListener('notificationclick', (event) => {
  const url = event.notification.data?.url || '/';
  event.notification.close();
  event.waitUntil(
    clients.openWindow(url)
  );
});
```

### ফাইল পরিবর্তন

| ফাইল | কাজ |
|---|---|
| `supabase/functions/telegram-trade-alerts/index.ts` | 6 alert type এ push যোগ |
| `supabase/functions/news-alert/index.ts` | News alert এ push যোগ |
| `supabase/functions/habit-reminder/index.ts` | Habit reminder এ push যোগ |
| `supabase/functions/habit-daily-summary/index.ts` | Daily summary + streak break এ push যোগ |
| `supabase/functions/habit-weekly-recap/index.ts` | Weekly recap এ push যোগ |
| `supabase/functions/send-push-notification/index.ts` | `url` param support যোগ |
| `public/sw.js` | Notification click → specific page open |

### Notification Click Destinations

| Alert Type | Click করলে যাবে |
|---|---|
| Spike Alert | `/spike-alerts` |
| Confluence | `/trade-intelligence` |
| EMA Shift | `/ema-scanner` |
| Risk Breach | `/analytics` |
| Session Reminder | `/chart-analysis` |
| MT5 Trade | `/mt5-connection` |
| Calendar Event | `/market-news` |
| Habit Reminder | `/habit-tracking` |
| Daily Summary | `/habit-tracking` |
| Weekly Recap | `/habit-tracking` |
| News Alert | `/market-news` |

