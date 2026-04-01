import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockPsychologyLogs, mockDailyPnL } from '@/data/mockData';
import { PsychEmotion } from '@/types/trade';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';
import { Brain, TrendingUp, Activity } from 'lucide-react';

const emotions: PsychEmotion[] = ['Confident', 'Fearful', 'Greedy', 'Calm', 'Anxious', 'Revenge', 'FOMO', 'Patient', 'Frustrated'];
const glassCard = "border-border/30 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_hsla(0,0%,0%,0.3)]";
const tooltipStyle = { backgroundColor: 'hsl(0, 0%, 8%)', border: '1px solid hsla(0,0%,100%,0.1)', borderRadius: '8px', color: 'hsl(0, 0%, 95%)' };

const Psychology = () => {
  const [mentalState, setMentalState] = useState('7');
  const [sleepQuality, setSleepQuality] = useState('7');
  const [lifeStress, setLifeStress] = useState('3');
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [intention, setIntention] = useState('');
  const [reflection, setReflection] = useState('');
  const [ruleAdherence, setRuleAdherence] = useState(true);

  const toggleEmotion = (e: string) => {
    setSelectedEmotions(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  };

  const trendData = mockPsychologyLogs.slice().reverse().map(log => ({
    date: log.date.slice(5),
    score: log.overallScore,
    mental: log.mentalState,
    sleep: log.sleepQuality,
  }));

  const correlationData = mockPsychologyLogs.map(log => {
    const dayPnL = mockDailyPnL.find(d => d.date === log.date)?.pnl ?? 0;
    return { date: log.date.slice(5), score: log.overallScore, pnl: dayPnL };
  }).reverse();

  const handleLog = () => {
    toast.success('Psychology log saved! (Mock — no backend yet)');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Premium Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center border border-violet-500/20">
          <Brain className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Psychology Tracker</h1>
          <p className="text-sm text-muted-foreground">Track your mental state and trading psychology</p>
        </div>
      </div>

      {/* Daily Log Form */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center">
              <Brain className="w-3 h-3 text-violet-400" />
            </div>
            Daily Psychology Log
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Mental State (1-10)</Label>
              <Input type="number" min="1" max="10" value={mentalState} onChange={e => setMentalState(e.target.value)} />
            </div>
            <div>
              <Label>Sleep Quality (1-10)</Label>
              <Input type="number" min="1" max="10" value={sleepQuality} onChange={e => setSleepQuality(e.target.value)} />
            </div>
            <div>
              <Label>Life Stress (1-10)</Label>
              <Input type="number" min="1" max="10" value={lifeStress} onChange={e => setLifeStress(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Emotions</Label>
            <div className="flex flex-wrap gap-2">
              {emotions.map(e => (
                <Badge key={e} variant={selectedEmotions.includes(e) ? 'default' : 'outline'}
                  className="cursor-pointer" onClick={() => toggleEmotion(e)}>
                  {e}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Today's Intention</Label>
            <Textarea value={intention} onChange={e => setIntention(e.target.value)} placeholder="What's your focus today?" rows={2} />
          </div>
          <div>
            <Label>Post-Session Reflection</Label>
            <Textarea value={reflection} onChange={e => setReflection(e.target.value)} placeholder="How did the session go?" rows={2} />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={ruleAdherence} onCheckedChange={setRuleAdherence} />
            <Label>I followed all my trading rules today</Label>
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-transparent rounded-lg p-3 border border-primary/20">
            <p className="text-xs text-muted-foreground">Auto-calculated Score</p>
            <p className="text-2xl font-bold text-primary">
              {Math.round(((parseInt(mentalState) || 0) + (parseInt(sleepQuality) || 0) + (10 - (parseInt(lifeStress) || 0))) / 3)}/10
            </p>
          </div>

          <Button onClick={handleLog} className="w-full">Save Psychology Log</Button>
        </CardContent>
      </Card>

      {/* Weekly Trend */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-primary" />
            </div>
            Weekly Psychology Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(0,0%,100%,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="score" stroke="hsl(145, 63%, 49%)" strokeWidth={2} name="Overall" />
                <Line type="monotone" dataKey="mental" stroke="hsl(37, 90%, 51%)" strokeWidth={1.5} strokeDasharray="5 5" name="Mental" />
                <Line type="monotone" dataKey="sleep" stroke="hsl(0, 0%, 50%)" strokeWidth={1.5} strokeDasharray="3 3" name="Sleep" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Psychology vs P&L */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Activity className="w-3 h-3 text-primary" />
            </div>
            Psychology Score vs P&L
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={correlationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(0,0%,100%,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }} />
                <YAxis yAxisId="pnl" tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }} />
                <YAxis yAxisId="score" orientation="right" domain={[0, 10]} tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar yAxisId="pnl" dataKey="pnl" fill="hsl(145, 63%, 49%)" opacity={0.6} radius={[4, 4, 0, 0]} name="P&L ($)" />
                <Line yAxisId="score" type="monotone" dataKey="score" stroke="hsl(37, 90%, 51%)" strokeWidth={2} name="Psych Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Brain className="w-3 h-3 text-primary" />
            </div>
            Recent Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockPsychologyLogs.slice(0, 5).map(log => (
              <div key={log.id} className="flex items-center justify-between border-b border-border/30 pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{log.date.slice(5)}</span>
                  <span className={`font-bold ${log.overallScore >= 7 ? 'text-profit' : log.overallScore >= 5 ? 'text-warning' : 'text-loss'}`}>
                    {log.overallScore}/10
                  </span>
                  <div className="flex gap-1">
                    {log.emotions.map(e => <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>)}
                  </div>
                </div>
                <Badge variant={log.ruleAdherence ? 'default' : 'destructive'} className="text-[10px]">
                  {log.ruleAdherence ? '✓ Rules Followed' : '✗ Rules Broken'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Psychology;
