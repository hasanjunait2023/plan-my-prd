

## Plan: Push Notification + Telegram Dual Alert System

### সমস্যা
বর্তমানে spike detect হলে শুধু Telegram এ message যায়। কিন্তু Telegram miss হতে পারে। Android PWA তে push notification আসলে phone এ directly alert পাবেন — কখনো miss হবে না।

### কিভাবে কাজ করবে

```text
Spike Detected
    ↓
price-spike-detector edge function
    ↓
    ├── 1. Telegram Message (existing — as before)
    └── 2. Web Push Notification (NEW)
              ↓
         Android PWA তে notification আসবে
         (sound + vibration সহ)
```

### পরিবর্তনসমূহ

#### 1. Database — Push subscription store করা
নতুন table `push_subscriptions` তৈরি হবে যেখানে আপনার browser/PWA এর push subscription save থাকবে।

```sql
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);
```

#### 2. VAPID Keys — Web Push এর জন্য encryption keys
Web Push কাজ করতে VAPID key pair লাগে (public + private)। একটা script দিয়ে generate করে:
- **Public key** → frontend code এ থাকবে (subscribe করার জন্য)
- **Private key** → Supabase secret এ save হবে (`VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`)

#### 3. Service Worker — Push receive করার জন্য
`public/sw.js` ফাইল তৈরি হবে যেটা push notification receive করবে এবং Android এ notification দেখাবে:

```javascript
// public/sw.js
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || '🔴 Spike Alert!', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'spike-alert',
      reopen: true,
    })
  );
});
```

#### 4. Frontend — Notification permission + subscription
- `src/main.tsx` বা Settings page এ service worker register করা হবে
- User কে notification permission চাওয়া হবে
- Permission দিলে push subscription তৈরি হবে এবং `push_subscriptions` table এ save হবে
- Settings page এ "Push Notification" toggle যোগ হবে

#### 5. Edge Function — Push পাঠানো
`price-spike-detector/index.ts` এ Telegram message পাঠানোর পরে push notification ও পাঠাবে:

```typescript
// Telegram message এর পরে...
// Web Push notification
const { data: subs } = await supabase.from('push_subscriptions').select('*');
for (const sub of subs) {
  await webpush.sendNotification(sub, JSON.stringify({
    title: '🔴 Spike Alert!',
    body: `${pair} ${direction === 'bullish' ? '📈 বেড়েছে' : '📉 কমেছে'} ${change}%`,
  }));
}
```

#### 6. নতুন Edge Function — `send-push-notification`
Push notification পাঠানোর logic আলাদা edge function এ রাখা হবে যাতে spike detector থেকে invoke করা যায়। এটা `web-push` library ব্যবহার করবে VAPID keys দিয়ে।

### Settings Page এ যা যোগ হবে
- **"Push Notification"** toggle — enable/disable
- Enable করলে browser permission চাইবে
- Permission দিলে subscription save হবে
- Disable করলে subscription delete হবে

### কি কি Secret লাগবে
| Secret | কোথা থেকে |
|--------|-----------|
| `VAPID_PUBLIC_KEY` | Script দিয়ে generate করবো |
| `VAPID_PRIVATE_KEY` | Script দিয়ে generate করবো |

### File Changes Summary
| File | Action |
|------|--------|
| `public/sw.js` | নতুন — Service Worker |
| `src/main.tsx` | Update — SW registration |
| `src/pages/Settings.tsx` | Update — Push toggle যোগ |
| `supabase/functions/send-push-notification/index.ts` | নতুন — Push sender |
| `supabase/functions/price-spike-detector/index.ts` | Update — Push call যোগ |
| Migration | নতুন — `push_subscriptions` table |

### গুরুত্বপূর্ণ তথ্য
- Push notification শুধু **published version** এ কাজ করবে (Lovable preview তে না)
- Android PWA তে install করার পরে notification permission দিতে হবে
- Phone এ sound + vibration সহ notification আসবে
- Telegram + Push দুটোই simultaneously যাবে — কোনোটা miss হবে না

