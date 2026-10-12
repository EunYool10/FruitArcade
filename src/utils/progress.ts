import { GameResult, GameType, HistoryEntry, UserStatistics } from '../types';

export const GAME_TYPES: GameType[] = ['memory', 'suika', 'dash', 'puzzle'];

const STATS_KEY = 'fruit_arcade_stats';
const HISTORY_KEY = 'fruit_arcade_history';
const HISTORY_LIMIT = 30;
// v2 kept per-game best scores under these keys
const LEGACY_BEST_KEYS: Record<GameType, string> = { memory: 'memory_hs', suika: 'suika_hs', dash: 'dash_hs', puzzle: 'puzzle_hs' };

export const EMPTY_STATS: UserStatistics = {
  totalPlayCount: 0,
  totalPlayTime: 0,
  memoryPlayCount: 0,
  suikaPlayCount: 0,
  dashPlayCount: 0,
  puzzlePlayCount: 0,
  memoryHighScore: 0,
  suikaHighScore: 0,
  dashHighScore: 0,
  puzzleHighScore: 0,
  missionStamps: 0,
  bestStreak: 0,
  lastChampionWeek: 0,
  coinsEarned: 0,
  coinsSpent: 0,
  lastPlayedAt: '',
};

type NumericStat = Exclude<keyof UserStatistics, 'lastPlayedAt'>;
const NUMERIC_KEYS = (Object.keys(EMPTY_STATS) as (keyof UserStatistics)[]).filter(
  (k): k is NumericStat => k !== 'lastPlayedAt'
);

export const playsKey = (g: GameType) => `${g}PlayCount` as const;
export const bestKey = (g: GameType) => `${g}HighScore` as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore (private mode, quota)
  }
}

// ───────── Statistics ─────────

export function loadLocalStats(): UserStatistics {
  const saved = read<Partial<UserStatistics> | null>(STATS_KEY, null);
  const stats: UserStatistics = { ...EMPTY_STATS, ...(saved || {}) };
  if (!saved) {
    for (const g of GAME_TYPES) {
      const legacy = read<number>(LEGACY_BEST_KEYS[g], 0);
      stats[bestKey(g)] = Math.max(stats[bestKey(g)], Number(legacy) || 0);
    }
  }
  return stats;
}

export const saveLocalStats = (stats: UserStatistics) => write(STATS_KEY, stats);

/** Fold one finished round into the statistics. Shared by local and cloud saves. */
export function applyResult(stats: UserStatistics, r: GameResult, stamp = false, streak = 0, coins = 0): UserStatistics {
  const next = { ...stats };
  next.totalPlayCount += 1;
  next.totalPlayTime += Math.max(0, Math.round(r.seconds));
  next[playsKey(r.game)] += 1;
  next[bestKey(r.game)] = Math.max(next[bestKey(r.game)], Math.round(r.score));
  if (stamp) next.missionStamps += 1;
  next.bestStreak = Math.max(next.bestStreak, streak);
  next.coinsEarned += Math.max(0, Math.round(coins));
  next.lastPlayedAt = new Date().toISOString();
  return next;
}

/** Coins left to spend in the shop */
export const coinBalance = (s: UserStatistics) => Math.max(0, (s.coinsEarned || 0) - (s.coinsSpent || 0));

/** Field-wise maximum, so merging never loses progress from either side. */
export function mergeStats(a: Partial<UserStatistics>, b: Partial<UserStatistics>): UserStatistics {
  const out: UserStatistics = { ...EMPTY_STATS };
  for (const key of NUMERIC_KEYS) {
    out[key] = Math.max(Number(a[key]) || 0, Number(b[key]) || 0);
  }
  out.lastPlayedAt = [a.lastPlayedAt || '', b.lastPlayedAt || ''].sort().pop() || '';
  return out;
}

export const sameStats = (a: UserStatistics, b: UserStatistics) =>
  NUMERIC_KEYS.every((k) => a[k] === b[k]) && a.lastPlayedAt === b.lastPlayedAt;

// ───────── XP & levels ─────────

export const XP = { play: 20, per30s: 5, achievement: 50, stamp: 100 };

/** XP is derived from progress, so it never needs its own storage. */
export function computeXp(stats: UserStatistics, achievements: number): number {
  return (
    stats.totalPlayCount * XP.play +
    Math.floor(stats.totalPlayTime / 30) * XP.per30s +
    achievements * XP.achievement +
    stats.missionStamps * XP.stamp
  );
}

const LEVEL_TITLES = [
  { min: 15, emoji: '🍉', title: '수박 마스터' },
  { min: 12, emoji: '🍍', title: '파인애플' },
  { min: 9, emoji: '🍑', title: '복숭아' },
  { min: 7, emoji: '🍊', title: '한라봉' },
  { min: 5, emoji: '🍓', title: '딸기' },
  { min: 3, emoji: '🍒', title: '체리' },
  { min: 1, emoji: '🌱', title: '새싹' },
];

export interface LevelInfo {
  level: number;
  title: string;
  emoji: string;
  xp: number;
  /** XP at which the current level started */
  floor: number;
  /** XP needed for the next level */
  next: number;
}

/** Cumulative XP needed to reach a level: 0, 100, 300, 600, 1000, … */
export const xpForLevel = (level: number) => 50 * level * (level - 1);

export function levelInfo(xp: number): LevelInfo {
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + 0.08 * xp)) / 2));
  while (xpForLevel(level + 1) <= xp) level++;
  while (level > 1 && xpForLevel(level) > xp) level--;
  const t = LEVEL_TITLES.find((x) => level >= x.min)!;
  return { level, title: t.title, emoji: t.emoji, xp, floor: xpForLevel(level), next: xpForLevel(level + 1) };
}

// ───────── History ─────────

export function loadHistory(): HistoryEntry[] {
  const list = read<HistoryEntry[]>(HISTORY_KEY, []);
  return Array.isArray(list) ? list.filter((h) => h && GAME_TYPES.includes(h.game)) : [];
}

export function pushHistory(list: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...list].slice(0, HISTORY_LIMIT);
  write(HISTORY_KEY, next);
  return next;
}

/** Wipe this device's play records (stats, history, legacy best scores). */
export function clearLocalProgress(): void {
  try {
    localStorage.removeItem(STATS_KEY);
    localStorage.removeItem(HISTORY_KEY);
    Object.values(LEGACY_BEST_KEYS).forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// ───────── Daily streak ─────────

const STREAK_KEY = 'fruit_arcade_streak';

export interface StreakState {
  /** Last day (YYYY-MM-DD) a round was finished */
  last: string;
  count: number;
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const loadStreak = (): StreakState => read<StreakState>(STREAK_KEY, { last: '', count: 0 });

/** Streak as it stands today (0 once a whole day was missed). */
export function currentStreak(s: StreakState, now = new Date()): number {
  const yesterday = dayKey(new Date(now.getTime() - 86400000));
  return s.last === dayKey(now) || s.last === yesterday ? s.count : 0;
}

/** Record a finished round; returns the new state and whether today extended the streak. */
export function bumpStreak(s: StreakState, now = new Date()): { state: StreakState; extended: boolean } {
  const today = dayKey(now);
  if (s.last === today) return { state: s, extended: false };
  const state = { last: today, count: currentStreak(s, now) + 1 };
  write(STREAK_KEY, state);
  return { state, extended: true };
}
