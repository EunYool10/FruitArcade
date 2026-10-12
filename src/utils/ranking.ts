import { GameType } from '../types';

// Leaderboard ids and labels. Kept free of Firebase so the lobby can import it.

export type RankPeriod = 'day' | 'week' | 'all';

export const RANK_PERIODS: RankPeriod[] = ['day', 'week', 'all'];
export const PERIOD_LABEL: Record<RankPeriod, string> = { day: '오늘', week: '이번 주', all: '전체' };

const KST = 9 * 3600_000;
const DAY = 86_400_000;

/**
 * Board id for a game and period: daily and weekly boards reset at midnight KST,
 * weeks start on Monday. Must match isValidBoardId in firestore.rules.
 */
export function boardId(game: GameType, period: RankPeriod, now = Date.now()): string {
  if (period === 'all') return `${game}_all`;
  const day = Math.floor((now + KST) / DAY);
  // 1970-01-01 was a Thursday; +3 days makes weeks start on Monday
  return period === 'day' ? `${game}_d${day}` : `${game}_w${Math.floor((day + 3) / 7)}`;
}

export interface RankEntry {
  uid: string;
  name: string;
  avatar: string;
  score: number;
}

/** The player's place on the boards after a round, for the result card */
export interface RankResult {
  game: GameType;
  status: 'pending' | 'done' | 'error';
  day?: number;
  all?: number;
}

/** Name shown on public boards: the in-app nickname, never the Google account name */
export const publicName = (nickname: string, uid: string) => nickname || `과일러 ${uid.slice(0, 4).toUpperCase()}`;

/** Firestore error → what the leaderboard window should say */
export function rankErrorKind(err: unknown): 'denied' | 'offline' | 'other' {
  const code = (err as { code?: string })?.code ?? '';
  if (code === 'permission-denied') return 'denied';
  if (code === 'unavailable' || (typeof navigator !== 'undefined' && !navigator.onLine)) return 'offline';
  return 'other';
}
