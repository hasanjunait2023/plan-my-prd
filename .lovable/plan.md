

# যেকোনো পেজের যেকোনো সেকশন Hide/Unhide System

## 🎯 লক্ষ্য
যেকোনো পেজে (LifeOS, CurrencyStrength, Analytics, Habits, Journal — সবগুলো) প্রতিটি section এর পাশে একটা ছোট eye/hide আইকন থাকবে। ক্লিক করলে section টা hide হবে। প্রতিটি পেজের নিচে/উপরে একটা "Hidden Sections" panel থাকবে যেখান থেকে আবার unhide করা যাবে। সব preference cloud-synced হবে (already-existing `useSyncedPreference` দিয়ে)।

## 🧩 আর্কিটেকচার

### এক জায়গায় universal, পুরো অ্যাপে কাজ করবে

```text
┌────────────────────────────────────────────────────┐
│ <SectionVisibilityProvider pageKey="currency">     │
│   ┌──────────────────────────────────────────────┐ │
│   │ <HiddenSectionsBar />  ← top floating chip   │ │
│   ├──────────────────────────────────────────────┤ │
│   │ <HideableSection id="summary" title="..."> ⊗ │ │
│   │   <SummaryCards />                           │ │
│   │ </HideableSection>                           │ │
│   ├──────────────────────────────────────────────┤ │
│   │ <HideableSection id="heatmap" title="..."> ⊗ │ │
│   │   <StrengthHeatmap />                        │ │
│   │ </HideableSection>                           │ │
│   └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

## 📁 নতুন ফাইল

### 1. `src/contexts/SectionVisibilityContext.tsx`
- Context + Provider যেটা `pageKey` (যেমন `"currency"`, `"lifeos"`, `"analytics"`) নেয়
- ভিতরে `useSyncedPreference<string[]>(\`hidden.${pageKey}\`, [])` ব্যবহার করে cloud-sync করে
- expose করে: `hiddenIds`, `hide(id)`, `show(id)`, `toggle(id)`, `showAll()`, `register(id, title)`
- registered sections একটা `Map` এ রাখবে যাতে hidden bar এ আবার সঠিক title দেখানো যায়

### 2. `src/components/common/HideableSection.tsx`
- Wrapper component, props: `id: string`, `title: string`, `children`
- Mount হলে `register(id, title)` call করে
- যদি `hiddenIds.includes(id)` → কিছু render করে না (null)
- Render হলে top-right কোনায় একটা floating eye-off button (group-hover এ visible) দেখায় যেটা ক্লিক করলে `hide(id)` হয়
- Pure CSS, existing Card style এর সাথে মানানসই (border highlight on hover)

### 3. `src/components/common/HiddenSectionsBar.tsx`
- যদি `hiddenIds.length === 0` → render করে না
- যদি hidden থাকে → page এর উপরে একটা compact bar: `"3 sections hidden — [Section A ✕] [Section B ✕] ... [Show All]"`
- প্রতিটি chip এ ক্লিক করলে সেই section টা show হয়
- Subtle muted styling, sticky না, just inline

## 🔧 পরিবর্তিত ফাইল (পেজগুলো)

প্রতিটি পেজে minimal change:

1. পেজ কম্পোনেন্টের রুটে `<SectionVisibilityProvider pageKey="...">` wrap করা
2. Heading এর পরে `<HiddenSectionsBar />` বসানো
3. প্রতিটি বড় section (Card / panel) কে `<HideableSection id="..." title="...">` দিয়ে wrap করা

**প্রথম দফায় cover করা হবে এই পেজগুলো:**
- `CurrencyStrength.tsx` — already 12 sections আছে, just wrap each one
- `LifeOS.tsx` — 6 tabs, প্রতি tab এর ভিতরের cards (TodayTab, WeekTab, etc.)
- `Analytics.tsx`
- `HabitTracking.tsx`
- `TradeJournal.tsx`
- `MarketNews.tsx`
- `TradeIntelligence.tsx`
- `Index.tsx` (Dashboard)

**পরের দফায় বাকি পেজগুলো একই pattern এ যোগ হতে পারে।**

## 🎨 UX ডিটেইল

- **Hide button**: Section card এর top-right কোনায় ছোট ghost button, default এ semi-transparent, hover এ পুরো দৃশ্যমান। Icon: `EyeOff` (lucide)
- **Hidden bar**: পেজের header এর নিচে subtle row, `bg-muted/30 border-dashed`, প্রতিটি hidden section একটা small badge হিসেবে — ক্লিক করলে আবার দেখা যাবে
- **"Show All" button**: যদি 2+ sections hidden, একটা ছোট link
- **Animation**: কোনো heavy animation না, শুধু conditional render (পারফর্ম্যান্স ভাল রাখতে)
- **Drag-and-drop conflict নেই**: CurrencyStrength এর existing reorder handle (left side) আর hide button (right side) আলাদা জায়গায় থাকবে

## 💾 Storage

- Key pattern: `hidden.${pageKey}` (যেমন `hidden.currency`, `hidden.lifeos`)
- Value: hidden section id এর string array
- Already-existing `PreferencesContext` ব্যবহার হবে → automatically cloud-synced + localStorage cached + cross-device sync

## 🧪 Edge cases

- যদি কোনো hidden id আর সেই পেজে exist না করে (পরে কোড বদলে গেলে), `register` time এ track হবে — হারানো id গুলো hidden bar থেকে graceful বাদ পড়বে
- Provider unmount এ registered map cleanup হবে
- কোনো লুপ/realtime issue নাই, কারণ `useSyncedPreference` already তে stable

## ⏱ Scope

- ৩টা নতুন ফাইল
- ~৮টা পেজে ছোট ছোট wrapping change
- কোনো DB migration লাগবে না (existing `user_preferences` table যথেষ্ট)

