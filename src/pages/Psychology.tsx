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
import { Brain } from 'lucide-react';

const emotions: PsychEmotion[] = ['Confident', 'Fearful', 'Greedy', 'Calm', 'Anxious', 'Revenge', 'FOMO', 'Patient', 'Frustrated'];

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

  // Psychology vs P&L correlation
  const correlationData = mockPsychologyLogs.map(log => {
    const dayPnL = mockDailyPnL.find(d => d.date === log.date)?.pnl ?? 0;
    return { date: log.date.slice(5), score: log.overallScore, pnl: dayPnL };
  }).reverse();

  const handleLog = () => {
    toast.success('Psychology log saved! (Mock — no backend yet)');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Psychology Tracker</h1>
        <p className="text-sm text-muted-foreground">Track your mental state and trading psychology</p>
      </div>

      {/* Daily Log Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" /> Daily Psychology Log
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

          <div className="bg-accent/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Auto-calculated Score</p>
            <p className="text-2xl font-bold text-primary">
              {Math.round(((parseInt(mentalState) || 0) + (parseInt(sleepQuality) || 0) + (10 - (parseInt(lifeStress) || 0))) / 3)}/10
            </p>
          </div>

          <Button onClick={handleLog} className="w-full">Save Psychology Log</Button>
        </CardContent>
      </Card>

      {/* Weekly Trend */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Weekly Psychology Trend</CardTitle></CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 25%, 20%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(213, 16%, 50%)' }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: 'hsl(213, 16%, 50%)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(210, 38%, 17%)', border: 'none', borderRadius: '8px', color: 'hsl(192, 15%, 94%)' }} />
                <Line type="monotone" dataKey="score" stroke="hsl(170, 100%, 39%)" strokeWidth={2} name="Overall" />
                <Line type="monotone" dataKey="mental" stroke="hsl(37, 90%, 51%)" strokeWidth={1.5} strokeDasharray="5 5" name="Mental" />
                <Line type="monotone" dataKey="sleep" stroke="hsl(213, 16%, 50%)" strokeWidth={1.5} strokeDasharray="3 3" name="Sleep" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Psychology vs P&L */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Psychology Score vs P&L</CardTitle></CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={correlationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 25%, 20%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(213, 16%, 50%)' }} />
                <YAxis yAxisId="pnl" tick={{ fontSize: 11, fill: 'hsl(213, 16%, 50%)' }} />
                <YAxis yAxisId="score" orientation="right" domain={[0, 10]} tick={{ fontSize: 11, fill: 'hsl(213, 16%, 50%)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(210, 38%, 17%)', border: 'none', borderRadius: '8px', color: 'hsl(192, 15%, 94%)' }} />
                <Bar yAxisId="pnl" dataKey="pnl" fill="hsl(170, 100%, 39%)" opacity={0.6} radius={[4, 4, 0, 0]} name="P&L ($)" />
                <Line yAxisId="score" type="monotone" dataKey="score" stroke="hsl(37, 90%, 51%)" strokeWidth={2} name="Psych Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Logs</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockPsychologyLogs.slice(0, 5).map(log => (
              <div key={log.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
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
