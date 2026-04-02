

## Plan: Post Analysis + Revision — দুইটা নতুন Situation যোগ করা

### ১. Post Analysis Situation (Trade Finalize এর পরে)

Trade CLOSED হওয়ার পর একটা নতুন section আসবে যেখানে:

- **Trading Rules Checklist**: তোমার সব active trading rules দেখাবে (from `trading_rules` table), প্রতিটার পাশে checkbox — tick করো যেগুলো মেনেছো
- **Rule Violation Explanation**: যে rule tick করোনি সেটার নিচে একটা text input আসবে — কেন মানোনি তা লেখার জন্য
- **Post Analysis Score**: কতটা rule মানা হয়েছে তার ভিত্তিতে auto-calculated score (e.g., 8/10 rules followed = 80%)
- Score সাথে সাথে DB তে save হবে

**Flow**: Trade finalize → CLOSED হলে TradeDocument এ নতুন "Post Analysis" section দেখাবে → rules checklist + explanation → score auto-calculate → save

### ২. Revision Situation (Weekend/পরে Review)

CLOSED trade এ আরেকটা section — simple, distraction-free:

- **Revision Notes**: একটা textarea — trade আবার দেখে কি শিখলে তা লেখো
- **Key Takeaway**: একটা short one-liner input — এই trade থেকে মূল শিক্ষা
- **Would Take Again?**: Yes/No toggle — এই trade আবার নিতে কিনা
- **Revised Rating**: 1-10 slider — এখন এই trade কে কত দিবে
- **Revised At**: timestamp — কবে revision করেছো

এটা TradeDocument এর একদম শেষে থাকবে, collapsible — expand করলে দেখা যাবে, না করলে just "📝 Revision" label দেখাবে with status (done/pending)।

### DB Changes (Migration)

`trades` table এ নতুন columns:

| Column | Type | Default |
|--------|------|---------|
| `rule_checklist` | `jsonb` | `'[]'::jsonb` |
| `rule_score` | `numeric` | `0` |
| `revision_notes` | `text` | `''` |
| `revision_takeaway` | `text` | `''` |
| `revision_would_take_again` | `boolean` | `null` |
| `revision_rating` | `integer` | `null` |
| `revised_at` | `timestamptz` | `null` |

`rule_checklist` format: `[{ "ruleId": "...", "ruleText": "...", "followed": true, "explanation": "" }]`

### Code Changes

| File | Change |
|------|--------|
| `src/types/trade.ts` | Trade interface এ নতুন fields যোগ |
| `src/hooks/useTrades.ts` | mapRow ও useUpdateTrade এ নতুন fields map করা |
| `src/components/journal/PostAnalysisSection.tsx` | **নতুন** — Rules checklist + score component |
| `src/components/journal/RevisionSection.tsx` | **নতুন** — Revision notes, takeaway, rating (collapsible) |
| `src/components/journal/TradeDocument.tsx` | দুইটা নতুন section যোগ — Post Analysis ও Revision |
| `src/data/mockTrades.ts` | Mock data তে নতুন fields যোগ |

### UX Design

- **Post Analysis** — trade CLOSED হলে একটা highlighted card দেখাবে "📋 Post Analysis করো" — rules checklist interactive, save button সহ
- **Revision** — collapsible section, minimal — শুধু যখন দরকার তখন expand করবে, distraction free
- Score গুলো TradeDocument header এ ছোট badges এ দেখাবে (Rule Score: 80%, Revision: 7/10)

