import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/dist/module/lib/cors-headers.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RSS_FEEDS = [
  { url: "https://www.forexlive.com/feed", source: "ForexLive", defaultCategory: "forex" },
  { url: "https://www.fxstreet.com/rss", source: "FXStreet", defaultCategory: "forex" },
  { url: "https://www.kitco.com/feed/rss/news/gold", source: "Kitco", defaultCategory: "gold" },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk", defaultCategory: "crypto" },
];

interface NewsItem {
  headline: string;
  link: string;
  pubDate: string;
  source: string;
  category: "forex" | "gold" | "crypto";
  impact: "High" | "Medium" | "Low";
  currency?: string;
}

function detectCategory(text: string, defaultCat: string): "forex" | "gold" | "crypto" {
  const lower = text.toLowerCase();
  if (/gold|xau|xagusd|silver|precious.?metal/i.test(lower)) return "gold";
  if (/bitcoin|btc|crypto|ethereum|eth|altcoin|defi|nft/i.test(lower)) return "crypto";
  if (/eur|gbp|usd|jpy|chf|aud|nzd|cad|forex|currency|dollar|yen|pound|euro/i.test(lower)) return "forex";
  return defaultCat as any;
}

function detectImpact(text: string): "High" | "Medium" | "Low" {
  const lower = text.toLowerCase();
  if (/fomc|fed |nfp|non.?farm|cpi|inflation|interest.?rate|rate.?decision|central.?bank|ecb|boe|boj|rba|employment/i.test(lower)) return "High";
  if (/pmi|gdp|retail.?sales|trade.?balance|housing|manufacturing|sentiment|consumer/i.test(lower)) return "Medium";
  return "Low";
}

function detectCurrency(text: string): string | undefined {
  const lower = text.toLowerCase();
  const pairs: Record<string, string> = {
    "eur/usd": "EUR/USD", "gbp/usd": "GBP/USD", "usd/jpy": "USD/JPY",
    "aud/usd": "AUD/USD", "usd/cad": "USD/CAD", "nzd/usd": "NZD/USD",
    "xau/usd": "XAU/USD", "xauusd": "XAU/USD", "gold": "XAU/USD",
    "bitcoin": "BTC/USD", "btc": "BTC/USD", "ethereum": "ETH/USD",
  };
  for (const [key, val] of Object.entries(pairs)) {
    if (lower.includes(key)) return val;
  }
  const currencies = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "NZD", "CHF"];
  for (const c of currencies) {
    if (text.includes(c)) return c;
  }
  return undefined;
}

function extractItems(xml: string): { title: string; link: string; pubDate: string }[] {
  const items: { title: string; link: string; pubDate: string }[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || "";
    const link = block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() || "";
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || "";
    if (title) items.push({ title, link, pubDate });
  }
  return items;
}

async function fetchFeed(feed: { url: string; source: string; defaultCategory: string }): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { "User-Agent": "TradeVaultPro/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const xml = await res.text();
    const rawItems = extractItems(xml);
    return rawItems.slice(0, 15).map((item) => {
      const combined = `${item.title} ${item.link}`;
      return {
        headline: item.title,
        link: item.link,
        pubDate: item.pubDate || new Date().toISOString(),
        source: feed.source,
        category: detectCategory(combined, feed.defaultCategory),
        impact: detectImpact(item.title),
        currency: detectCurrency(combined),
      };
    });
  } catch (e) {
    console.error(`Failed to fetch ${feed.source}:`, e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));
    const allNews: NewsItem[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") allNews.push(...r.value);
    }

    // Sort by date descending
    allNews.sort((a, b) => {
      const da = new Date(a.pubDate).getTime() || 0;
      const db = new Date(b.pubDate).getTime() || 0;
      return db - da;
    });

    // Deduplicate by headline similarity
    const seen = new Set<string>();
    const unique = allNews.filter((n) => {
      const key = n.headline.toLowerCase().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return new Response(
      JSON.stringify({ news: unique.slice(0, 40), fetchedAt: new Date().toISOString() }),
      { headers: { ...CORS, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    console.error("fetch-market-news error:", e);
    return new Response(
      JSON.stringify({ error: "Failed to fetch news", news: [] }),
      { headers: { ...CORS, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
