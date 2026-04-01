

# Session Tracker Component — Alternative Plan

## সমস্যা
LuxAlgo Sessions Pine Script indicator TradingView embed widget এ add করা সম্ভব না — embed API শুধু built-in studies support করে, custom Pine Script না।

## সমাধান
Chart এর পাশে/উপরে একটা **Session Status Panel** component বানানো যেটা Pine Script এর dashboard এর মতো কাজ করবে:

### Features
1. **4 Sessions** — New York (13:00-22:00 UTC), London (07:00-16:00 UTC), Tokyo (00:00-09:00 UTC), Sydney (21:00-06:00 UTC)
2. **Live Status** — Active/Inactive badge (real-time UTC clock অনুযায়ী)
3. **Color coded** — NY: #ff5d00, London: #2157f3, Tokyo: #e91e63, Sydney: #ffeb3b
4. **Time remaining** — Active session এ কত সময় বাকি
5. **Session overlap indicator** — কোন sessions overlap করছে সেটা দেখাবে

### যেখানে যেখানে যোগ হবে
- Correlation Pairs page — chart grid এর উপরে
- Commodities page
- Crypto page

### UI Layout
```text
┌──────────────────────────────────────────────┐
│ 🟠 New York: Active (2h 15m left)            │
│ 🔵 London: Active (45m left)                 │
│ 🔴 Tokyo: Inactive (starts in 3h)            │
│ 🟡 Sydney: Inactive (starts in 8h)           │
│ ⚡ Overlap: NY + London                      │
└──────────────────────────────────────────────┘
```

### Files
| Action | File |
|--------|------|
| **Create** | `src/components/correlation/SessionPanel.tsx` |
| **Modify** | `src/pages/CorrelationPairs.tsx` — panel যোগ |
| **Modify** | `src/pages/Commodities.tsx` — panel যোগ |
| **Modify** | `src/pages/Crypto.tsx` — panel যোগ |

### Technical
- `setInterval` দিয়ে প্রতি minute এ UTC time check করে session status update
- কোনো API call লাগবে না — pure client-side time calculation
- Compact horizontal layout (mobile responsive)

