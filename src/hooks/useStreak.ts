import { useState, useEffect, useCallback } from 'react';
import { getDailyGoals, getTodayFocusSeconds } from '../db/sessionRepository';
import type { DailyGoal } from '../db/sessionRepository';

// ─── Constants ────────────────────────────────────────────────────────────────

export const DAILY_GOAL_SECONDS = 90 * 60; // 90 min

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  todayFocusSeconds: number;
  todayGoalMet: boolean;
  todayProgress: number; // 0..1
  isLoading: boolean;
  refresh: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStreak(): StreakState {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [todayFocusSeconds, setTodayFocusSeconds] = useState(0);
  const [todayGoalMet, setTodayGoalMet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const calculate = useCallback(async () => {
    setIsLoading(true);
    try {
      const [goals, todaySeconds] = await Promise.all([
        getDailyGoals(365),
        getTodayFocusSeconds(),
      ]);

      setTodayFocusSeconds(todaySeconds);
      setTodayGoalMet(todaySeconds >= DAILY_GOAL_SECONDS);

      // Build a set of dates where goal was met
      const goalMetDates = new Set(
        goals.filter((g) => g.goal_met === 1).map((g) => g.date)
      );

      // Calculate current streak (consecutive days ending today or yesterday)
      let current = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        // Today might not be counted yet (in progress)
        if (i === 0 && !goalMetDates.has(dateStr)) {
          // Only break streak if yesterday is also missing
          continue;
        }

        if (goalMetDates.has(dateStr)) {
          current++;
        } else {
          break;
        }
      }
      setCurrentStreak(current);

      // Calculate longest streak
      let longest = 0;
      let running = 0;
      // Sort goals ascending by date
      const sorted = [...goals].sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].goal_met === 1) {
          running++;
          if (running > longest) longest = running;
        } else {
          running = 0;
        }
      }
      setLongestStreak(longest);
    } catch (e) {
      console.error('[useStreak] Error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    calculate();
  }, [calculate]);

  const todayProgress = Math.min(todayFocusSeconds / DAILY_GOAL_SECONDS, 1);

  return {
    currentStreak,
    longestStreak,
    todayFocusSeconds,
    todayGoalMet,
    todayProgress,
    isLoading,
    refresh: calculate,
  };
}
