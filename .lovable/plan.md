

## Plan: Fundamental Bias — Mobile Compact + Aligned Row Highlighting + Gap Fix

### পরিবর্তন ৩টি

**1. Aligned Row Color Highlighting**
- Bullish Aligned rows: পুরো row এ subtle emerald/green background tint (`bg-emerald-500/8`)
- Bearish Aligned rows: পুরো row এ subtle red background tint (`bg-red-500/8`)
- Currency name text ও bold হবে aligned rows এ

**2. Table Gap Fix (Fundamental Impact → Alignment)**
- `Fundamental Impact` column এর fixed `max-width` সরিয়ে দেওয়া হবে
- Alignment column width কমানো হবে (`w-[96px]` → `w-[72px]`)
- Table এ `table-fixed` layout ব্যবহার করা হবে যেন columns evenly distribute হয় এবং মাঝে বড় gap না থাকে

**3. Mobile Single-Screen Fit (No Scroll)**
- Font sizes আরও compact করা: mobile এ `text-[9px]` body, `text-[8px]` headers
- Row padding `py-2` → `py-1` (mobile)
- Strength bar সরিয়ে দেওয়া হবে mobile এ (space save)
- A/F/P line mobile এ hide করা হবে — শুধু bias chip + event name দেখাবে
- Header padding compact করা হবে
- `useIsMobile()` hook ব্যবহার করে conditional rendering

### File
| File | Action |
|------|--------|
| `src/components/correlation/FundamentalBias.tsx` | Edit — row highlighting, gap fix, mobile compact |

