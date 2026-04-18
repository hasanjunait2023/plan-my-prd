import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ShieldAlert, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { FloatingBubble, isNativeAndroid } from '@/lib/floatingBubble';

const STORAGE_KEY = 'fab-bubble-enabled';

export function FloatingBubbleSettings() {
  const native = isNativeAndroid();
  const [enabled, setEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [checking, setChecking] = useState(false);

  const refreshPermission = async () => {
    if (!native) return;
    setChecking(true);
    try {
      const { granted } = await FloatingBubble.hasOverlayPermission();
      setHasPermission(granted);
    } catch (e) {
      console.error('[FloatingBubble] permission check failed', e);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { refreshPermission(); }, []);

  const handleToggle = async (next: boolean) => {
    if (!native) {
      toast.error('Floating bubble শুধু native Android app-এ কাজ করবে। Web/PWA-তে available না।');
      return;
    }

    if (next) {
      const { granted } = await FloatingBubble.hasOverlayPermission();
      if (!granted) {
        toast.message('Permission দরকার', {
          description: '"Display over other apps" allow করুন তারপর ফিরে আসুন।',
        });
        await FloatingBubble.requestOverlayPermission();
        return;
      }
      await FloatingBubble.showBubble({ route: '/currency-strength' });
      toast.success('Floating bubble চালু হলো');
    } else {
      await FloatingBubble.hideBubble();
      toast.success('Floating bubble বন্ধ হলো');
    }
    setEnabled(next);
    try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
  };

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          System-wide Floating Bubble
          {native ? (
            <Badge variant="outline" className="ml-2">Android Native</Badge>
          ) : (
            <Badge variant="outline" className="ml-2 text-muted-foreground">Web (unavailable)</Badge>
          )}
        </CardTitle>
        <CardDescription>
          App-এর বাইরে যেকোনো screen-এর উপরে floating bubble দেখাবে। Tap করলে watchlist auto-open হবে।
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!native && (
          <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm flex gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
            <div>
              এই feature শুধু **native Android app** build করার পর কাজ করবে। GitHub export → 
              <code className="mx-1 px-1 rounded bg-muted">npx cap add android</code> → 
              <code className="mx-1 px-1 rounded bg-muted">npx cap sync</code> → Android Studio-তে run।
              বিস্তারিত: <code className="mx-1 px-1 rounded bg-muted">FLOATING_BUBBLE_SETUP.md</code>
            </div>
          </div>
        )}

        {native && (
          <div className="rounded-md border border-border/40 bg-muted/30 p-3 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              Overlay permission
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={hasPermission ? 'default' : 'destructive'}>
                {hasPermission ? 'Granted' : 'Not granted'}
              </Badge>
              <Button size="sm" variant="outline" onClick={refreshPermission} disabled={checking}>
                Refresh
              </Button>
              {!hasPermission && (
                <Button size="sm" onClick={() => FloatingBubble.requestOverlayPermission()}>
                  Grant
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-base">Enable floating bubble</Label>
            <p className="text-xs text-muted-foreground mt-1">
              চালু থাকলে phone-এর যেকোনো জায়গায় bubble দেখাবে।
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} disabled={!native} />
        </div>
      </CardContent>
    </Card>
  );
}
