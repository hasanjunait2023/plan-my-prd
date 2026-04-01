import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { mockAccountSettings, mockRules } from '@/data/mockData';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Shield, Plus, Trash2 } from 'lucide-react';

const glassCard = "border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]";

const Settings = () => {
  const [balance, setBalance] = useState(mockAccountSettings.startingBalance.toString());
  const [currency, setCurrency] = useState(mockAccountSettings.currency);
  const [maxRisk, setMaxRisk] = useState(mockAccountSettings.maxRiskPercent.toString());
  const [dailyLoss, setDailyLoss] = useState(mockAccountSettings.dailyLossLimit.toString());
  const [maxTrades, setMaxTrades] = useState(mockAccountSettings.maxTradesPerDay.toString());
  const [rules, setRules] = useState(mockRules.map(r => ({ ...r })));
  const [newRule, setNewRule] = useState('');

  const addRule = () => {
    if (!newRule.trim()) return;
    setRules([...rules, { id: Date.now().toString(), text: newRule.trim(), active: true }]);
    setNewRule('');
  };

  const removeRule = (id: string) => setRules(rules.filter(r => r.id !== id));
  const toggleRule = (id: string) => setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Premium Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
          <SettingsIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your trading account and rules</p>
        </div>
      </div>

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
            <div>
              <Label>Starting Balance</Label>
              <Input type="number" value={balance} onChange={e => setBalance(e.target.value)} />
            </div>
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
                ${mockAccountSettings.currentBalance.toLocaleString()}
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
            <div>
              <Label>Max Risk Per Trade (%)</Label>
              <Input type="number" step="0.5" value={maxRisk} onChange={e => setMaxRisk(e.target.value)} />
            </div>
            <div>
              <Label>Daily Loss Limit ($)</Label>
              <Input type="number" value={dailyLoss} onChange={e => setDailyLoss(e.target.value)} />
            </div>
            <div>
              <Label>Max Trades Per Day</Label>
              <Input type="number" value={maxTrades} onChange={e => setMaxTrades(e.target.value)} />
            </div>
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
              <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id)} />
              <span className={`flex-1 text-sm ${!rule.active ? 'text-muted-foreground line-through' : ''}`}>{rule.text}</span>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeRule(rule.id)}>
                <Trash2 className="w-3 h-3 text-loss" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input placeholder="Add a new rule..." value={newRule} onChange={e => setNewRule(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRule()} />
            <Button variant="outline" onClick={addRule}><Plus className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => toast.success('Settings saved! (Mock — no backend yet)')} className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-[0_0_20px_hsla(145,63%,49%,0.2)]" size="lg">
        Save Settings
      </Button>
    </div>
  );
};

export default Settings;
