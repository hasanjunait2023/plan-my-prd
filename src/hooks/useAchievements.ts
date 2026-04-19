import { useMemo } from "react";
import { useLifeNodes } from "@/hooks/useLifeNodes";
import { useStreakStats } from "@/hooks/useStreakStats";
import {
  Sparkles,
  Flame,
  Crown,
  Target,
  Trophy,
  Medal,
  Calendar,
  Compass,
  Star,
  Rocket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  unlocked: boolean;
  progress: number; // 0-100
  hint: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  unlockedHint?: string;
}

export function useAchievements() {
  const { byType, nodes } = useLifeNodes();
  const { currentStreak, longestStreak, totalCompletedAllTime, last7Rate } = useStreakStats();

  const achievements: Achievement[] = useMemo(() => {
    const visions = byType("vision");
    const missions = byType("mission");
    const yearly = byType("yearly");
    const quarterly = byType("quarterly");
    const completedMissions = missions.filter((m) => Number(m.progress) >= 100).length;
    const completedQuarterly = quarterly.filter((q) => Number(q.progress) >= 100).length;
    const completedYearly = yearly.filter((y) => Number(y.progress) >= 100).length;

    return [
      {
        id: "first_vision",
        title: "First Vision",
        description: "Set your North Star",
        icon: Compass,
        unlocked: visions.length >= 1,
        progress: Math.min(100, visions.length * 100),
        hint: "Create your first Vision in the Vision tab",
        tier: "bronze",
      },
      {
        id: "mission_architect",
        title: "Mission Architect",
        description: "Define 3 Missions",
        icon: Target,
        unlocked: missions.length >= 3,
        progress: Math.min(100, (missions.length / 3) * 100),
        hint: `${missions.length}/3 missions defined`,
        tier: "bronze",
      },
      {
        id: "streak_7",
        title: "Week Warrior",
        description: "7-day streak",
        icon: Flame,
        unlocked: longestStreak >= 7,
        progress: Math.min(100, (longestStreak / 7) * 100),
        hint: `Longest: ${longestStreak} days`,
        tier: "silver",
      },
      {
        id: "streak_30",
        title: "30-Day Streak",
        description: "Consistency unlocked",
        icon: Trophy,
        unlocked: longestStreak >= 30,
        progress: Math.min(100, (longestStreak / 30) * 100),
        hint: `Longest: ${longestStreak} days`,
        tier: "gold",
      },
      {
        id: "century",
        title: "Century Club",
        description: "100 tasks completed",
        icon: Medal,
        unlocked: totalCompletedAllTime >= 100,
        progress: Math.min(100, (totalCompletedAllTime / 100) * 100),
        hint: `${totalCompletedAllTime}/100 tasks done`,
        tier: "silver",
      },
      {
        id: "quarter_crusher",
        title: "Quarter Crusher",
        description: "Complete a Quarterly Goal",
        icon: Rocket,
        unlocked: completedQuarterly >= 1,
        progress: Math.min(100, completedQuarterly * 100),
        hint: `${completedQuarterly} quarter(s) crushed`,
        tier: "gold",
      },
      {
        id: "mission_mastered",
        title: "Mission Mastered",
        description: "Hit 100% on a Mission",
        icon: Crown,
        unlocked: completedMissions >= 1,
        progress: Math.min(100, completedMissions * 100),
        hint: `${completedMissions} mission(s) complete`,
        tier: "platinum",
      },
      {
        id: "year_conqueror",
        title: "Year Conqueror",
        description: "Complete a Yearly Goal",
        icon: Star,
        unlocked: completedYearly >= 1,
        progress: Math.min(100, completedYearly * 100),
        hint: `${completedYearly} yearly goal(s) hit`,
        tier: "platinum",
      },
      {
        id: "consistency_king",
        title: "Consistency King",
        description: "80%+ avg over 7 days",
        icon: Sparkles,
        unlocked: last7Rate >= 80,
        progress: Math.min(100, (last7Rate / 80) * 100),
        hint: `${last7Rate}% / 80% avg`,
        tier: "gold",
      },
      {
        id: "century_streak",
        title: "Iron Will",
        description: "100-day streak",
        icon: Calendar,
        unlocked: longestStreak >= 100,
        progress: Math.min(100, (longestStreak / 100) * 100),
        hint: `${longestStreak}/100 days`,
        tier: "platinum",
      },
    ];
  }, [byType, nodes, currentStreak, longestStreak, totalCompletedAllTime, last7Rate]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  return { achievements, unlockedCount, totalCount, currentStreak, longestStreak };
}
