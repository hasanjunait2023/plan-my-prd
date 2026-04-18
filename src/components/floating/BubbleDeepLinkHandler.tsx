import { useEffect } from 'react';
import { App as CapacitorApp, type URLOpenListenerEvent } from '@capacitor/app';
import { useNavigate } from 'react-router-dom';
import { useFloatingWatchlist } from '@/contexts/FloatingWatchlistContext';
import { Capacitor } from '@capacitor/core';

/**
 * Listens for deep links from the native floating bubble.
 * When user taps the bubble, native plugin launches app with URL like:
 *   fxjunait://bubble?action=watchlist
 *   fxjunait://bubble?action=chart&symbol=EURUSD
 */
export function BubbleDeepLinkHandler() {
  const navigate = useNavigate();
  const { openWatchlist, openChart } = useFloatingWatchlist();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handler = (event: URLOpenListenerEvent) => {
      try {
        const url = new URL(event.url);
        const action = url.searchParams.get('action');
        const symbol = url.searchParams.get('symbol');

        // Always navigate to currency strength as a safe landing route
        navigate('/currency-strength');

        if (action === 'chart' && symbol) {
          setTimeout(() => openChart(symbol), 200);
        } else {
          setTimeout(() => openWatchlist(), 200);
        }
      } catch (e) {
        console.error('[BubbleDeepLink] parse failed', e);
      }
    };

    let sub: { remove: () => void } | undefined;
    CapacitorApp.addListener('appUrlOpen', handler).then((s) => { sub = s; });

    return () => { sub?.remove(); };
  }, [navigate, openWatchlist, openChart]);

  return null;
}
