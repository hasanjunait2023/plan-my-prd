

## Plan: Trading Rules — আলাদা Dedicated Page

### সমস্যা
Trading Rules এখন Settings page এর ভিতরে একটা ছোট card — শুধু add/delete/toggle করা যায়। কোনো analytics, adherence tracking, বা deep analysis নেই।

### সমাধান
একটা নতুন `/rules` page তৈরি করা যেটায় rules management + analytics দুটোই থাকবে।

### Page Structure

```text
┌──────────────────────────────────────────────┐
│  📋 Trading Rules                            │
│  "Your trading commandments & adherence"     │
├──────────────────────────────────────────────┤
│  Summary Cards (4 cards in a row)            │
│  [Total Rules] [Active] [Avg Score] [Streak] │
├──────────────────────────────────────────────┤
│  Rules Management Card                       │
│  - Add new rule (input + button)             │
│  - List of all rules with toggle/delete      │
│  - Category badge (optional tagging)         │
├──────────────────────────────────────────────┤
│  Rule Adherence Analytics Card               │
│  - Per-rule adherence % bar chart            │
│  - কোন rule সবচেয়ে বেশি ভাঙা হয়েছে        │
│  - কোন rule 100% মানা হয়েছে                 │
├──────────────────────────────────────────────┤
│  Rule Score Trend Chart                      │
│  - Line chart: trade-by-trade rule score %   │
│  - Shows improvement over time               │
├──────────────────────────────────────────────┤
│  Most Violated Rules Card                    │
│  - Top violated rules + violation reasons    │
│  - From ruleChecklist explanations in trades │
└──────────────────────────────────────────────┘
```

### Features

1. **Summary Cards** — Total rules, Active rules, Average rule score (from closed trades), Longest streak of 100% score
2. **Rules CRUD** — Same add/toggle/delete functionality, moved from Settings (Settings এ link রেখে দেব)
3. **Per-Rule Adherence** — Horizontal bar chart showing each rule's follow %, data from all trades' `ruleChecklist`
4. **Score Trend** — Line chart of `ruleScore` over time from completed trades
5. **Most Violated** — Rules sorted by violation count, with collected explanations

### Technical Changes

| File | Change |
|------|--------|
| `src/pages/TradingRules.tsx` | নতুন page — rules management + analytics |
| `src/App.tsx` | `/rules` route যোগ |
| `src/components/Layout.tsx` | Navigation এ Rules link যোগ |
| `src/pages/Settings.tsx` | Rules section সরিয়ে "Go to Rules page" link রাখা |

### Data Source
- Rules: `trading_rules` table (existing)
- Analytics: `trades` table এর `rule_checklist` (JSON array of RuleCheck) ও `rule_score` fields — already exist
- কোনো DB migration লাগবে না

