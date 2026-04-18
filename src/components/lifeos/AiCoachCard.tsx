import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Loader2, Calendar, AlertTriangle, MessageCircle } from "lucide-react";
import { useAiInsights } from "@/hooks/useAiInsights";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type Mode = "weekly" | "drift" | "reflection";

const MODE_META: Record<Mode, { label: string; icon: typeof Brain; desc: string }> = {
  weekly: { label: "Weekly Review", icon: Calendar, desc: "7-day performance recap" },
  drift: { label: "Drift Check", icon: AlertTriangle, desc: "Find stuck tasks" },
  reflection: { label: "Reflections", icon: MessageCircle, desc: "Pattern analysis" },
};

const KIND_META: Record<string, { emoji: string; color: string }> = {
  weekly_review: { emoji: "🗓️", color: "bg-primary/10 text-primary border-primary/20" },
  drift_alert: { emoji: "⚠️", color: "bg-destructive/10 text-destructive border-destructive/20" },
  reflection_pattern: { emoji: "💭", color: "bg-accent/10 text-accent-foreground border-accent/20" },
};

export function AiCoachCard() {
  const { insights, loading } = useAiInsights(3);
  const [running, setRunning] = useState<Mode | null>(null);

  const trigger = async (mode: Mode) => {
    setRunning(mode);
    try {
      const { data, error } = await supabase.functions.invoke("lifeos-ai-coach", {
        body: {},
        method: "POST",
      });
      // Manual URL with query - invoke doesn't pass query, use direct fetch fallback
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lifeos-ai-coach?mode=${mode}`;
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || "Failed");
      if (result.processed === 0) {
        toast({
          title: "No insight generated",
          description: mode === "drift"
            ? "Konono drifted task nei — bhalo!"
            : mode === "reflection"
              ? "Aro reflection lagbe (min 3)."
              : "Not enough data this week.",
        });
      } else {
        toast({ title: "AI Coach ran", description: `${result.processed} insight generated + sent to Telegram.` });
      }
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setRunning(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          AI Coach
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(MODE_META) as Mode[]).map((m) => {
            const meta = MODE_META[m];
            const Icon = meta.icon;
            const isRunning = running === m;
            return (
              <Button
                key={m}
                variant="outline"
                size="sm"
                onClick={() => trigger(m)}
                disabled={!!running}
                className="flex-col h-auto py-3 gap-1"
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="text-xs font-semibold">{meta.label}</span>
                <span className="text-[10px] text-muted-foreground">{meta.desc}</span>
              </Button>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Recent insights
          </p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : insights.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No insights yet. Trigger one above ↑
            </p>
          ) : (
            insights.map((ins) => {
              const km = KIND_META[ins.kind] || { emoji: "✨", color: "bg-muted" };
              return (
                <div
                  key={ins.id}
                  className={`p-3 rounded-md border ${km.color}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-sm">
                      {km.emoji} {ins.title}
                    </p>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {formatDistanceToNow(new Date(ins.created_at), { addSuffix: true })}
                    </Badge>
                  </div>
                  <p className="text-xs whitespace-pre-wrap leading-relaxed text-foreground/80">
                    {ins.body}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
