import { useLocation } from 'react-router-dom';
import { FloatingWatchlistProvider } from '@/contexts/FloatingWatchlistContext';
import { FloatingAssistiveButton } from './FloatingAssistiveButton';
import { WatchlistPanel } from './WatchlistPanel';
import { FloatingChartWindow } from './FloatingChartWindow';
import { BubbleDeepLinkHandler } from './BubbleDeepLinkHandler';

/**
 * Mounts the floating watchlist system globally.
 * Hides itself on /auth route.
 */
export function FloatingWatchlist() {
  const location = useLocation();
  if (location.pathname.startsWith('/auth')) return null;

  return (
    <FloatingWatchlistProvider>
      <BubbleDeepLinkHandler />
      <FloatingAssistiveButton />
      <WatchlistPanel />
      <FloatingChartWindow />
    </FloatingWatchlistProvider>
  );
}
