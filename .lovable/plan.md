

# TradeVault Pro — Android এ Install যোগ্য করা (PWA)

## কি হবে
তোমার app টা Android phone এ "Add to Home Screen" করলে native app এর মতো open হবে — browser bar ছাড়া, full screen এ। App store লাগবে না।

## Approach: Simple PWA (Service Worker ছাড়া)
তোমার শুধু installability দরকার, offline support না। তাই শুধু `manifest.json` + meta tags যোগ করলেই হবে — কোনো `vite-plugin-pwa` বা service worker লাগবে না। এটা সবচেয়ে simple ও safe approach।

⚠️ **গুরুত্বপূর্ণ**: Install feature শুধু **published version** এ কাজ করবে, Lovable editor preview তে না। App publish করার পর Chrome এ visit করলে "Install" option আসবে।

## Changes

### 1. `public/manifest.json` — নতুন file তৈরি
- `name`: "TradeVault Pro"
- `short_name`: "TradeVault"
- `display`: "standalone"
- `background_color`: "#0D1B2A"
- `theme_color`: "#00C9A7"
- `start_url`: "/"
- Icons: 192x192 ও 512x512 placeholder icons

### 2. `public/` — PWA icons তৈরি
- `icon-192.png` ও `icon-512.png` — simple placeholder icons generate করবো

### 3. `index.html` — meta tags ও manifest link যোগ
- `<link rel="manifest" href="/manifest.json">`
- `<meta name="theme-color" content="#00C9A7">`
- `<meta name="mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- Title update: "TradeVault Pro"

### 4. Install Page — `src/pages/Install.tsx`
- একটা simple page যেখানে install instructions থাকবে
- Android Chrome: "Menu → Add to Home Screen" guide
- Route: `/install`

| Action | File |
|--------|------|
| **Create** | `public/manifest.json` |
| **Create** | `src/pages/Install.tsx` |
| **Modify** | `index.html` — manifest link + meta tags |
| **Modify** | `src/App.tsx` — `/install` route যোগ |

