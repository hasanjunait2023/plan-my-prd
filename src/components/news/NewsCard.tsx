import { Card } from '@/components/ui/card';
import { ImpactBadge } from './ImpactBadge';
import { ExternalLink } from 'lucide-react';

interface NewsItem {
  headline: string;
  category: 'forex' | 'gold' | 'crypto';
  impact: string;
  timeAgo: string;
  currency?: string;
  source?: string;
}

const categoryIcons: Record<string, string> = {
  forex: '💱',
  gold: '🥇',
  crypto: '₿',
};

// Static placeholder news — will be replaced with live feed in Phase 2
const staticNews: NewsItem[] = [
  { headline: 'FOMC Minutes: Fed Officials Signal Cautious Rate Path', category: 'forex', impact: 'High', timeAgo: 'Recent', currency: 'USD' },
  { headline: 'Gold Holds Above $3100 Amid Safe-Haven Demand', category: 'gold', impact: 'High', timeAgo: 'Recent', currency: 'XAUUSD' },
  { headline: 'EUR/USD Consolidates Near 1.0850 Before ECB Decision', category: 'forex', impact: 'Medium', timeAgo: 'Recent', currency: 'EUR' },
  { headline: 'Bitcoin Tests $85K Resistance as ETF Inflows Surge', category: 'crypto', impact: 'Medium', timeAgo: 'Recent', currency: 'BTC' },
  { headline: 'GBP/USD Drops on Weak UK Services PMI', category: 'forex', impact: 'Medium', timeAgo: 'Recent', currency: 'GBP' },
  { headline: 'Silver Breaks Out as Gold Rally Extends', category: 'gold', impact: 'Low', timeAgo: 'Recent', currency: 'XAGUSD' },
];

interface NewsCardListProps {
  filter: 'all' | 'forex' | 'gold' | 'crypto';
}

export function NewsCardList({ filter }: NewsCardListProps) {
  const filtered = filter === 'all' ? staticNews : staticNews.filter(n => n.category === filter);

  return (
    <div className="space-y-2">
      {filtered.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">No news in this category</div>
      ) : (
        filtered.map((n, i) => (
          <Card key={i} className="bg-card/60 border-border/30 p-3 hover:border-primary/30 transition-colors cursor-pointer group">
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{categoryIcons[n.category]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-relaxed">
                  {n.headline}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  {n.currency && (
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                      {n.currency}
                    </span>
                  )}
                  <ImpactBadge impact={n.impact} />
                  <span className="text-[10px] text-muted-foreground/60">{n.timeAgo}</span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0 mt-1" />
            </div>
          </Card>
        ))
      )}
      <p className="text-[10px] text-muted-foreground/50 text-center pt-2">
        Live news feed coming in Phase 2 — Perplexity/Firecrawl integration
      </p>
    </div>
  );
}
