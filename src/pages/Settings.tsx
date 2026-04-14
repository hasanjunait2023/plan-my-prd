import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Shield, Plus, Trash2, Bell, Send, ExternalLink, Smartphone, Key, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAccountSettings, useSaveAccountSettings } from '@/hooks/useAccountSettings';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { defaultAccountSettings } from '@/data/mockData';
import { registerPushSubscription, unregisterPushSubscription, isPushSubscribed } from '@/lib/pushNotification';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const glassCard = "border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]";

interface ApiKeyInfo {
  id: string;
  provider: string;
  label: string;
  is_active: boolean;
  calls_today: number;
  daily_limit: number;
  last_used_at: string | null;
  last_error_at: string | null;
  priority: number;
  created_at: string;
}

const Settings = () => {
  const { user } = useAuth();
  const { data: accountSettings = defaultAccountSettings } = useAccountSettings();
  const saveSettings = useSaveAccountSettings();
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [maxRisk, setMaxRisk] = useState('');
  const [dailyLoss, setDailyLoss] = useState('');
  const [maxTrades, setMaxTrades] = useState('');

  // Telegram alert settings
  const [chatId, setChatId] = useState('');
  const [confluenceAlert, setConfluenceAlert] = useState(true);
  const [minGrade, setMinGrade] = useState('A');
  const [emaShiftAlert, setEmaShiftAlert] = useState(true);
  const [riskBreachAlert, setRiskBreachAlert] = useState(true);
  const [sessionReminderAlert, setSessionReminderAlert] = useState(true);
  const [mt5TradeAlert, setMt5TradeAlert] = useState(true);
  const [namazReminderAlert, setNamazReminderAlert] = useState(true);
  const [habitReminderAlert, setHabitReminderAlert] = useState(true);
  const [newsAlert, setNewsAlert] = useState(true);
  const [priceSpikeAlert, setPriceSpikeAlert] = useState(true);
  const [volumeSpikeAlert, setVolumeSpikeAlert] = useState(true);
  const [mindJournalChatId, setMindJournalChatId] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [alertSettingsId, setAlertSettingsId] = useState<string | null>(null);

  // Push notification
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // API Key Management
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [addingKey, setAddingKey] = useState(false);

  // Sync form state when settings load
  useEffect(() => {
    setBalance(accountSettings.startingBalance.toString());
    setCurrency(accountSettings.currency);
    setMaxRisk(accountSettings.maxRiskPercent.toString());
    setDailyLoss(accountSettings.dailyLossLimit.toString());
    setMaxTrades(accountSettings.maxTradesPerDay.toString());
  }, [accountSettings]);

  useEffect(() => {
    loadAlertSettings();
    isPushSubscribed().then(setPushEnabled);
    loadApiKeys();
  }, []);

  const loadAlertSettings = async () => {
    const { data } = await supabase
      .from('alert_settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      setAlertSettingsId(data.id);
      setChatId(data.telegram_chat_id || '');
      setConfluenceAlert(data.confluence_alert);
      setMinGrade(data.min_confluence_grade);
      setEmaShiftAlert(data.ema_shift_alert);
      setRiskBreachAlert(data.risk_breach_alert);
      setSessionReminderAlert(data.session_reminder_alert);
      setMt5TradeAlert(data.mt5_trade_alert);
      setNamazReminderAlert((data as any).namaz_reminder_alert ?? true);
      setHabitReminderAlert((data as any).habit_reminder_alert ?? true);
      setNewsAlert((data as any).news_alert ?? true);
      setPriceSpikeAlert((data as any).price_spike_alert ?? true);
      setVolumeSpikeAlert((data as any).volume_spike_alert ?? true);
      setMindJournalChatId((data as any).mind_journal_chat_id || '');
    }
  };

  const loadApiKeys = async () => {
    setLoadingKeys(true);
    try {
      const resp = await supabase.functions.invoke('manage-api-keys', {
        body: { action: 'list' },
      });
      if (resp.data?.keys) {
        setApiKeys(resp.data.keys);
      }
    } catch (err) {
      console.error('Failed to load API keys:', err);
    }
    setLoadingKeys(false);
  };

  const addApiKey = async () => {
    if (!newKeyValue.trim()) { toast.error('API key দিতে হবে'); return; }
    setAddingKey(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-api-keys', {
        body: {
          action: 'add',
          api_key: newKeyValue.trim(),
          label: newKeyLabel.trim() || `Key ${apiKeys.length + 1}`,
          provider: 'twelvedata',
          daily_limit: 800,
          priority: apiKeys.length,
        },
      });
      if (error) throw error;
      toast.success('API key যোগ হয়েছে!');
      setNewKeyValue('');
      setNewKeyLabel('');
      await loadApiKeys();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add key');
    }
    setAddingKey(false);
  };

  const deleteApiKey = async (id: string) => {
    try {
      await supabase.functions.invoke('manage-api-keys', {
        body: { action: 'delete', id },
      });
      toast.success('Key মুছে ফেলা হয়েছে');
      await loadApiKeys();
    } catch { toast.error('Failed to delete key'); }
  };

  const toggleApiKey = async (id: string, isActive: boolean) => {
    try {
      await supabase.functions.invoke('manage-api-keys', {
        body: { action: 'toggle', id, is_active: !isActive },
      });
      await loadApiKeys();
    } catch { toast.error('Failed to toggle key'); }
  };

  const saveAlertSettings = async () => {
    setSavingAlerts(true);
    try {
      if (alertSettingsId) {
        await supabase
          .from('alert_settings')
          .update({
            telegram_chat_id: chatId || null,
            confluence_alert: confluenceAlert,
            min_confluence_grade: minGrade,
            ema_shift_alert: emaShiftAlert,
            risk_breach_alert: riskBreachAlert,
            session_reminder_alert: sessionReminderAlert,
            mt5_trade_alert: mt5TradeAlert,
            namaz_reminder_alert: namazReminderAlert,
            habit_reminder_alert: habitReminderAlert,
            news_alert: newsAlert,
            price_spike_alert: priceSpikeAlert,
            volume_spike_alert: volumeSpikeAlert,
            mind_journal_chat_id: mindJournalChatId || null,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', alertSettingsId);
      } else {
        const { data } = await supabase
          .from('alert_settings')
          .insert({
            telegram_chat_id: chatId || null,
            confluence_alert: confluenceAlert,
            min_confluence_grade: minGrade,
            ema_shift_alert: emaShiftAlert,
            risk_breach_alert: riskBreachAlert,
            session_reminder_alert: sessionReminderAlert,
            mt5_trade_alert: mt5TradeAlert,
            namaz_reminder_alert: namazReminderAlert,
            habit_reminder_alert: habitReminderAlert,
            news_alert: newsAlert,
            price_spike_alert: priceSpikeAlert,
            volume_spike_alert: volumeSpikeAlert,
            mind_journal_chat_id: mindJournalChatId || null,
          } as any)
          .select()
          .single();
        if (data) setAlertSettingsId(data.id);
      }
      toast.success('Alert settings saved!');
    } catch {
      toast.error('Failed to save alert settings');
    }
    setSavingAlerts(false);
  };

  const sendTestMessage = async () => {
    if (!chatId.trim()) {
      toast.error('Please enter your Telegram Chat ID first');
      return;
    }
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-trade-alerts', {
        body: { test: true, chat_id: chatId.trim() },
      });
      if (error) throw error;
      if (data?.ok) {
        toast.success('Test message sent! Check your Telegram.');
      } else {
        toast.error(data?.error || 'Failed to send test message');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test message');
    }
    setSendingTest(false);
  };

  const handlePushToggle = async (enabled: boolean) => {
    setPushLoading(true);
    try {
      if (enabled) {
        if (!user) { toast.error('Please sign in first'); setPushLoading(false); return; }
        const ok = await registerPushSubscription(user.id);
        if (ok) { setPushEnabled(true); toast.success('Push notifications enabled!'); }
        else { toast.error('Failed to enable push notifications. Check browser permissions.'); }
      } else {
        await unregisterPushSubscription();
        setPushEnabled(false);
        toast.success('Push notifications disabled');
      }
    } catch { toast.error('Push notification error'); }
    setPushLoading(false);
  };


  const handleSaveSettings = async () => {
    try {
      await saveSettings.mutateAsync({
        ...accountSettings,
        startingBalance: parseFloat(balance) || 10000,
        currency,
        maxRiskPercent: parseFloat(maxRisk) || 1,
        dailyLossLimit: parseFloat(dailyLoss) || 500,
        maxTradesPerDay: parseInt(maxTrades) || 3,
      });
      toast.success('Settings saved!');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
          <SettingsIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your trading account, rules & alerts</p>
        </div>
      </div>

      {/* API Key Management */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
              <Key className="w-3 h-3 text-amber-400" />
            </div>
            API Key Rotation
          </CardTitle>
          <CardDescription>TwelveData API keys — multiple keys যোগ করলে auto-rotate করবে</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing keys */}
          {apiKeys.length > 0 && (
            <div className="space-y-2">
              {apiKeys.map((key) => {
                const usagePercent = key.daily_limit > 0 ? (key.calls_today / key.daily_limit) * 100 : 0;
                const isExhausted = key.calls_today >= key.daily_limit;
                return (
                  <div key={key.id} className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{key.label}</span>
                        <Badge variant={key.is_active ? (isExhausted ? 'destructive' : 'default') : 'secondary'} className="text-[10px] px-1.5 py-0">
                          {!key.is_active ? 'Disabled' : isExhausted ? 'Exhausted' : 'Active'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">P{key.priority}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={usagePercent} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {key.calls_today}/{key.daily_limit}
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={key.is_active}
                      onCheckedChange={() => toggleApiKey(key.id, key.is_active)}
                      className="shrink-0"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive/60 hover:text-destructive" onClick={() => deleteApiKey(key.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {apiKeys.length === 0 && !loadingKeys && (
            <p className="text-xs text-muted-foreground text-center py-3">কোনো API key নেই। নিচে নতুন key যোগ করো। Pool empty হলে env variable fallback হিসেবে ব্যবহার হবে।</p>
          )}

          {loadingKeys && <p className="text-xs text-muted-foreground text-center py-2">Loading...</p>}

          {/* Add new key */}
          <div className="border-t border-border/20 pt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Label (e.g. Key 1)" value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} className="col-span-1 text-xs h-8" />
              <Input placeholder="TwelveData API Key" value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)} className="col-span-2 text-xs h-8 font-mono" />
            </div>
            <Button onClick={addApiKey} disabled={addingKey || !newKeyValue.trim()} size="sm" variant="outline" className="w-full">
              <Plus className="w-3 h-3 mr-1" />{addingKey ? 'Adding...' : 'Add API Key'}
            </Button>
          </div>

          <Button onClick={loadApiKeys} variant="ghost" size="sm" className="w-full text-xs">
            <RefreshCw className="w-3 h-3 mr-1" />Refresh Status
          </Button>
        </CardContent>
      </Card>

      {/* Telegram Notifications */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Bell className="w-3 h-3 text-blue-400" />
            </div>
            Telegram Alerts
          </CardTitle>
          <CardDescription>Real-time trading alerts on your phone via Telegram</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Telegram Chat ID</Label>
            <div className="flex gap-2">
              <Input placeholder="e.g. 123456789" value={chatId} onChange={e => setChatId(e.target.value)} className="flex-1" />
              <Button variant="outline" size="sm" onClick={sendTestMessage} disabled={sendingTest || !chatId.trim()} className="shrink-0">
                <Send className="w-3 h-3 mr-1" />{sendingTest ? 'Sending...' : 'Test'}
              </Button>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">🟢 Confluence Alerts</p>
                <p className="text-xs text-muted-foreground">High-grade pair setup notifications</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={minGrade} onValueChange={setMinGrade}>
                  <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+ only</SelectItem>
                    <SelectItem value="A">A+, A</SelectItem>
                    <SelectItem value="B">A+, A, B</SelectItem>
                  </SelectContent>
                </Select>
                <Switch checked={confluenceAlert} onCheckedChange={setConfluenceAlert} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">⚡ EMA Alignment Shift</p><p className="text-xs text-muted-foreground">Multi-timeframe alignment changes</p></div>
              <Switch checked={emaShiftAlert} onCheckedChange={setEmaShiftAlert} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">🔴 Risk Breach Warning</p><p className="text-xs text-muted-foreground">Daily loss limit ও max trade alerts</p></div>
              <Switch checked={riskBreachAlert} onCheckedChange={setRiskBreachAlert} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">🕐 Session Reminders</p><p className="text-xs text-muted-foreground">London ও NY session open এর আগে alert</p></div>
              <Switch checked={sessionReminderAlert} onCheckedChange={setSessionReminderAlert} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">📊 MT5 Trade Updates</p><p className="text-xs text-muted-foreground">Trade open/close notifications</p></div>
              <Switch checked={mt5TradeAlert} onCheckedChange={setMt5TradeAlert} />
            </div>

            {/* Separator */}
            <div className="border-t border-border/20 pt-2 mt-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Other Notifications</p>
            </div>

            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">🕌 Namaz Reminders</p><p className="text-xs text-muted-foreground">ওয়াক্ত ভিত্তিক আজান reminder</p></div>
              <Switch checked={namazReminderAlert} onCheckedChange={setNamazReminderAlert} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">✅ Habit Reminders</p><p className="text-xs text-muted-foreground">Daily habit + weekly recap alerts</p></div>
              <Switch checked={habitReminderAlert} onCheckedChange={setHabitReminderAlert} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">📰 News Alerts</p><p className="text-xs text-muted-foreground">High-impact economic news notifications</p></div>
              <Switch checked={newsAlert} onCheckedChange={setNewsAlert} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">📈 Price Spike Alerts</p><p className="text-xs text-muted-foreground">Sudden price movement alerts</p></div>
              <Switch checked={priceSpikeAlert} onCheckedChange={setPriceSpikeAlert} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">📊 Volume Spike Alerts</p><p className="text-xs text-muted-foreground">Unusual volume detection alerts</p></div>
              <Switch checked={volumeSpikeAlert} onCheckedChange={setVolumeSpikeAlert} />
            </div>
          </div>

          {/* Mind Journal Telegram Group */}
          <div className="border-t border-border/30 pt-3 mt-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center">
                  <Bell className="w-3 h-3 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">🧠 Mind Journal Group</p>
                  <p className="text-xs text-muted-foreground">Telegram group ID — thoughts auto-sync হবে</p>
                </div>
              </div>
              <Input placeholder="e.g. -1001234567890" value={mindJournalChatId} onChange={e => setMindJournalChatId(e.target.value)} />
            </div>
          </div>

          <div className="border-t border-border/30 pt-3 mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <Smartphone className="w-3 h-3 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">📱 Push Notification</p>
                  <p className="text-xs text-muted-foreground">Phone এ directly spike alert পাবেন (PWA install থাকতে হবে)</p>
                </div>
              </div>
              <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} disabled={pushLoading} />
            </div>
          </div>

          <Button onClick={saveAlertSettings} disabled={savingAlerts} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400" size="sm">
            {savingAlerts ? 'Saving...' : 'Save Alert Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Account Setup */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <SettingsIcon className="w-3 h-3 text-primary" />
            </div>
            Account Setup
          </CardTitle>
          <CardDescription>Your trading account configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Starting Balance</Label><Input type="number" value={balance} onChange={e => setBalance(e.target.value)} /></div>
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="BDT">BDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Current Balance</Label>
              <div className="h-10 flex items-center px-3 bg-gradient-to-r from-primary/10 to-transparent rounded-md text-sm font-medium border border-primary/20">
                ${accountSettings.currentBalance.toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Rules */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center">
              <Shield className="w-3 h-3 text-red-400" />
            </div>
            Risk Management
          </CardTitle>
          <CardDescription>Set your risk parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Max Risk Per Trade (%)</Label><Input type="number" step="0.5" value={maxRisk} onChange={e => setMaxRisk(e.target.value)} /></div>
            <div><Label>Daily Loss Limit ($)</Label><Input type="number" value={dailyLoss} onChange={e => setDailyLoss(e.target.value)} /></div>
            <div><Label>Max Trades Per Day</Label><Input type="number" value={maxTrades} onChange={e => setMaxTrades(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Rules Link */}
      <Card className={glassCard}>
        <CardContent className="p-4">
          <Link to="/rules" className="flex items-center justify-between group hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Trading Rules & Analytics</p>
                <p className="text-xs text-muted-foreground">Manage rules, view adherence & violation analytics</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        </CardContent>
      </Card>

      <Button onClick={handleSaveSettings} disabled={saveSettings.isPending} className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-[0_0_20px_hsla(145,63%,49%,0.2)]" size="lg">
        {saveSettings.isPending ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
};

export default Settings;
