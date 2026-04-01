

# Typography ও Color Scheme পরিবর্তন — Noto Serif Bengali + Red/Green/Black/White

## কী করবো

### 1. Font — Noto Serif Bengali
- `index.html` এ Google Fonts থেকে **Noto Serif Bengali** (weights: 400, 500, 600, 700) import করবো
- `src/index.css` এ `body` এর `font-family` পরিবর্তন: `'Noto Serif Bengali', serif`

### 2. Color Palette — Red, Green, Black, White
পুরো color scheme বদলে এই 4টা color এর combination এ নিয়ে আসবো:

| Role | Current | New |
|------|---------|-----|
| Background | Deep Navy `#0D1B2A` | **Black** `#0A0A0A` |
| Card | `#1A2B3C` | **Dark Gray** `#1A1A1A` |
| Foreground/Text | `#ECF0F1` | **White** `#F5F5F5` |
| Muted text | `#6B7E94` | **Gray** `#737373` |
| Primary accent | Teal `#00C9A7` | **Green** `#22C55E` |
| Destructive/Loss | `#E63946` | **Red** `#EF4444` |
| Profit | `#2ECC71` | **Green** `#22C55E` |
| Border | Navy tints | **Dark gray** `#262626` |
| Sidebar bg | Deep navy | **Near-black** `#0F0F0F` |
| Ring/focus | Teal | **Green** `#22C55E` |

### 3. Files to Change

| File | Change |
|------|--------|
| `index.html` | Google Fonts link add — Noto Serif Bengali |
| `src/index.css` | CSS variables update (all HSL values) + font-family change |
| `tailwind.config.ts` | কিছু change নেই — সব CSS variables based, তাই auto update হবে |

### মূল নীতি
- **Black background** + **white text** = high contrast base
- **Green** = profit, primary actions, active states
- **Red** = loss, destructive, warnings
- Teal/navy সব সরে যাবে — pure monochrome + red/green accent

