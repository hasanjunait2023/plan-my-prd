

## Plan: Last Week এর News Data Fetch করে Fundamental Bias Populate করা

### সমস্যা
ForexFactory API তে `ff_calendar_thisweek.json` রবিবারে খালি থাকে। DB তেও কোনো data নেই কারণ আগে কখনো populate হয়নি।

### সমাধান

**Edge Function Update — `fundamental-bias/index.ts`**

1. দুইটা URL থেকে data fetch করবে:
   - `ff_calendar_thisweek.json` (এই সপ্তাহ)
   - `ff_calendar_lastweek.json` (গত সপ্তাহ)
2. দুইটা response merge করবে — this week এর data priority পাবে
3. প্রতি currency এর জন্য latest released high/medium impact event বের করবে
4. Bias calculate করে DB তে upsert করবে

**Code Change:**
```typescript
const FF_THIS_WEEK = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
const FF_LAST_WEEK = 'https://nfs.faireconomy.media/ff_calendar_lastweek.json';

// Fetch both in parallel
const [thisWeekRes, lastWeekRes] = await Promise.all([
  fetch(FF_THIS_WEEK, ...),
  fetch(FF_LAST_WEEK, ...)
]);

// Merge: this week first, then last week
const allEvents = [...thisWeekEvents, ...lastWeekEvents];
```

**কোনো নতুন file বা table লাগবে না** — শুধু `supabase/functions/fundamental-bias/index.ts` এ পরিবর্তন।

### ফলাফল
- রবিবার/সোমবারেও গত সপ্তাহের news থেকে bias data থাকবে
- নতুন সপ্তাহে news release হলে সেটা automatically replace করবে
- DB persist থাকবে তাই পরবর্তী call এও data দেখাবে

### Files
| File | Action |
|------|--------|
| `supabase/functions/fundamental-bias/index.ts` | Edit — add last week fetch |

