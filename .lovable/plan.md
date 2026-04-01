

# Sidebar → Top Navigation Tab Bar

## কী করবো
Left sidebar সরিয়ে একটা premium top navigation bar বানাবো — Logo বামে, nav tabs মাঝে, সব একই header এ।

## Layout Structure
```text
┌──────────────────────────────────────────────────────┐
│ [Logo] TradeVault PRO   │  Tab Tab Tab Tab Tab Tab  │
│                         │      (icon + text)        │
├──────────────────────────────────────────────────────┤
│                                                      │
│                    Page Content                       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Changes

### 1. `src/components/Layout.tsx` — পুরো restructure
- `SidebarProvider`, `AppSidebar`, `SidebarTrigger` সব সরাবো
- নতুন top header bar:
  - বামে: Logo badge + "TradeVault PRO" text
  - মাঝে/ডানে: Nav tabs — icon + text, horizontal scroll (mobile এ)
  - Glass style: `backdrop-blur-md bg-background/80 border-b border-border/30`
- Active tab: `bg-primary/15 text-primary border-b-2 border-primary` effect
- Mobile: horizontally scrollable tab strip, compact spacing

### 2. `src/components/AppSidebar.tsx` — Delete
- আর দরকার নেই, সব navigation Layout এর মধ্যে চলে যাবে

### 3. `src/App.tsx` — Minor cleanup
- `SidebarProvider` wrapper আর দরকার নেই (Layout থেকে সরানো হবে)

### Premium Styling
- Tab items: glass hover effect (`hover:bg-card/50`), smooth transitions
- Active tab: subtle gradient underline + primary color glow
- Logo: gradient badge with glow (existing style preserve)
- Mobile: hamburger menu বা horizontal scroll — compact icon-only tabs

### Files

| File | Action |
|------|--------|
| `src/components/Layout.tsx` | Rewrite — top nav bar with tabs + content area |
| `src/components/AppSidebar.tsx` | Delete — no longer needed |
| `src/App.tsx` | Remove SidebarProvider dependency |

