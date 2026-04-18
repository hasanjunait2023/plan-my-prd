import { Card, CardContent } from "@/components/ui/card";
import { Flame, Trophy, TrendingUp, Award } from "lucide-react";
import { useStreakStats } from "@/hooks/useStreakStats";

function fireBadge(streak: number) {
  if (streak >= 30) return { emoji: "🔥🔥🔥", label: "Inferno", color: "text-orange-500" };
  if (streak >= 14) return { emoji: "🔥🔥", label: "Blazing", color: "text-orange-400" };
  if (streak >= 7) return { emoji: "🔥", label: "On fire", color: "text-amber-500" };
  if (streak >= 3) return { emoji: "✨", label: "Building", color: "text-yellow-500" };
  return null;
}

export function StreakBanner() {
  const { currentStreak, longestStreak, last7Rate, last30, loading } = useStreakStats();
  if (loading) return null;
  const badge = fireBadge(currentStreak);
  const isComeback = currentStreak === 0 && last30.some((d) => d.done > 0);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-amber-500/5">
      <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          icon={<Flame className={`h-5 w-5 ${badge?.color ?? "text-muted-foreground"}`} />}
          value={currentStreak}
          label="Day streak"
          extra={badge ? `${badge.emoji} ${badge.label}` : undefined}
        />
        <Stat
          icon={<Trophy className="h-5 w-5 text-amber-500" />}
          value={longestStreak}
          label="Longest (30d)"
        />
        <Stat
          icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
          value={`${last7Rate}%`}
          label="7-day rate"
        />
        <Stat
          icon={<Award className="h-5 w-5 text-primary" />}
          value={last30.reduce((a, b) => a + b.done, 0)}
          label="Done (30d)"
        />
        {isComeback && (
          <div className="col-span-2 md:col-span-4 mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5" />
            Comeback day — complete 1 task to restart your streak.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  icon,
  value,
  label,
  extra,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  extra?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <div className="text-xl font-bold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
        {extra && <div className="text-[10px] mt-0.5 font-medium opacity-80">{extra}</div>}
      </div>
    </div>
  );
}
