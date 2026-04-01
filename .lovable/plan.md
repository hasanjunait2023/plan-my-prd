

# Trade Journal — Notebook/Diary Style Redesign

## ধারণা
তোমার uploaded OneNote screenshot এর মতো — বাম পাশে **sections/dates** এর navigation, আর ডান পাশে **pages/trades** এর content। একটা notebook/diary এর feel — date wise sections, trade wise pages, structured ও revision-friendly।

## Layout Design

```text
┌─────────────────────────────────────────────────────────┐
│  📒 Trade Journal                          [Search] [+] │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  SECTIONS    │  PAGES (trades)     CONTENT AREA         │
│  (dates)     │                                          │
│              │  ┌─────────┐  ┌──────────────────────┐   │
│  ▸ Apr 2026  │  │ Trade 1 │  │                      │   │
│    31 Mar    │  │ Trade 2 │  │  Full Trade Document  │   │
│  ► 30 Mar ◄ │  │ Trade 3 │  │  (diary page view)    │   │
│    29 Mar    │  │         │  │                      │   │
│    28 Mar    │  │         │  │  screenshots, notes,  │   │
│              │  │         │  │  analysis, mistakes   │   │
│  ▸ Mar 2026  │  │         │  │                      │   │
│              │  │         │  │                      │   │
│              │  └─────────┘  └──────────────────────┘   │
│              │                                          │
│  Daily P&L   │  Pair | Outcome                          │
│  Win/Loss    │  P&L summary                             │
└──────────────┴──────────────────────────────────────────┘
```

## 3-Panel Notebook Layout

### Panel 1 — Date Sections (বাম sidebar)
- মাস অনুযায়ী grouped dates (collapsible months)
- প্রতিটা date এ ছোট summary: trade count, total P&L, win/loss color indicator
- Active date highlighted (accent border left)
- Search/filter bar at top

### Panel 2 — Trade Pages (মাঝের narrow column)
- Selected date এর trades list — compact cards
- Pair name, direction icon, outcome badge, P&L
- Active trade highlighted
- Click করলে Panel 3 তে full document load হয়

### Panel 3 — Content Area (ডান পাশের বড় area)
- Existing `TradeDocument` component — full diary page view
- Scrollable, all sections visible (screenshots, notes, analysis, psychology)
- Revision-friendly reading experience

## Technical Changes

| File | Change |
|------|--------|
| `src/pages/TradeJournal.tsx` | Complete rewrite — 3-panel notebook layout with date sidebar, trade list, and document content area |
| `src/components/journal/NotebookSidebar.tsx` (new) | Date sections panel — month groups, date items with P&L summaries |
| `src/components/journal/TradePageList.tsx` (new) | Trade list panel for selected date — compact trade items |
| `src/components/journal/TradeDocument.tsx` | Minor tweaks — remove back button (navigation is via sidebar now), adjust max-width for panel fit |
| `src/index.css` | Notebook-specific styles — section dividers, active states, notebook paper texture/lines (subtle) |

## Key Details
- **Resizable panels** using existing `resizable` UI component
- **Keyboard navigation**: Arrow keys দিয়ে dates আর trades navigate করা যাবে
- **Mobile**: Panels collapse — date list → trade list → document (step-by-step drill-down)
- **Empty state**: যদি কোনো date select না থাকে, content area তে "একটি তারিখ বেছে নাও" message
- **Notebook feel**: Subtle left border accent on active items, clean dividers between sections, paper-like content background (`#1A2B3C` slightly lighter for content area)

