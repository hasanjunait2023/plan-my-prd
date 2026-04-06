

## Plan: Free Live News Feed — API ছাড়া

### সমস্যা
Market News section এ static hardcoded headlines আছে। Perplexity API ছাড়া free তে real news আনতে হবে।

### Solution: Free RSS Feeds via Edge Function

Multiple free RSS feeds scrape করে news আনা — কোনো API key লাগবে না:

| Source | Feed URL | Category |
|--------|----------|----------|
| ForexLive | `https://www.forexlive.com/feed` | forex |
| FXStreet | `https://www.fxstreet.com/rss` | forex |
| Kitco Gold | `https://www.kitco.com/feed/rss/news/gold` | gold |
| CoinDesk | `https://www.coindesk.com/arc/outboundfeeds/rss/` | crypto |
| Investing.com | `https://www.investing.com/rss/news.rss` | all |

### Technical Changes

#### 1. Edge Function: `fetch-market-news/index.ts` (নতুন)
- ৩-৪টা free RSS feed fetch করবে parallel এ
- XML parse করে normalized JSON বানাবে (headline, link, pubDate, category)
- Category auto-detect: title/description এ "gold", "XAU" থাকলে → gold; "bitcoin", "BTC", "crypto" → crypto; বাকি → forex
- Impact assign: keyword match (FOMC, CPI, NFP → High; PMI, GDP → Medium; বাকি → Low)
- Response cache: 5 min

#### 2. `src/components/news/NewsCard.tsx` — Update
- Static data সরিয়ে edge function থেকে live data render
- প্রতিটা card এ: headline (clickable link), source name, time ago (real), category icon, impact badge
- Loading skeleton যোগ

#### 3. `src/pages/MarketNews.tsx` — Update
- নতুন `useQuery` যোগ `fetch-market-news` edge function এর জন্য
- `NewsCardList` এ live data pass করা

### Data Flow

```text
RSS Feeds (free) → Edge Function (XML parse) → JSON → React Query → NewsCardList
```

### কোনো API key লাগবে না — সম্পূর্ণ free।

