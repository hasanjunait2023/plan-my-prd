

## Plan: Notification Icon Fix + Enhanced Push Content

### সমস্যা ১: Notification Bar এ Icon দেখাচ্ছে না
Android notification bar এ `badge` icon হিসেবে monochrome (single color, transparent background) icon দরকার। বর্তমান `icon-192.png` একটা full-color icon যা Android notification bar এ white square হিসেবে দেখায়। 

**সমাধান:** একটা monochrome badge icon তৈরি করতে হবে (72x72 বা 96x96, transparent background, white foreground only) এবং `sw.js` এ `badge` property তে সেটা ব্যবহার করতে হবে। এছাড়া `manifest.json` এ `monochrome` purpose icon যোগ করতে হবে।

### সমস্যা ২: Push Notification এ সময় ও বিস্তারিত তথ্য নেই
বর্তমানে push body তে শুধু pair name আর change % দেখায়। সময় (BD time) নেই।

**সমাধান:** `price-spike-detector` function এ push body তে BD time যোগ করা।

---

### পরিবর্তনসমূহ

#### 1. Monochrome badge icon তৈরি (public/badge-96.png)
- বর্তমান icon-192.png থেকে একটা 96x96 monochrome version generate করা
- Transparent background, white foreground — Android notification bar এর জন্য standard

#### 2. `public/sw.js` আপডেট
```js
// badge এ monochrome icon ব্যবহার
badge: '/badge-96.png',  // ← ছোট monochrome icon
icon: '/icon-192.png',   // ← full notification icon (unchanged)
```

#### 3. `public/manifest.json` আপডেট
- Monochrome purpose icon entry যোগ:
```json
{
  "src": "/badge-96.png",
  "sizes": "96x96",
  "type": "image/png",
  "purpose": "monochrome"
}
```

#### 4. `supabase/functions/price-spike-detector/index.ts` আপডেট
Push notification body তে BD time যোগ:
```typescript
const { time } = getBdDateTime();
const pushBody = filteredSpikes.map(s => {
  const sign = s.change > 0 ? '+' : '';
  const dir = s.direction === 'BULLISH' ? '📈 বেড়েছে' : '📉 কমেছে';
  return `${s.pair} ${sign}${s.change.toFixed(2)}% (${s.pips} pips) ${dir}`;
}).join('\n') + `\n🕐 ${time} (BD)`;
```

#### 5. `send-push-notification` Edge Function আপডেট
Push payload তে timestamp pass করা যাতে notification এ সময় দেখায়।

---

### ফাইল পরিবর্তন

| ফাইল | কাজ |
|---|---|
| `public/badge-96.png` | নতুন — monochrome notification badge icon |
| `public/sw.js` | badge icon path পরিবর্তন |
| `public/manifest.json` | monochrome icon entry যোগ |
| `supabase/functions/price-spike-detector/index.ts` | Push body তে time + pips যোগ |

### গুরুত্বপূর্ণ
- Badge icon fix হলে পরবর্তী push notification থেকে সঠিক icon দেখাবে
- পুরানো notification cache clear করতে app reinstall বা notification settings clear করতে হতে পারে

