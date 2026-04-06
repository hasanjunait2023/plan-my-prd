import { Card } from '@/components/ui/card';
import { ImpactBadge } from './ImpactBadge';
import { ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export interface NewsItem {
  headline: string;
  link: string;
  pubDate: string;
  source: string;
  category: 'forex' | 'gold' | 'crypto';
  impact: string;
  currency?: string;
}

const categoryIcons: Record<string, string> = {
  forex: '💱',
  gold: '🥇',
  crypto: '₿',
};

interface NewsCardListProps {
  filter: 'all' | 'forex' | 'gold' | 'crypto';
  news: NewsItem[];
  isLoading: boolean;
}

function timeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recent';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'Recent';
  }
}

export function NewsCardList({ filter, news, isLoading }: NewsCardListProps) {
  const filtered = filter === 'all' ? news : news.filter(n => n.category === filter);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="bg-card/60 border-border/30 p-3">
            <div className="flex items-start gap-3">
              <Skeleton className="w-6 h-6 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-12 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">No news in this category</div>
      ) : (
        filtered.map((n, i) => (
          <a
            key={i}
            href={n.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="bg-card/60 border-border/30 p-3 hover:border-primary/30 transition-colors cursor-pointer group">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{categoryIcons[n.category]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-relaxed">
                    {n.headline}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {n.currency && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                        {n.currency}
                      </span>
                    )}
                    <ImpactBadge impact={n.impact} />
                    <span className="text-[10px] text-muted-foreground/60">{timeAgo(n.pubDate)}</span>
                    <span className="text-[10px] text-primary/50 ml-auto">{n.source}</span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0 mt-1" />
              </div>
            </Card>
          </a>
        ))
      )}
    </div>
  );
}
