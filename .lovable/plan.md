

# Light/Dark Theme Toggle — Plan

## কি করবো
পুরো site এ light ও dark দুইটা theme support যোগ করবো। Mobile ও desktop থেকে toggle button দিয়ে switch করা যাবে। Light theme টা professional, clean look এ হবে।

## Approach
- CSS variables দিয়ে `.light` class এর জন্য আলাদা color palette define করবো
- একটা `ThemeProvider` context বানাবো যেটা localStorage এ theme save করবে
- Header এ Sun/Moon toggle button যোগ করবো

## Light Theme Color Palette (Professional)
- **Background**: `#F8FAFC` (slate-50) — soft white, চোখে comfortable
- **Card**: `#FFFFFF` with subtle shadow
- **Foreground**: `#0F172A` (slate-900)
- **Muted**: `#F1F5F9` (slate-100)
- **Border**: `#E2E8F0` (slate-200)
- **Primary**: same green `142 71% 45%` — brand consistency
- **Profit/Loss/Warning**: same semantic colors

## Changes

### 1. `src/index.css` — Light theme variables যোগ
`:root` কে dark theme হিসেবে রাখবো, `.light` class এ light values দেবো:
```css
.light {
  --background: 210 40% 98%;
  --foreground: 222 84% 5%;
  --card: 0 0% 100%;
  --card-foreground: 222 84% 5%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --border: 214 32% 91%;
  /* ... etc */
}
```

### 2. `src/contexts/ThemeContext.tsx` — নতুন file
- `ThemeProvider` component — `localStorage` থেকে theme read/write
- `useTheme()` hook — `{ theme, toggleTheme }`
- `<html>` element এ `light` class add/remove করবে

### 3. `src/main.tsx` — ThemeProvider wrap
- App কে `ThemeProvider` দিয়ে wrap করবো

### 4. `src/components/Layout.tsx` — Toggle button যোগ
- Header এর bell icon এর পাশে Sun/Moon icon toggle
- Mobile bottom nav তেও accessible

### 5. `index.html` — Flash prevention
- `<script>` tag দিয়ে page load এ localStorage check করে instant class apply — white flash avoid

| Action | File |
|--------|------|
| **Modify** | `src/index.css` — `.light` class variables যোগ |
| **Create** | `src/contexts/ThemeContext.tsx` — theme provider + hook |
| **Modify** | `src/main.tsx` — ThemeProvider wrap |
| **Modify** | `src/components/Layout.tsx` — toggle button যোগ |
| **Modify** | `index.html` — flash prevention script |

