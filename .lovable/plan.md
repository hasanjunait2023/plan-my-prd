

# সমস্ত Page এ Currency Strength এর Premium UI Theme Apply

## বর্তমান অবস্থা
Currency Strength page এ premium UI আছে — glass-morphism cards, gradient backgrounds, icon badges, backdrop-blur, glowing shadows। কিন্তু বাকি pages (Dashboard, Analytics, Psychology, Settings, NewTrade, TradeJournal) এ plain `<Card>` ব্যবহার করা হয়েছে কোনো premium styling ছাড়া।

## কী করবো

### Premium UI Pattern (Currency Strength থেকে নেওয়া)
- **Cards**: `border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]`
- **Page Headers**: Icon badge (rounded bg with icon) + bold title + subtitle
- **Section Headers**: Small icon badge + bold title inside CardHeader
- **Metric Cards**: Gradient backgrounds (`from-color/20 to-transparent`), glowing accents
- **Buttons/Tabs**: `bg-card/50 backdrop-blur-sm border-border/40` style
- **Layout**: Consistent `max-w-6xl mx-auto` spacing

### Files to Change

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Dashboard — premium header, glass cards, gradient metric cards, glowing equity curve |
| `src/pages/Analytics.tsx` | Premium header, gradient metric grid, glass chart cards |
| `src/pages/Psychology.tsx` | Premium header, glass form card, gradient trend charts |
| `src/pages/Settings.tsx` | Premium header, glass setting cards |
| `src/pages/NewTrade.tsx` | Premium header, glass form sections |
| `src/pages/TradeJournal.tsx` | Premium header, glass panel borders |
| `src/components/AppSidebar.tsx` | Sidebar — glass effect, subtle glow on logo |
| `src/components/Layout.tsx` | Header bar — glass effect with backdrop-blur |

### প্রতিটা Page এর Changes

**Dashboard (Index.tsx)**:
- Header: Icon badge + "Dashboard" title + subtitle
- Top 4 metric cards: Gradient bg variants (green for P&L, blue for win rate, etc.)
- Chart cards: Glass card style
- Streak/Rule/Psych cards: Subtle gradient accents

**Analytics**:
- Header: Icon badge + title
- 10-metric grid: Individual gradient accent colors
- Equity Curve + Daily P&L cards: Glass style with section icon badges

**Psychology**:
- Header: Brain icon badge
- Form card: Glass card, gradient auto-score section
- Chart cards: Glass style

**Settings**:
- Header: Settings icon badge
- Form cards: Glass style with section icon badges
- Save button: Gradient or glow effect

**NewTrade**:
- Header: Plus icon badge
- Form sections: Glass cards with section icon badges

**TradeJournal**:
- Header: BookOpen icon badge with glow
- Panel container: Glass border effect

**Sidebar**:
- Logo: Gradient glow effect
- Active item: Subtle gradient highlight

**Layout Header**:
- `backdrop-blur-md bg-background/80 border-border/30` — glass top bar

### মূল নীতি
- সব page এ **একই card style** — glass + shadow + border opacity
- সব page header এ **icon badge + bold title + muted subtitle**
- Chart tooltip styles সব জায়গায় consistent
- কোনো functional change নেই — শুধু visual upgrade

