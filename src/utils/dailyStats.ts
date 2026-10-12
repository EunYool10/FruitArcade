import { GameResult, GameType } from '../types';
import { dayLabel, kstDay } from './ranking';

// Per-day totals for the 기록 graph, kept on this device (KST days, last 60 days)

const KEY = 'fruit_arcade_days';
const KEEP_DAYS = 60;

export interface DayGameStat {
  best: number;
  plays: number;
  seconds: number;
}

/** day index → game → totals */
export type DayStats = Record<string, Partial<Record<GameType, DayGameStat>>>;

export function loadDays(): DayStats {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return raw && typeof raw === 'object' ? (raw as DayStats) : {};
  } catch {
    return {};
  }
}

/** Fold a finished round into today's totals and drop days older than 60 */
export function recordDay(days: DayStats, r: GameResult, now = Date.now()): DayStats {
  const today = kstDay(now);
  const next: DayStats = {};
  for (const [k, v] of Object.entries(days)) if (Number(k) > today - KEEP_DAYS) next[k] = v;
  const day = { ...(next[today] || {}) };
  const prev = day[r.game] || { best: 0, plays: 0, seconds: 0 };
  day[r.game] = {
    best: Math.max(prev.best, Math.round(r.score)),
    plays: prev.plays + 1,
    seconds: prev.seconds + Math.max(0, Math.round(r.seconds)),
  };
  next[today] = day;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked
  }
  return next;
}

export interface DayPoint {
  label: string;
  plays: number;
  seconds: number;
  /** Best score that day, per game */
  best: Partial<Record<GameType, number>>;
  playsBy: Partial<Record<GameType, number>>;
}

/** The last n days, oldest first (days without play are zeros) */
export function lastDays(days: DayStats, n = 7, now = Date.now()): DayPoint[] {
  const today = kstDay(now);
  return [...Array(n)].map((_, i) => {
    const day = today - (n - 1) + i;
    const games = days[day] || {};
    const point: DayPoint = { label: dayLabel(day).split(' ')[0], plays: 0, seconds: 0, best: {}, playsBy: {} };
    for (const [g, s] of Object.entries(games) as [GameType, DayGameStat][]) {
      point.plays += s.plays;
      point.seconds += s.seconds;
      point.best[g] = s.best;
      point.playsBy[g] = s.plays;
    }
    return point;
  });
}

export function clearDays(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
