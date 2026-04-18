# 🫧 Floating Bubble Setup Guide (Native Android)

এই guide-টা follow করলে app-এর **inside floating button**-টাই system-wide bubble হিসেবে phone-এর যেকোনো screen-এর উপরে দেখাবে (Facebook Messenger Chat Heads-এর মতো)।

> ⚠️ **Important**: এটা **শুধু Android**-এ কাজ করবে। iOS-এ Apple কোনো app-কেই system-wide overlay দেয় না।

---

## ✅ যা আগে থেকেই add করা আছে

- `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/app` — installed
- `capacitor.config.ts` — configured (appId, hot-reload server URL)
- `src/lib/floatingBubble.ts` — TypeScript wrapper for native plugin
- `src/components/floating/BubbleDeepLinkHandler.tsx` — bubble tap → opens watchlist
- `src/components/floating/FloatingBubbleSettings.tsx` — Settings page UI to enable/grant permission
- Settings page → "System-wide Floating Bubble" card

---

## 🚀 Step 1 — Project Local-এ আনুন

Lovable sandbox-এ Android Studio চালানো যায় না। তাই project export করতে হবে:

1. Lovable-এ top-right **GitHub** button → **Connect to GitHub** → Export
2. নিজের machine-এ:
   ```bash
   git clone <your-repo-url>
   cd <project>
   npm install
   ```

---

## 📱 Step 2 — Android Platform Add

```bash
npx cap add android
npx cap update android
npm run build
npx cap sync
```

এর পর `android/` folder তৈরি হবে।

---

## 🔧 Step 3 — Native Plugin Files তৈরি করুন

### 3.1. AndroidManifest.xml-এ permission add

`android/app/src/main/AndroidManifest.xml` খুলুন এবং `<manifest>` tag-এর ভিতরে (top-এ) add করুন:

```xml
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

`<application>` tag-এর ভিতরে service register করুন (existing `<activity>`-এর পাশে):

```xml
<service
    android:name=".FloatingBubbleService"
    android:exported="false"
    android:foregroundServiceType="specialUse" />
```

App-এর `<activity>`-তে deep link intent filter add করুন:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="fxjunait" />
</intent-filter>
```

---

### 3.2. Plugin Java/Kotlin file তৈরি

`android/app/src/main/java/app/lovable/c21dee520e7f40aa980f0561830f9121/FloatingBubblePlugin.java` তৈরি করুন:

```java
package app.lovable.c21dee520e7f40aa980f0561830f9121;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FloatingBubble")
public class FloatingBubblePlugin extends Plugin {

    @PluginMethod
    public void hasOverlayPermission(PluginCall call) {
        boolean granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                || Settings.canDrawOverlays(getContext());
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                && !Settings.canDrawOverlays(getContext())) {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void showBubble(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                && !Settings.canDrawOverlays(getContext())) {
            call.reject("Overlay permission not granted");
            return;
        }
        Intent svc = new Intent(getContext(), FloatingBubbleService.class);
        svc.putExtra("route", call.getString("route", "/currency-strength"));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(svc);
        } else {
            getContext().startService(svc);
        }
        call.resolve();
    }

    @PluginMethod
    public void hideBubble(PluginCall call) {
        getContext().stopService(new Intent(getContext(), FloatingBubbleService.class));
        call.resolve();
    }

    @PluginMethod
    public void isBubbleVisible(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("visible", FloatingBubbleService.isRunning);
        call.resolve(ret);
    }
}
```

---

### 3.3. FloatingBubbleService তৈরি

একই folder-এ `FloatingBubbleService.java` তৈরি করুন:

```java
package app.lovable.c21dee520e7f40aa980f0561830f9121;

import android.app.*;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.view.*;
import android.widget.ImageView;
import androidx.core.app.NotificationCompat;

public class FloatingBubbleService extends Service {
    public static boolean isRunning = false;
    private WindowManager wm;
    private View bubbleView;
    private static final String CHANNEL_ID = "floating_bubble_channel";

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onCreate() {
        super.onCreate();
        startForegroundNotification();
        addBubbleToWindow();
        isRunning = true;
    }

    private void startForegroundNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "Floating Bubble", NotificationManager.IMPORTANCE_LOW);
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(ch);
        }
        Notification n = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("FxJunait Bubble Active")
            .setContentText("Tap bubble to open watchlist")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .build();
        startForeground(1, n);
    }

    private void addBubbleToWindow() {
        wm = (WindowManager) getSystemService(WINDOW_SERVICE);

        // Create a circular bubble view programmatically (or inflate XML)
        ImageView bubble = new ImageView(this);
        bubble.setImageResource(android.R.drawable.ic_menu_compass);
        bubble.setBackgroundResource(android.R.drawable.btn_default);
        int size = (int) (56 * getResources().getDisplayMetrics().density);

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            size, size, type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 100;
        params.y = 300;

        bubble.setOnTouchListener(new View.OnTouchListener() {
            int initX, initY; float touchX, touchY; boolean moved;
            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initX = params.x; initY = params.y;
                        touchX = e.getRawX(); touchY = e.getRawY();
                        moved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int dx = (int)(e.getRawX() - touchX);
                        int dy = (int)(e.getRawY() - touchY);
                        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) moved = true;
                        params.x = initX + dx; params.y = initY + dy;
                        wm.updateViewLayout(bubbleView, params);
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!moved) openApp();
                        return true;
                }
                return false;
            }
        });

        bubbleView = bubble;
        wm.addView(bubbleView, params);
    }

    private void openApp() {
        Intent i = new Intent(Intent.ACTION_VIEW,
            Uri.parse("fxjunait://bubble?action=watchlist"));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(i);
    }

    @Override
    public void onDestroy() {
        if (bubbleView != null && wm != null) wm.removeView(bubbleView);
        isRunning = false;
        super.onDestroy();
    }
}
```

---

### 3.4. Plugin register করুন `MainActivity.java`-তে

`MainActivity.java` খুলে এমন বানান:

```java
package app.lovable.c21dee520e7f40aa980f0561830f9121;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FloatingBubblePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

---

## ▶️ Step 4 — Build & Run

```bash
npx cap sync android
npx cap open android      # Android Studio খুলবে
```

Android Studio-তে:
1. Gradle sync শেষ হওয়া পর্যন্ত wait করুন
2. Device/emulator select করুন
3. ▶ Run button চাপুন

---

## 🔐 Step 5 — Permission Grant (User-এর phone-এ)

App-এ Settings → "System-wide Floating Bubble" → **Grant** চাপলে phone-এর "Display over other apps" page খুলবে। সেখান থেকে FxJunait-কে allow করুন। ফিরে এসে toggle ON করুন।

---

## 🔄 Future Updates

Web code change করার পর প্রতিবার:
```bash
git pull
npm install
npm run build
npx cap sync android
```

তারপর Android Studio-তে Run।

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| Bubble দেখা যাচ্ছে না | Settings → Apps → FxJunait → Display over other apps **Allow** |
| Bubble tap করলে app খুলছে না | `AndroidManifest.xml`-এ deep link `<intent-filter>` add হয়েছে কিনা চেক |
| Foreground service crash | Android 14+ এ `foregroundServiceType="specialUse"` আছে কিনা চেক |
| Plugin not found error | `MainActivity.java`-তে `registerPlugin(FloatingBubblePlugin.class)` আছে কিনা |

---

📖 **Read more**: https://lovable.dev/blog/2025-01-22-the-complete-guide-to-building-mobile-apps-with-lovable
