import { GameResult, GameType } from '../types';
import { seededRandom } from './rng';

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
  puzzle: [
    { id: 'puzzle-play-2', game: 'puzzle', kind: 'play', target: 2, icon: '🧩', text: '과일 퍼즐 2판 하기' },
    { id: 'puzzle-score-1500', game: 'puzzle', kind: 'score', target: 1500, icon: '🍋', text: '과일 퍼즐 1,500점 이상' },
    { id: 'puzzle-score-3000', game: 'puzzle', kind: 'score', target: 3000, icon: '💣', text: '과일 퍼즐 3,000점 이상' },
  ],
  slice: [
    { id: 'slice-play-2', game: 'slice', kind: 'play', target: 2, icon: '🔪', text: '과일 자르기 2판 하기' },
    { id: 'slice-score-300', game: 'slice', kind: 'score', target: 300, icon: '🍉', text: '과일 자르기 300점 이상' },
    { id: 'slice-score-800', game: 'slice', kind: 'score', target: 800, icon: '🔥', text: '과일 자르기 800점 이상' },
    { id: 'slice-survive-60', game: 'slice', kind: 'survive', target: 60, icon: '⏱️', text: '과일 자르기 60초 버티기' },
  ],
  piano: [
    { id: 'piano-play-2', game: 'piano', kind: 'play', target: 2, icon: '🎹', text: '과일 피아노 2판 하기' },
    { id: 'piano-score-60', game: 'piano', kind: 'score', target: 60, icon: '🎵', text: '과일 피아노 60점 이상' },
    { id: 'piano-score-150', game: 'piano', kind: 'score', target: 150, icon: '🎶', text: '과일 피아노 150점 이상' },
    { id: 'piano-win-1', game: 'piano', kind: 'win', target: 1, icon: '🎼', text: '과일 피아노 한 곡 완주하기' },
  ],
  jump: [
    { id: 'jump-play-2', game: 'jump', kind: 'play', target: 2, icon: '🦘', text: '과일 점프 2판 하기' },
    { id: 'jump-score-300', game: 'jump', kind: 'score', target: 300, icon: '🌵', text: '과일 점프 300점 이상' },
    { id: 'jump-score-800', game: 'jump', kind: 'score', target: 800, icon: '🌙', text: '과일 점프 800점 이상' },
    { id: 'jump-survive-45', game: 'jump', kind: 'survive', target: 45, icon: '⏱️', text: '과일 점프 45초 달리기' },
  ],
  juice: [
    { id: 'juice-play-2', game: 'juice', kind: 'play', target: 2, icon: '🧃', text: '과일 주스 가게 2판 하기' },
    { id: 'juice-score-400', game: 'juice', kind: 'score', target: 400, icon: '🥤', text: '과일 주스 가게 400점 이상' },
    { id: 'juice-score-1000', game: 'juice', kind: 'score', target: 1000, icon: '🍹', text: '과일 주스 가게 1,000점 이상' },
    { id: 'juice-survive-60', game: 'juice', kind: 'survive', target: 60, icon: '⏱️', text: '과일 주스 가게 1분 넘게 영업하기' },
  ],
  draw: [
    { id: 'draw-play-1', game: 'draw', kind: 'play', target: 1, icon: '🎨', text: '과일 그리기 1판 하기' },
    { id: 'draw-score-60', game: 'draw', kind: 'score', target: 60, icon: '🖼️', text: '과일 그리기 싱크율 60% 넘기' },
    { id: 'draw-score-80', game: 'draw', kind: 'score', target: 80, icon: '🔍', text: '과일 그리기 싱크율 80% 넘기' },
  ],
  any: [
    { id: 'any-play-5', kind: 'play', target: 5, icon: '🎮', text: '아무 게임이나 5판 하기' },
    { id: 'any-time-300', kind: 'time', target: 300, icon: '⌛', text: '오늘 5분 이상 플레이' },
  ],
};

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** One mission for three of the games, sometimes swapping one for an "any game" mission. */
export function missionsFor(date: string): Mission[] {
  const rand = seededRandom(date);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  // New games join the draw from the day after their release, so nobody's missions change mid-day
  const games: GameType[] =
    date >= '2026-10-29'
      ? ['memory', 'suika', 'dash', 'puzzle', 'slice', 'piano', 'jump', 'juice', 'draw']
      : date >= '2026-10-28'
      ? ['memory', 'suika', 'dash', 'puzzle', 'slice', 'piano', 'jump']
      : date >= '2026-10-26'
      ? ['memory', 'suika', 'dash', 'puzzle', 'slice', 'piano']
      : date >= '2026-10-14'
        ? ['memory', 'suika', 'dash', 'puzzle', 'slice']
        : ['memory', 'suika', 'dash', 'puzzle'];
  for (let i = games.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [games[i], games[j]] = [games[j], games[i]];
  }
  games.length = 3;
  const list = games.map((g) => pick(POOLS[g]));
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
