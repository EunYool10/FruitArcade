import { GameResult, GameType } from '../types';

export type MissionKind = 'play' | 'win' | 'score' | 'survive' | 'time';

export interface Mission {
  id: string;
  /** Omitted = any game counts */
  game?: GameType;
  kind: MissionKind;
  target: number;
  icon: string;
  text: string;
}

export interface DailyState {
  date: string;
  progress: Record<string, number>;
  stamped: boolean;
}

const DAILY_KEY = 'fruit_arcade_daily';

const POOLS: Record<GameType | 'any', Mission[]> = {
  memory: [
    { id: 'memory-play-2', game: 'memory', kind: 'play', target: 2, icon: '🍓', text: '메모리 게임 2판 하기' },
    { id: 'memory-win-1', game: 'memory', kind: 'win', target: 1, icon: '🎯', text: '메모리 게임 1번 클리어' },
    { id: 'memory-score-60', game: 'memory', kind: 'score', target: 60, icon: '💯', text: '메모리 게임 60점 이상' },
    { id: 'memory-score-150', game: 'memory', kind: 'score', target: 150, icon: '👑', text: '메모리 게임 150점 이상' },
  ],
  suika: [
    { id: 'suika-play-2', game: 'suika', kind: 'play', target: 2, icon: '🍉', text: '수박 게임 2판 하기' },
    { id: 'suika-score-2000', game: 'suika', kind: 'score', target: 2000, icon: '🍈', text: '수박 게임 2,000점 이상' },
    { id: 'suika-score-5000', game: 'suika', kind: 'score', target: 5000, icon: '🍍', text: '수박 게임 5,000점 이상' },
  ],
  dash: [
    { id: 'dash-play-3', game: 'dash', kind: 'play', target: 3, icon: '🏃', text: 'FRUIT DASH 3판 하기' },
    { id: 'dash-survive-20', game: 'dash', kind: 'survive', target: 20, icon: '⏱️', text: 'FRUIT DASH 20초 버티기' },
    { id: 'dash-survive-45', game: 'dash', kind: 'survive', target: 45, icon: '🌪️', text: 'FRUIT DASH 45초 버티기' },
    { id: 'dash-score-150', game: 'dash', kind: 'score', target: 150, icon: '⭐', text: 'FRUIT DASH 150점 이상' },
  ],
  any: [
    { id: 'any-play-5', kind: 'play', target: 5, icon: '🎮', text: '아무 게임이나 5판 하기' },
    { id: 'any-time-300', kind: 'time', target: 300, icon: '⌛', text: '오늘 5분 이상 플레이' },
  ],
};

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Small seeded PRNG (mulberry32) so everyone gets the same missions on the same day
function seededRandom(seed: string): () => number {
  let a = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    a ^= seed.charCodeAt(i);
    a = Math.imul(a, 16777619);
  }
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One mission per game, sometimes swapping one for an "any game" mission. */
export function missionsFor(date: string): Mission[] {
  const rand = seededRandom(date);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  const list = (['memory', 'suika', 'dash'] as GameType[]).map((g) => pick(POOLS[g]));
  if (rand() < 0.4) list[Math.floor(rand() * list.length)] = pick(POOLS.any);
  return list;
}

const freshState = (date = todayKey()): DailyState => ({ date, progress: {}, stamped: false });

export function loadDaily(): DailyState {
  const date = todayKey();
  try {
    const saved = JSON.parse(localStorage.getItem(DAILY_KEY) || 'null');
    if (saved && saved.date === date) {
      return { date, progress: saved.progress || {}, stamped: !!saved.stamped };
    }
  } catch {
    // ignore
  }
  return freshState(date);
}

export function saveDaily(state: DailyState): void {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function advance(m: Mission, value: number, r: GameResult): number {
  if (m.game && m.game !== r.game) return value;
  switch (m.kind) {
    case 'play':
      return value + 1;
    case 'win':
      return value + (r.won ? 1 : 0);
    case 'score':
      return Math.max(value, Math.round(r.score));
    case 'survive':
      return Math.max(value, Math.floor(r.seconds));
    case 'time':
      return value + Math.round(r.seconds);
  }
}

/** Apply a finished round to today's missions. */
export function applyDaily(state: DailyState, r: GameResult) {
  const current = state.date === todayKey() ? state : freshState();
  const missions = missionsFor(current.date);
  const progress = { ...current.progress };
  const completed: Mission[] = [];
  for (const m of missions) {
    const before = progress[m.id] || 0;
    const after = advance(m, before, r);
    progress[m.id] = after;
    if (before < m.target && after >= m.target) completed.push(m);
  }
  const allDone = missions.every((m) => (progress[m.id] || 0) >= m.target);
  const stampEarned = allDone && !current.stamped;
  return {
    state: { date: current.date, progress, stamped: current.stamped || allDone } as DailyState,
    completed,
    stampEarned,
  };
}

export function missionProgressLabel(m: Mission, value: number): string {
  const v = Math.min(value, m.target);
  switch (m.kind) {
    case 'score':
      return `${v.toLocaleString('ko-KR')}/${m.target.toLocaleString('ko-KR')}점`;
    case 'survive':
      return `${v}/${m.target}초`;
    case 'time':
      return `${Math.floor(v / 60)}/${m.target / 60}분`;
    default:
      return `${v}/${m.target}`;
  }
}
