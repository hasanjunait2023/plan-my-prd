

# Mobile Nav Bar Restructure — Profile Dropdown Plan

## সমস্যা
Mobile bottom bar এ 9টা nav item আছে — অনেক বেশি, cramped দেখায়।

## পরিকল্পনা

### Bottom Bar থেকে সরানো হবে
- **Psychology** (Brain)
- **Intel** (Zap)
- **Settings** (Settings)

এগুলো header এর **Avatar/Profile button** এ click করলে dropdown menu তে দেখাবে।

### Mobile Bottom Bar এ থাকবে (6টা item)
1. Dashboard (Home)
2. Journal (Jrnl)
3. New Trade (New)
4. Analytics (Ana)
5. Strength (Str)
6. EMA Scan (EMA)

### Profile Dropdown (Avatar click)
Avatar click করলে একটা dropdown menu open হবে (DropdownMenu component ব্যবহার করে):
- 🧠 Psychology
- ⚡ Intel
- ⚙️ Settings
- (divider)
- Sign Out (placeholder)

**Desktop nav এ কোনো পরিবর্তন হবে না** — সব 9টা tab আগের মতোই থাকবে।

### Technical Changes

**File: `src/components/Layout.tsx`**

1. `navItems` array কে দুই ভাগ করা:
   - `mainNavItems` — 6টা (Dashboard → EMA Scan)
   - `profileMenuItems` — 3টা (Psychology, Intel, Settings)

2. Avatar কে `DropdownMenu` দিয়ে wrap করা — click এ profileMenuItems দেখাবে with icons, `useNavigate` দিয়ে route change

3. Mobile bottom bar শুধু `mainNavItems` render করবে

4. Desktop nav সব items (mainNavItems + profileMenuItems) দেখাবে আগের মতোই

