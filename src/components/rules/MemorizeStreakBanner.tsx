import { Flame, Trophy, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemorizeStreak } from '@/hooks/useMemorizeStreak';

export const MemorizeStreakBanner = () => {
  const { data: stats } = useMemorizeStreak();
  if (!stats) return null;

  const { current, longest, totalDays, todayDone } = stats;
  const isHot = current >= 3;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-orange-500/10 via-card to-card p-4 shadow-sm">
      {/* glow */}
      {isHot && (
        <div className="pointer-events-none absolute -top-12 -left-12 w-40 h-40 rounded-full bg-orange-500/30 blur-3xl animate-pulse" />
      )}

      <div className="relative flex items-center gap-4">
        {/* Flame icon */}
        <div
          className={cn(
            'relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all',
            current > 0
              ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/40'
              : 'bg-muted/40'
          )}
        >
          {current > 0 && (
            <div className="absolute inset-0 rounded-2xl bg-orange-500/40 blur-md animate-pulse" />
          )}
          <Flame
            className={cn(
              'relative w-7 h-7',
              current > 0 ? 'text-white drop-shadow-md' : 'text-muted-foreground/60'
            )}
            strokeWidth={2.2}
            fill={current > 0 ? 'currentColor' : 'none'}
          />
        </div>

        {/* Streak info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'text-3xl font-bold tabular-nums tracking-tight',
                current > 0
                  ? 'bg-gradient-to-br from-orange-400 to-red-500 bg-clip-text text-transparent'
                  : 'text-muted-foreground/60'
              )}
            >
              {current}
            </span>
            <span className="text-sm font-medium text-foreground/80">
              day{current === 1 ? '' : 's'} streak
            </span>
            {todayDone && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 ml-auto">
                ✓ Today
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {current === 0
              ? 'Open Memorize Mode today to start your streak 🔥'
              : todayDone
              ? `Keep going — you've reviewed ${current} day${current === 1 ? '' : 's'} in a row`
              : `Don't break it — open Memorize Mode today to keep your ${current}-day streak alive`}
          </p>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 pl-4 border-l border-border/40">
          <div className="text-center">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium">
              <Trophy className="w-3 h-3" /> Best
            </div>
            <div className="text-lg font-bold tabular-nums">{longest}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium">
              <Calendar className="w-3 h-3" /> Total
            </div>
            <div className="text-lg font-bold tabular-nums">{totalDays}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
