

## Plan: Bangladesh Time (UTC+6) — Global Default Timezone Setup

### মূল নীতি
সম্পূর্ণ app জুড়ে **Bangladesh Standard Time (BST, UTC+6)** হবে primary timezone। UTC internally ব্যবহার হবে calculation এ, কিন্তু **UI তে সবসময় BD time দেখাবে** এবং **Telegram notifications এও BD time** থাকবে।

---

### যা যা Change হবে

#### 1. Shared Timezone Utility
নতুন file `src/lib/timezone.ts` — একটা central utility:
- `toBDTime(date)` — UTC to BD time convert
- `formatBDTime(date, format)` — BD time formatted string
- `BD_OFFSET = 6` constant
- `isForexClosed(date)` — weekend check (Friday 21:00 UTC to Sunday 22:00 UTC)
- `isDST(region, date)` — US/EU/AU DST detection
- DST-aware session hours config

#### 2. SessionPanel.tsx (Currency Strength page)
- Session hours **BD time এ** দেখাবে (e.g., Tokyo: 06:00–15:00 🇧🇩)
- Header clock: `🇧🇩 18:30` primary, UTC secondary/small
- Sydney session timing fix: 22:00–07:00 UTC (winter)
- DST-aware dynamic hours
- Weekend/holiday detection → "MARKET CLOSED" banner
- Overlap times BD তে দেখাবে

#### 3. SessionTracker.tsx (Trade Intelligence page)
- Sydney session add করা হবে
- সব time BD তে display
- Kill zone times BD তে convert
- Same DST + weekend logic

#### 4. Telegram Edge Functions — BD Time Format
| Function | Change |
|----------|--------|
| `news-alert` | Event time BD তে পাঠাবে: "🇧🇩 20:30" instead of "14:30 UTC" |
| `habit-reminder` | Reminder message এ BD time |
| `habit-daily-summary` | Summary তে BD time |
| `habit-weekly-recap` | Recap তে BD time |
| `telegram-trade-alerts` | Session reminder BD time এ: "London opens at 🇧🇩 13:00" |
| `store-currency-strength` | Alert message এ BD time |

#### 5. Previous Plan (Market Session Hours) — Modified
সবকিছু BD time perspective থেকে:

| Session | UTC (Winter) | 🇧🇩 BD Time | Duration |
|---------|-------------|-------------|----------|
| Sydney | 22:00–07:00 | 04:00–13:00 | 9h |
| Tokyo | 00:00–09:00 | 06:00–15:00 | 9h |
| London | 07:00–16:00 | 13:00–22:00 | 9h |
| New York | 12:00–21:00 | 18:00–03:00 | 9h |

**DST (Summer) BD Time:**
| Session | BD Time |
|---------|---------|
| Sydney (AEDT) | 03:00–12:00 |
| London (BST) | 12:00–21:00 |
| New York (EDT) | 17:00–02:00 |

**Best Overlaps (BD Time):**
| Overlap | BD Time |
|---------|---------|
| London + NY (Best) | 18:00–22:00 🇧🇩 |
| Tokyo + London | 13:00–15:00 🇧🇩 |
| Sydney + Tokyo | 06:00–13:00 🇧🇩 |

**Market বন্ধ:** শুক্রবার রাত 03:00 🇧🇩 (Friday NY close) থেকে রবিবার রাত 04:00 🇧🇩 (Sunday Sydney open)

---

### Memory Update
`mem://index.md` এ Core rule add হবে:
> **Bangladesh Time (UTC+6) is the primary timezone.** All UI displays and Telegram notifications use BD time. UTC used internally only.

---

### Technical Details

**New file:**
| File | Purpose |
|------|---------|
| `src/lib/timezone.ts` | BD time utilities, DST detection, market closure check |

**Modified files:**
| File | Changes |
|------|---------|
| `src/components/correlation/SessionPanel.tsx` | BD time display, DST, weekend/holiday, Sydney fix |
| `src/components/intelligence/SessionTracker.tsx` | Sydney add, BD time, DST, weekend |
| `supabase/functions/news-alert/index.ts` | Time format → BD |
| `supabase/functions/habit-reminder/index.ts` | Message time → BD |
| `supabase/functions/habit-daily-summary/index.ts` | Time → BD |
| `supabase/functions/habit-weekly-recap/index.ts` | Time → BD |
| `supabase/functions/telegram-trade-alerts/index.ts` | Session times → BD |
| `supabase/functions/store-currency-strength/index.ts` | Alert time → BD |

**No DB changes needed.**

