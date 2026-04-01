

# "Fx Junait Vault" Icon তৈরি ও সেট করা

## কি করবো
Nano banana image generation API ব্যবহার করে "Fx Junait Vault" text সহ একটা professional trading app icon generate করবো, তারপর সেটা favicon + PWA icon হিসেবে সেট করবো।

## Steps

### 1. Icon Generate করা
- Nano banana pro API দিয়ে 512x512 icon generate করবো
- Design: Dark background (#0D1B2A), "Fx" bold accent (#00C9A7), "Junait Vault" text, trading/finance aesthetic
- 192x192 version ও তৈরি করবো

### 2. Files Update করা

| Action | File |
|--------|------|
| **Replace** | `public/icon-192.png` — নতুন generated icon |
| **Replace** | `public/icon-512.png` — নতুন generated icon |
| **Modify** | `index.html` — favicon reference যোগ |
| **Modify** | `public/manifest.json` — name update "Fx Junait Vault" |

### 3. App Name Update
- `manifest.json`: name → "Fx Junait Vault", short_name → "FxJunait"
- `index.html`: title → "Fx Junait Vault"

