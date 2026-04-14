

## Plan: Notification Master Control Panel in Settings

### বর্তমান অবস্থা
Settings page এ **5টা** notification toggle আছে: Confluence, EMA Shift, Risk Breach, Session Reminder, MT5 Trade।  
কিন্তু আরও **5টা** notification system চলছে যেগুলোর **কোনো on/off toggle নেই**:
1. **Namaz Reminder** — নামাজের সময় Telegram alert
2. **Habit Reminder** — Daily habit reminder + weekly recap
3. **News Alert** — High-impact economic news alert
4. **Price Spike Alert** — Sudden price movement alert
5. **Volume Spike Alert** — Volume spike detection alert

### যা করবো

**Step 1: Database — `alert_settings` table এ নতুন columns যোগ**
```sql
ALTER TABLE alert_settings
  ADD COLUMN namaz_reminder_alert boolean NOT NULL DEFAULT true,
  ADD COLUMN habit_reminder_alert boolean NOT NULL DEFAULT true,
  ADD COLUMN news_alert boolean NOT NULL DEFAULT true,
  ADD COLUMN price_spike_alert boolean NOT NULL DEFAULT true,
  ADD COLUMN volume_spike_alert boolean NOT NULL DEFAULT true;
```

**Step 2: Settings UI আপডেট**
Settings page এ Telegram Alerts section এ নতুন 5টা toggle যোগ করবো:
- 🕌 Namaz Reminders — ওয়াক্ত ভিত্তিক আজান reminder
- ✅ Habit Reminders — Daily habit + weekly recap alerts
- 📰 News Alerts — High-impact economic news notifications
- 📈 Price Spike Alerts — Sudden price movement alerts
- 📊 Volume Spike Alerts — Unusual volume detection alerts

প্রতিটার জন্য Switch toggle + description।

**Step 3: Edge Functions আপডেট — প্রতিটা function এ toggle check যোগ**
প্রতিটা edge function শুরুতে `alert_settings` থেকে নিজের toggle চেক করবে — `false` হলে skip করবে:
- `namaz-reminder` → `namaz_reminder_alert` চেক
- `habit-reminder` + `habit-daily-summary` + `habit-weekly-recap` → `habit_reminder_alert` চেক
- `news-alert` → `news_alert` চেক
- `price-spike-detector` → `price_spike_alert` চেক
- `volume-spike-scanner` → `volume_spike_alert` চেক

### Files Changed
| File | Change |
|---|---|
| Migration | `alert_settings` table এ 5 নতুন boolean columns |
| `src/pages/Settings.tsx` | 5 নতুন toggle + state + save logic |
| `src/integrations/supabase/types.ts` | Auto-updated |
| `supabase/functions/namaz-reminder/index.ts` | Toggle check যোগ |
| `supabase/functions/habit-reminder/index.ts` | Toggle check যোগ |
| `supabase/functions/habit-daily-summary/index.ts` | Toggle check যোগ |
| `supabase/functions/habit-weekly-recap/index.ts` | Toggle check যোগ |
| `supabase/functions/news-alert/index.ts` | Toggle check যোগ |
| `supabase/functions/price-spike-detector/index.ts` | Toggle check যোগ |
| `supabase/functions/volume-spike-scanner/index.ts` | Toggle check যোগ |

### Result
Settings page থেকে **সব 10টা** notification system individually on/off করা যাবে। Toggle save করলে instantly edge functions সেই অনুযায়ী behave করবে।

