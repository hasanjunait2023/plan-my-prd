

# Mobile Bottom Navigation Bar — Premium Concept

## কী করবো
Mobile viewport এ (md breakpoint এর নিচে) top nav tabs লুকিয়ে একটা **fixed bottom bar** দেখাবো — iOS/Android app এর মতো premium feel।

## Layout Structure
```text
Desktop (md+):
┌─ [Logo] TradeVault PRO  │  Tab Tab Tab Tab ─┐
├──────────────────────────────────────────────┤
│                 Page Content                 │
└──────────────────────────────────────────────┘

Mobile (<md):
┌─ [Logo] TradeVault PRO ─────────────────────┐
├──────────────────────────────────────────────┤
│                 Page Content                 │
│              (pb-20 for spacing)             │
├──────────────────────────────────────────────┤
│  🏠  📖  ➕  📊  🧠  📈  ⚙️               │
│  Home Jrnl New  Ana  Psy  Str  Set          │
└──────────────────────────────────────────────┘
```

## Changes — শুধু `src/components/Layout.tsx`

### Top Header
- Nav tabs section: `hidden md:flex` — mobile এ লুকাবে
- Logo সবসময় দেখাবে

### Bottom Bar (mobile only)
- `fixed bottom-0 z-50 md:hidden`
- Glass style: `backdrop-blur-md bg-background/90 border-t border-border/30`
- 7টা nav item — icon (20px) + tiny label (10px) নিচে
- Active: primary color icon + label, top glow dot
- Inactive: muted color
- Safe area padding: `pb-[env(safe-area-inset-bottom)]` for notched phones

### Main Content
- Mobile: `pb-20` যাতে bottom bar content ঢেকে না দেয়

### Premium Touches
- Active item এ উপরে ছোট gradient dot/line indicator
- Active icon এ subtle glow: `drop-shadow(0 0 6px primary)`
- Smooth transition on tap
- "New Trade" center item optionally slightly raised/highlighted

| File | Change |
|------|--------|
| `src/components/Layout.tsx` | Top nav hidden on mobile, add fixed bottom bar, main padding adjustment |

