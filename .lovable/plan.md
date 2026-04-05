

## Plan: Forex/Gold/Crypto News Page — ForexFactory Style

### উদ্দেশ্য
একটা `/news` page তৈরি করা যেখানে ForexFactory Calendar এর মতো economic events + market news দেখাবে — forex pairs, gold, এবং bitcoin এর জন্য relevant news precisely filtered।

### Page Structure

```text
┌─────────────────────────────────────────────────┐
│ 📰 Market News & Economic Calendar              │
│ Forex, Gold & Crypto — আজকের important events   │
├─────────────────────────────────────────────────┤
│ [Today] [Tomorrow] [This Week]    [Filter ▼]    │
├─────────────────────────────────────────────────┤
│                                                  │
│  ── Section 1: Economic Calendar ──              │
│  ForexFactory-style table:                       │
│  Time | Currency | Impact | Event | Actual |     │
│       |          | 🔴🟠🟡 |       | Forecast |  │
│  ─────────────────────────────────────────────   │
│  9:00am  USD  🔴  ISM Services PMI  54.8  56.1  │
│  2:00pm  USD  🟠  Consumer Credit   11.4B  8.0B │
│  All Day EUR  🟡  French Bank Holiday            │
│                                                  │
│  ── Section 2: Market News Feed ──               │
│  Tabs: [All] [Forex] [Gold] [Crypto]             │
│  ┌──────────────────────────────────┐            │
│  │ 🔴 FOMC Minutes Signal...       │            │
│  │ USD • 2h ago • High Impact      │            │
│  ├──────────────────────────────────┤            │
│  │ 🥇 Gold Surges Past $2400...    │            │
│  │ XAUUSD • 4h ago • Medium        │            │
│  └──────────────────────────────────┘            │
│                                                  │
│  ── Section 3: Central Bank Rates ──             │
│  Small cards: USD 3.75% | EUR 2.15% | GBP 3.75% │
│              JPY 0.75% | AUD 4.10% | CHF 0.00%  │
└─────────────────────────────────────────────────┘
```

### Data Sources

**Option 1 — ForexFactory Scraping via Edge Function (recommended)**
- Edge function `fetch-forex-news` যেটা ForexFactory calendar page scrape করবে
- Economic calendar events parse করে JSON return করবে
- Firecrawl connector ব্যবহার করা যাবে scraping এর জন্য (already available)

**Option 2 — Free API alternatives**
- [Forex Factory XML/JSON feed](https://nfs.faireconomy.media/ff_calendar_thisweek.json) — free unofficial JSON endpoint
- এটা সবচেয়ে simple — কোনো scraping লাগবে না, direct JSON fetch

**Recommendation**: Option 2 (free JSON endpoint) দিয়ে শুরু করা — simple, fast, reliable। পরে Firecrawl দিয়ে enhance করা যাবে।

### Sections বিস্তারিত

#### 1. Economic Calendar (ForexFactory Style)
- Date grouping (Today, Tomorrow, etc.)
- Impact color coding: 🔴 High, 🟠 Medium, 🟡 Low
- Currency flag + code
- Event name, Actual vs Forecast vs Previous
- Currency filter: শুধু USD, EUR, GBP, JPY, AUD, CHF, CAD, NZD — যেগুলো forex এ trade করো
- Gold/Oil related events highlight করা (CPI, PPI, Interest Rate — gold mover)

#### 2. Market News Feed
- Tabs: All | Forex | Gold | Crypto
- প্রতিটা news card: headline, currency tag, time ago, impact level
- Edge function দিয়ে news fetch (Perplexity API বা Firecrawl দিয়ে latest news search)

#### 3. Central Bank Rates
- ৮টা major currency এর current interest rates
- Static data initially, later auto-update

### Technical Changes

| File | Change |
|------|--------|
| `src/pages/MarketNews.tsx` | নতুন page — calendar + news + rates |
| `supabase/functions/fetch-forex-calendar/index.ts` | FF calendar JSON fetch + parse |
| `src/App.tsx` | `/news` route যোগ |
| `src/components/Layout.tsx` | Navigation এ News link যোগ (Newspaper icon) |
| `src/components/news/EconomicCalendar.tsx` | Calendar table component |
| `src/components/news/NewsCard.tsx` | Individual news item card |
| `src/components/news/CentralBankRates.tsx` | Interest rates cards |
| `src/components/news/ImpactBadge.tsx` | Impact level badge (High/Med/Low) |

### Phase approach
- **Phase 1** (এখন): Economic Calendar (FF JSON) + Central Bank Rates (static) + basic UI
- **Phase 2** (পরে): Live news feed via Perplexity/Firecrawl, auto-refresh, push notifications

