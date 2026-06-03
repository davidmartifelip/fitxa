import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { createSession, finalizeSession } from '../db/sessionRepository';
import { useAppContext } from '../context/AppContext';
import { diffInSeconds } from '../utils/dateHelpers';

export const FOCUS_DURATION_SECONDS = 90 * 60; // 90 minutes

export interface TimerState {
  isRunning: boolean;
  elapsed: number;
  remaining: number;
  progress: number;  // 0..1
  isCompleted: boolean;
}

export interface UseTimerReturn extends TimerState {
  start: (taskName: string) => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
}

export function useTimer(): UseTimerReturn {
  const { setActiveSession } = useAppContext();

  const [elapsed, setElapsed]         = useState(0);
  const [isRunning, setIsRunning]     = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef  = useRef<number | null>(null);
  const sessionIdRef  = useRef<number | null>(null);
  const appStateRef   = useRef<AppStateStatus>(AppState.currentState);

  // Recalculate elapsed from wall clock when coming back from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        next === 'active' &&
        startTimeRef.current !== null
      ) {
        const real = diffInSeconds(startTimeRef.current, Date.now());
        setElapsed(Math.min(real, FOCUS_DURATION_SECONDS));
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleComplete = useCallback(async () => {
    clearTimer();
    setIsRunning(false);
    setIsCompleted(true);
    if (sessionIdRef.current && startTimeRef.current) {
      const endTime  = Date.now();
      const duration = diffInSeconds(startTimeRef.current, endTime);
      await finalizeSession(sessionIdRef.current, endTime, duration, 1);
    }
    setActiveSession(null);
    sessionIdRef.current = null;
    startTimeRef.current = null;
  }, [clearTimer, setActiveSession]);

  // Tick every second
  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= FOCUS_DURATION_SECONDS) {
          handleComplete();
          return FOCUS_DURATION_SECONDS;
        }
        return next;
      });
    }, 1000);
    return () => clearTimer();
  }, [isRunning, handleComplete, clearTimer]);

  const start = useCallback(async (taskName: string) => {
    if (isRunning) return;
    const now = Date.now();
    startTimeRef.current = now;
    setElapsed(0);
    setIsCompleted(false);

    const sessionId = await createSession({ task_name: taskName, start_time: now });
    sessionIdRef.current = sessionId;
    setActiveSession({ sessionId, taskName, startTime: now });
    setIsRunning(true);
  }, [isRunning, setActiveSession]);

  const stop = useCallback(async () => {
    clearTimer();
    setIsRunning(false);
    if (sessionIdRef.current && startTimeRef.current) {
      const endTime  = Date.now();
      const duration = diffInSeconds(startTimeRef.current, endTime);
      await finalizeSession(sessionIdRef.current, endTime, duration, 0);
    }
    setActiveSession(null);
    sessionIdRef.current = null;
    startTimeRef.current = null;
  }, [clearTimer, setActiveSession]);

  const reset = useCallback(() => {
    clearTimer();
    setElapsed(0);
    setIsRunning(false);
    setIsCompleted(false);
    setActiveSession(null);
    sessionIdRef.current = null;
    startTimeRef.current = null;
  }, [clearTimer, setActiveSession]);

  return {
    isRunning,
    elapsed,
    remaining: Math.max(FOCUS_DURATION_SECONDS - elapsed, 0),
    progress:  elapsed / FOCUS_DURATION_SECONDS,
    isCompleted,
    start,
    stop,
    reset,
  };
}
