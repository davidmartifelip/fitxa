import { getDatabase } from './database';
import { toDateString } from '../utils/dateHelpers';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Session {
  id: number;
  event_id: string | null;
  task_name: string;
  start_time: number;
  end_time: number | null;
  duration: number | null;
  completed: 0 | 1;
}

export interface DailyGoal {
  date: string;
  total_focus_seconds: number;
  goal_met: 0 | 1;
}

// ─── Session CRUD ─────────────────────────────────────────────────────────────

/** Creates a new session and returns its id. */
export async function createSession(data: {
  event_id?: string;
  task_name: string;
  start_time: number;
}): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO sessions (event_id, task_name, start_time)
     VALUES (?, ?, ?)`,
    [data.event_id ?? null, data.task_name, data.start_time]
  );
  return result.lastInsertRowId;
}

/** Updates a session when it ends. Also updates the daily_goals table. */
export async function finalizeSession(
  id: number,
  endTime: number,
  duration: number,
  completed: 0 | 1
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sessions
     SET end_time = ?, duration = ?, completed = ?
     WHERE id = ?`,
    [endTime, duration, completed, id]
  );

  // Update daily_goals for today
  const today = toDateString();
  await db.runAsync(
    `INSERT INTO daily_goals (date, total_focus_seconds, goal_met)
     VALUES (?, ?, 0)
     ON CONFLICT(date) DO UPDATE SET
       total_focus_seconds = total_focus_seconds + excluded.total_focus_seconds`,
    [today, duration]
  );

  // Mark goal as met if ≥ 5400 seconds (90 min) of total focus today
  await db.runAsync(
    `UPDATE daily_goals
     SET goal_met = CASE WHEN total_focus_seconds >= 5400 THEN 1 ELSE 0 END
     WHERE date = ?`,
    [today]
  );
}

/** Returns all sessions for a given date string ('YYYY-MM-DD'). */
export async function getSessionsByDate(date: string): Promise<Session[]> {
  const db = await getDatabase();
  const startMs = new Date(date).setHours(0, 0, 0, 0);
  const endMs = new Date(date).setHours(23, 59, 59, 999);
  return await db.getAllAsync<Session>(
    `SELECT * FROM sessions
     WHERE start_time BETWEEN ? AND ?
     ORDER BY start_time DESC`,
    [startMs, endMs]
  );
}

/** Returns daily_goal records for the last N days (inclusive today). */
export async function getDailyGoals(lastNDays: number = 365): Promise<DailyGoal[]> {
  const db = await getDatabase();
  const dates: string[] = [];
  for (let i = 0; i < lastNDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(toDateString(d));
  }
  // SQLite doesn't support arrays directly; use IN with placeholders
  const placeholders = dates.map(() => '?').join(',');
  return await db.getAllAsync<DailyGoal>(
    `SELECT * FROM daily_goals
     WHERE date IN (${placeholders})
     ORDER BY date DESC`,
    dates
  );
}

/** Returns today's total focus seconds. */
export async function getTodayFocusSeconds(): Promise<number> {
  const db = await getDatabase();
  const today = toDateString();
  const row = await db.getFirstAsync<{ total_focus_seconds: number }>(
    `SELECT total_focus_seconds FROM daily_goals WHERE date = ?`,
    [today]
  );
  return row?.total_focus_seconds ?? 0;
}
