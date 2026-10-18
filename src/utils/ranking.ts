import { GameType } from '../types';
import { GAMES } from '../constants';
import { isReservedNickname } from './profile';
import { maskBadWords } from './badWords';

// Leaderboard ids and labels. Kept free of Firebase so the lobby can import it.

export type RankPeriod = 'day' | 'week' | 'all';

export const RANK_PERIODS: RankPeriod[] = ['day', 'week', 'all'];
export const PERIOD_LABEL: Record<RankPeriod, string> = { day: '오늘', week: '이번 주', all: '전체' };

const KST = 9 * 3600_000;
const DAY = 86_400_000;

/** Days since 1970-01-01 in KST, the same count firestore.rules uses */
export const kstDay = (now = Date.now()) => Math.floor((now + KST) / DAY);

/** Monday-start weeks in KST (1970-01-01 was a Thursday, so +3 days) */
export const kstWeek = (now = Date.now()) => Math.floor((kstDay(now) + 3) / 7);

/** Day id used by the daily boards and activity stats: d<kstDay> */
export const dayId = (now = Date.now(), offset = 0) => `d${kstDay(now) + offset}`;

/** "10/13 (월)" for a KST day index */
export function dayLabel(index: number): string {
  const d = new Date(index * DAY);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} (${'일월화수목금토'[d.getUTCDay()]})`;
}

/**
 * Board id for a game and period: daily and weekly boards reset at midnight KST,
 * weeks start on Monday. Must match isValidBoardId in firestore.rules.
 */
export function boardId(game: GameType, period: RankPeriod, now = Date.now()): string {
  if (period === 'all') return `${game}_all`;
  const day = kstDay(now);
  return period === 'day' ? `${game}_d${day}` : `${game}_w${Math.floor((day + 3) / 7)}`;
}

/** "10/6 ~ 10/12" for a week index */
export function weekRangeLabel(week: number): string {
  const md = (day: number) => {
    const d = new Date(day * DAY);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  };
  return `${md(week * 7 - 3)} ~ ${md(week * 7 + 3)}`;
}

/** "메모리 · 10/13 (월)" style name for a board id */
export function boardLabel(board: string): string {
  const [game, period = ''] = board.split('_');
  const name = GAMES[game as GameType]?.short ?? game;
  if (period === 'all') return `${name} · 전체`;
  const n = Number(period.slice(1));
  if (period.startsWith('d')) return `${name} · ${dayLabel(n)}`;
  // Monday of week n (weeks count from Monday 1969-12-29)
  return `${name} · ${dayLabel(n * 7 - 3)} 주`;
}

export interface RankEntry {
  uid: string;
  name: string;
  avatar: string;
  score: number;
  /** Worn title id (see titles.ts) */
  title?: string;
  /** Avatar frame id from the shop */
  frame?: string;
  /** Google profile photo, shown instead of the emoji (players who kept the default avatar) */
  photo?: string;
}

// Google account photos only (same pattern as isOptionalPhoto in firestore.rules)
const PHOTO_URL = /^https:\/\/lh[3-6]\.googleusercontent\.com\/[A-Za-z0-9_\-.\/=]{1,400}$/;

/** The URL when it is a Google profile photo, otherwise undefined */
export const cleanPhoto = (url: unknown): string | undefined => (typeof url === 'string' && PHOTO_URL.test(url) ? url : undefined);

/** The player's place on the boards after a round, for the result card */
export interface RankResult {
  game: GameType;
  /** rejected: the score server didn't accept the round, so it stayed off the boards */
  status: 'pending' | 'done' | 'error' | 'rejected';
  day?: number;
  all?: number;
}

/**
 * Name shown on public boards: the in-app nickname (swearing masked), never the Google account name.
 * Without a usable nickname it's "과일러 0421" (digits only, so it can never spell a staff word).
 */
export function publicName(nickname: string, uid: string, allowReserved = false): string {
  if (nickname && (allowReserved || !isReservedNickname(nickname))) return maskBadWords(nickname);
  let tag = 7;
  for (const c of uid) tag = (tag * 31 + c.charCodeAt(0)) % 10000;
  return `과일러 ${String(tag).padStart(4, '0')}`;
}

/** Firestore error → what the leaderboard window should say */
export function rankErrorKind(err: unknown): 'denied' | 'offline' | 'other' {
  const code = (err as { code?: string })?.code ?? '';
  if (code === 'permission-denied') return 'denied';
  if (code === 'unavailable' || (typeof navigator !== 'undefined' && !navigator.onLine)) return 'offline';
  return 'other';
}
