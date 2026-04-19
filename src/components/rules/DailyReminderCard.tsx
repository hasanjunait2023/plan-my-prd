import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Bell, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function DailyReminderCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<'morning' | 'evening' | null>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [morning, setMorning] = useState(true);
  const [evening, setEvening] = useState(true);
  const [perPush, setPerPush] = useState(5);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('alert_settings')
        .select('id,rules_morning_push,rules_evening_push,rules_per_push')
        .limit(1)
        .maybeSingle();
      if (data) {
        setSettingsId(data.id);
        setMorning(data.rules_morning_push ?? true);
        setEvening(data.rules_evening_push ?? true);
        setPerPush(data.rules_per_push ?? 5);
      }
      setLoading(false);
    })();
  }, []);

  const persist = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      if (settingsId) {
        const { error } = await supabase
          .from('alert_settings')
          .update(patch)
          .eq('id', settingsId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('alert_settings')
          .insert(patch)
          .select('id')
          .single();
        if (error) throw error;
        setSettingsId(data.id);
      }
    } catch (e) {
      toast.error('Failed to save', { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const onToggleMorning = (v: boolean) => {
    setMorning(v);
    persist({ rules_morning_push: v });
  };
  const onToggleEvening = (v: boolean) => {
    setEvening(v);
    persist({ rules_evening_push: v });
  };
  const onSlideChange = (v: number[]) => {
    setPerPush(v[0]);
  };
  const onSlideCommit = (v: number[]) => {
    persist({ rules_per_push: v[0] });
  };

  const trigger = async (slot: 'morning' | 'evening') => {
    setTesting(slot);
    try {
      const { data, error } = await supabase.functions.invoke('rules-memorize-push', {
        body: { slot },
      });
      if (error) throw error;
      toast.success(`Sent ${slot}`, {
        description: `Telegram: ${data?.telegramSent ?? 0} · Push: ${data?.pushSent ?? 0}`,
      });
    } catch (e) {
      toast.error('Send failed', { description: (e as Error).message });
    } finally {
      setTesting(null);
    }
  };

  if (loading) return null;

  return (
    <Card className="border-border/30 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          Daily Memorization Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/20 bg-background/40">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-sm font-medium">Morning</p>
                <p className="text-[11px] text-muted-foreground">6:00 AM Dhaka</p>
              </div>
            </div>
            <Switch checked={morning} onCheckedChange={onToggleMorning} disabled={saving} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border/20 bg-background/40">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="text-sm font-medium">Evening</p>
                <p className="text-[11px] text-muted-foreground">10:00 PM Dhaka</p>
              </div>
            </div>
            <Switch checked={evening} onCheckedChange={onToggleEvening} disabled={saving} />
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Rules per push</span>
            <span className="text-sm font-semibold">{perPush}</span>
          </div>
          <Slider
            value={[perPush]}
            onValueChange={onSlideChange}
            onValueCommit={onSlideCommit}
            min={1}
            max={10}
            step={1}
            disabled={saving}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => trigger('morning')}
            disabled={testing !== null}
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            {testing === 'morning' ? 'Sending…' : 'Test morning'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => trigger('evening')}
            disabled={testing !== null}
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            {testing === 'evening' ? 'Sending…' : 'Test evening'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
