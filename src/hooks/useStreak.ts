import { useState, useEffect, useCallback } from 'react';
import { getDailyGoals, getTodayFocusSeconds } from '../db/sessionRepository';
import type { DailyGoal } from '../db/sessionRepository';
import { toDateString } from '../utils/dateHelpers';

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

      // Determine today's target
      const todayStr = toDateString();
      const [year, month, day] = todayStr.split('-').map(Number);
      const todayD = new Date(year, month - 1, day);
      const isTodayRest = todayD.getDay() === 5 || todayD.getDay() === 6;
      const todayThreshold = isTodayRest ? 18000 : DAILY_GOAL_SECONDS;
      setTodayGoalMet(todaySeconds >= todayThreshold);

      // Build a map of date string to total focus seconds
      const focusSecondsMap = new Map<string, number>();
      for (const g of goals) {
        focusSecondsMap.set(g.date, g.total_focus_seconds);
      }

      // Generate all date strings for the last 365 days, sorted ascending
      const datesAsc: string[] = [];
      const todayDate = new Date();
      for (let i = 365; i >= 0; i--) {
        const dateD = new Date(todayDate);
        dateD.setDate(dateD.getDate() - i);
        datesAsc.push(dateD.toISOString().split('T')[0]);
      }

      let longest = 0;
      let running = 0;

      for (let i = 0; i < datesAsc.length; i++) {
        const dateStr = datesAsc[i];
        const seconds = focusSecondsMap.get(dateStr) || 0;
        
        const [y, m, dayNum] = dateStr.split('-').map(Number);
        const cellDate = new Date(y, m - 1, dayNum);
        const isRest = cellDate.getDay() === 5 || cellDate.getDay() === 6;
        const threshold = isRest ? 18000 : 5400; // 5 hours (18000s) or 90 minutes (5400s)
        
        const isToday = (i === datesAsc.length - 1);
        const goalMet = seconds >= threshold;

        if (isRest) {
          if (goalMet) {
            running++;
            if (running > longest) longest = running;
          } else {
            // Rest day (Friday/Saturday) with less than 5h.
            // Streak doesn't break, but doesn't increment.
          }
        } else {
          if (goalMet) {
            running++;
            if (running > longest) longest = running;
          } else {
            if (isToday) {
              // Today is standard and not met yet, but is still in progress.
            } else {
              running = 0;
            }
          }
        }
      }

      setCurrentStreak(running);
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

  const todayStr = toDateString();
  const [year, month, day] = todayStr.split('-').map(Number);
  const todayD = new Date(year, month - 1, day);
  const isTodayRest = todayD.getDay() === 5 || todayD.getDay() === 6;
  const todayThreshold = isTodayRest ? 18000 : DAILY_GOAL_SECONDS;
  const todayProgress = Math.min(todayFocusSeconds / todayThreshold, 1);

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
