

## User Goal
App-এর ভেতরের **Floating Assistive Touch button** (watchlist + chart) — সেটা phone-এর **outside**-এ (home screen / অন্য apps-এর উপরে) floating bubble হিসেবে দেখানো।

## কঠিন সত্য (Reality Check)

এটা **technically সম্ভব না** current setup-এ। কারণ:

1. **এই app একটা PWA / web app** (browser-এ চলে, native না)। 
2. Phone-এর অন্য apps-এর উপরে floating bubble দেখানোর জন্য Android-এ **`SYSTEM_ALERT_WINDOW`** permission দরকার (Facebook Messenger Chat Heads-এর মতো)।
3. এই permission **শুধু native Android app**-ই নিতে পারে — PWA / browser কখনোই পারে না (security restriction)।
4. iOS-এ এটা **একদম impossible** — Apple কোনো app-কেই system-wide overlay দেয় না (Apple-এর strict policy)।

অর্থাৎ — Web app বা PWA হিসেবে install করা থাকলে, button-টা শুধু app open থাকা অবস্থায়ই দেখাবে। App close/background-এ গেলে hide হয়ে যাবে।

## সমাধান: Capacitor + Native Android Plugin

যদি সত্যিই এটা চান, তাহলে app-কে **Capacitor দিয়ে native Android app** বানাতে হবে এবং একটা **System Overlay (Bubble)** plugin add করতে হবে।

### Approach Options

**Option A — Capacitor + Custom Bubble Plugin (Android only)**
- App-কে Capacitor wrap করে native Android build করতে হবে
- Custom Capacitor plugin বানিয়ে Android-এর `WindowManager` + `TYPE_APPLICATION_OVERLAY` ব্যবহার করতে হবে
- User-কে phone settings থেকে "Display over other apps" permission দিতে হবে
- Bubble click করলে app open হবে (deep link দিয়ে directly watchlist screen-এ)
- iOS এ available থাকবে না

**Option B — Quick Settings Tile + Notification Shortcut**
- Persistent notification বানানো (always visible at top of phone)
- Notification-এ "Open Watchlist" shortcut button থাকবে
- Tap করলে app খুলে directly watchlist panel-এ চলে যাবে
- বেশি simple, কিন্তু floating bubble-এর experience না

**Option C — Android Home Screen Widget**
- Android home screen-এ একটা small widget যেটা strength data দেখাবে
- Tap করলে app খুলবে
- Floating না, but always visible on home screen

### Comparison

| Feature | A: Floating Bubble | B: Notification | C: Widget |
|---------|-------------------|-----------------|-----------|
| In-app experience match | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Implementation effort | High (custom plugin) | Low | Medium |
| Works on iOS | ❌ | ⚠️ Limited | ❌ |
| Works on Android | ✅ | ✅ | ✅ |
| Needs special permission | ✅ Display over apps | ❌ | ❌ |
| Currently a PWA → needs Capacitor | ✅ | ✅ | ✅ |

## আমার Recommendation

আপনি যেহেতু এখন একটা **PWA** (`public/manifest.json` দেখলাম, install page-ও আছে), এবং কোনো Capacitor setup নেই — তাই এই feature add করতে গেলে **পুরো architecture change** করতে হবে।

**আমার পরামর্শ:**
1. **প্রথমে সিদ্ধান্ত নিন** — PWA রেখে দিবেন, নাকি Capacitor + native Android-এ migrate করবেন?
2. যদি native-এ যান, তাহলে **Option A (Floating Bubble)** আসলেই in-app FAB-এর মতো experience দিবে, কিন্তু এটা শুধু Android-এ কাজ করবে এবং user-কে manually permission দিতে হবে।
3. **Native build** করার জন্য আপনাকে নিজে GitHub-এ export করে Android Studio দিয়ে build করতে হবে (Lovable sandbox-এ এটা possible না)।

## পরবর্তী Decision

কোন path-এ যেতে চান সেটা জানালে আমি সেই অনুযায়ী implementation plan দিবো।

