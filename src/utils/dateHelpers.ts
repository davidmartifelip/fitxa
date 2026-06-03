/**
 * Returns 'YYYY-MM-DD' for a given Date (or today).
 */
export function toDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Returns Unix timestamp (ms) for the start of a given day.
 */
export function startOfDay(date: Date = new Date()): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Returns Unix timestamp (ms) for the end of a given day.
 */
export function endOfDay(date: Date = new Date()): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Formats seconds into MM:SS string.
 */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Returns an ISO 8601 string for start of today (UTC).
 */
export function todayISOStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Returns an ISO 8601 string for end of today (UTC).
 */
export function todayISOEnd(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/**
 * Formats a Date object to a human-readable time (HH:MM).
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Returns the number of seconds between two dates.
 */
export function diffInSeconds(start: number, end: number): number {
  return Math.floor((end - start) / 1000);
}
