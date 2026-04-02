import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Shield, Plus, Trash2, Bell, Send, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAccountSettings, useSaveAccountSettings } from '@/hooks/useAccountSettings';
import { Link } from 'react-router-dom';
import { defaultAccountSettings } from '@/data/mockData';

const glassCard = "border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]";

const Settings = () => {
  const { data: accountSettings = defaultAccountSettings } = useAccountSettings();
  const saveSettings = useSaveAccountSettings();
  const { data: rules = [] } = useTradingRules();
  const insertRule = useInsertRule();
  const deleteRule = useDeleteRule();
  const toggleRule = useToggleRule();

  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [maxRisk, setMaxRisk] = useState('');
  const [dailyLoss, setDailyLoss] = useState('');
  const [maxTrades, setMaxTrades] = useState('');
  const [newRule, setNewRule] = useState('');

  // Telegram alert settings
  const [chatId, setChatId] = useState('');
  const [confluenceAlert, setConfluenceAlert] = useState(true);
  const [minGrade, setMinGrade] = useState('A');
  const [emaShiftAlert, setEmaShiftAlert] = useState(true);
  const [riskBreachAlert, setRiskBreachAlert] = useState(true);
  const [sessionReminderAlert, setSessionReminderAlert] = useState(true);
  const [mt5TradeAlert, setMt5TradeAlert] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [alertSettingsId, setAlertSettingsId] = useState<string | null>(null);

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
    }
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
            updated_at: new Date().toISOString(),
          })
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
          })
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

  const handleAddRule = async () => {
    if (!newRule.trim()) return;
    try {
      await insertRule.mutateAsync(newRule.trim());
      setNewRule('');
    } catch {
      toast.error('Failed to add rule');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await saveSettings.mutateAsync({
        startingBalance: parseFloat(balance) || 10000,
        currentBalance: accountSettings.currentBalance,
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

      {/* Trading Rules */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Shield className="w-3 h-3 text-emerald-400" />
            </div>
            Rules I Never Break
          </CardTitle>
          <CardDescription>Your personal trading commandments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className="flex items-center gap-3 group">
              <Switch checked={rule.active} onCheckedChange={() => toggleRule.mutate({ id: rule.id, active: !rule.active })} />
              <span className={`flex-1 text-sm ${!rule.active ? 'text-muted-foreground line-through' : ''}`}>{rule.text}</span>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteRule.mutate(rule.id)}>
                <Trash2 className="w-3 h-3 text-loss" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input placeholder="Add a new rule..." value={newRule} onChange={e => setNewRule(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddRule()} />
            <Button variant="outline" onClick={handleAddRule}><Plus className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSaveSettings} disabled={saveSettings.isPending} className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-[0_0_20px_hsla(145,63%,49%,0.2)]" size="lg">
        {saveSettings.isPending ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
};

export default Settings;
