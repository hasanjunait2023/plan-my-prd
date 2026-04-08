

## Plan: Option C — Segmented Tab Bar with Tools Dropdown

### কি হবে
Desktop nav কে **5টা primary tab + "Tools" dropdown** এ ভাগ করা হবে। Mobile bottom bar এ **5 primary + center Tools button** যেটা bottom sheet open করবে।

### Desktop Nav Structure
```text
┌─────────────────────────────────────────────────────────────────┐
│ 🟢 TradeVault │ Dashboard  Journal  New Trade  Analytics  Strength │ ⊞ Tools ▾ │ 🌙 🔔 👤 │
│     PRO       │ ════════                                          │           │           │
└─────────────────────────────────────────────────────────────────┘
```

**"Tools" dropdown** — 3-column categorized grid:
```text
┌──────────────────────────────────────────┐
│  📈 Market        │ 🧠 Analysis  │ ⚙️ Other    │
│  Charts           │ Intel        │ MT5         │
│  EMA Scan         │ Psychology   │ Commodities │
│  Correlation      │ Rules        │ Crypto      │
│  News             │              │ Habits      │
│                   │              │ Settings    │
└──────────────────────────────────────────┘
```

### Mobile Bottom Bar
```text
┌────────────────────────────────┐
│ 🏠  📖  ⊕  📊  ⊞Tools        │
└────────────────────────────────┘
```
- "Tools" button tap → Sheet (bottom slide-up) with all secondary items in grid
- Active sub-page → Tools button এ **green dot badge**

### Visual Design
- **Active tab:** `bg-primary/15 border border-primary/30 shadow-[0_0_12px_hsla(145,63%,49%,0.2)]` — glass-morphism pill
- **Hover:** `hover:bg-card/60` with slight brightness lift
- **Tools dropdown:** glass background (`bg-card/95 backdrop-blur-xl`), rounded-xl, grid layout
- **Tools badge:** green dot when any sub-page is currently active
- **Category headers:** uppercase, muted, `text-[10px]` tracking-widest

### Technical Details

**Modified file:** `src/components/Layout.tsx`

**Changes:**
1. Split `allNavItems` into `primaryNavItems` (5: Dashboard, Journal, New Trade, Analytics, Strength) and `toolsNavItems` (3 categories)
2. Desktop: Replace horizontal scroll nav with 5 pill tabs + Radix `DropdownMenu` for Tools
3. Mobile: Replace 7-item bottom bar with 5 items (Dashboard, Journal, New Trade, Analytics, Tools)
4. Tools button on mobile → uses existing `Sheet` component (bottom side) with categorized grid
5. Active detection: check if current route matches any tools sub-item → show badge dot on Tools button

**No new dependencies.** Uses existing Radix DropdownMenu + Sheet components.

