

## Plan: Navigation Bar Edit/Customize Feature

### কী হবে
Mobile bottom tab bar এবং Desktop top nav bar এ একটা **Edit** button থাকবে। সেখানে click করলে সব available pages/tools এর list দেখাবে। User চাইলে যেকোনো tool কে primary nav এ add/remove করতে পারবে। Selection localStorage এ save হবে।

### কিভাবে কাজ করবে

1. **Edit Mode UI**
   - Desktop: Tools dropdown এর পাশে একটা ছোট Edit (Pencil) icon। Click করলে একটা dialog/modal খুলবে
   - Mobile: Tools bottom sheet এর header এ Edit button। Click করলে same dialog খুলবে
   - Dialog এ সব nav items checkbox list হিসেবে দেখাবে — checked মানে primary bar এ আছে

2. **Customization Logic**
   - সর্বনিম্ন ৩টা এবং সর্বোচ্চ ৬টা (desktop) / ৫টা (mobile) item primary bar এ রাখা যাবে
   - Drag-to-reorder অথবা simple up/down arrow দিয়ে order change করা যাবে
   - "Reset to Default" button থাকবে

3. **State Persistence**
   - `localStorage` key: `tradevault-nav-config`
   - Format: `{ primaryItems: ['/dashboard', '/journal', ...], order: [...] }`
   - Layout component mount হলে localStorage থেকে config load করবে

### ফাইল পরিবর্তন

| ফাইল | কাজ |
|---|---|
| `src/hooks/useNavConfig.ts` | **নতুন** — nav config read/write hook (localStorage) |
| `src/components/NavEditDialog.tsx` | **নতুন** — Edit dialog with checkboxes + reorder |
| `src/components/Layout.tsx` | **আপডেট** — useNavConfig hook ব্যবহার করে dynamic primaryNavItems render, Edit button যোগ |

### UI Flow
```text
┌─────────────────────────────────────┐
│  NavEditDialog                      │
│  ┌───────────────────────────────┐  │
│  │ ☑ Dashboard        ↑ ↓       │  │
│  │ ☑ Journal           ↑ ↓      │  │
│  │ ☑ Analytics         ↑ ↓      │  │
│  │ ☐ Charts                     │  │
│  │ ☐ EMA Scan                   │  │
│  │ ☑ Spike Alerts      ↑ ↓     │  │
│  │ ☐ News                       │  │
│  │ ...                          │  │
│  └───────────────────────────────┘  │
│  [Reset Default]          [Save]    │
└─────────────────────────────────────┘
```

- Checked items = primary nav bar এ দেখাবে
- বাকিগুলো Tools dropdown/sheet এ থাকবে
- Max limit cross করলে warning দেখাবে

