import { FRUIT, FRUIT_NAME } from './engine';
import { formatNumber } from '../../utils/format';

// 30 puzzle stages. Goals cycle through score, collecting a fruit, making specials and cascades,
// getting a little harder every five stages. Stars depend on the moves left when the goal is met.

export type StageGoal =
  | { type: 'score'; target: number }
  | { type: 'collect'; kind: number; count: number }
  | { type: 'specials'; count: number }
  | { type: 'combo'; cascade: number };

export interface Stage {
  no: number;
  moves: number;
  goal: StageGoal;
}

export const STAGE_COUNT = 30;

export const STAGES: Stage[] = Array.from({ length: STAGE_COUNT }, (_, i) => {
  const no = i + 1;
  const tier = Math.floor(i / 5); // 0..5
  switch (i % 5) {
    case 0:
      return { no, moves: 15 + tier, goal: { type: 'score', target: 600 + tier * 300 } };
    case 1:
      return { no, moves: 16 + tier, goal: { type: 'collect', kind: (i * 5) % 6, count: 12 + tier * 3 } };
    case 2:
      return { no, moves: 18 + tier, goal: { type: 'specials', count: 2 + Math.ceil(tier / 2) } };
    case 3:
      return { no, moves: 16 + tier, goal: { type: 'combo', cascade: 2 + Math.min(2, Math.floor(tier / 2)) } };
    default:
      return { no, moves: 20 + tier, goal: { type: 'score', target: 1000 + tier * 300 } };
  }
});

export function goalText(goal: StageGoal): string {
  switch (goal.type) {
    case 'score':
      return `${formatNumber(goal.target)}점 넘기기`;
    case 'collect':
      return `${FRUIT[goal.kind]} ${FRUIT_NAME[goal.kind]} ${goal.count}개 터뜨리기`;
    case 'specials':
      return `특수 과일 ${goal.count}개 만들기`;
    case 'combo':
      return `${goal.cascade}연쇄 한 번 만들기`;
  }
}

/** Short progress label for the HUD, e.g. "🍓 9/18" */
export function goalProgress(goal: StageGoal, value: number): string {
  switch (goal.type) {
    case 'score':
      return `${formatNumber(Math.min(value, goal.target))}/${formatNumber(goal.target)}`;
    case 'collect':
      return `${FRUIT[goal.kind]} ${Math.min(value, goal.count)}/${goal.count}`;
    case 'specials':
      return `✨ ${Math.min(value, goal.count)}/${goal.count}`;
    case 'combo':
      return `🔥 ${Math.min(value, goal.cascade)}/${goal.cascade}`;
  }
}

export const goalTarget = (goal: StageGoal) =>
  goal.type === 'score' ? goal.target : goal.type === 'collect' ? goal.count : goal.type === 'specials' ? goal.count : goal.cascade;

/** 3 stars with 30%+ of the moves left, 2 stars with 10%+, otherwise 1 */
export function starsFor(stage: Stage, movesLeft: number): number {
  if (movesLeft >= Math.ceil(stage.moves * 0.3)) return 3;
  if (movesLeft >= Math.ceil(stage.moves * 0.1)) return 2;
  return 1;
}

// ───────── progress (stage number → best stars), local and in the cloud ─────────

const KEY = 'fruit_arcade_stages';
export type StageProgress = Record<string, number>;

export function loadStageProgress(): StageProgress {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as StageProgress) : {};
  } catch {
    return {};
  }
}

export function saveStageProgress(p: StageProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

/** Best stars per stage from both sides */
export function mergeStageProgress(a: StageProgress, b: StageProgress): StageProgress {
  const out: StageProgress = {};
  for (const src of [a, b]) {
    for (const [k, v] of Object.entries(src)) {
      const no = Number(k);
      const stars = Math.max(0, Math.min(3, Math.round(Number(v) || 0)));
      if (no >= 1 && no <= STAGE_COUNT && stars > 0) out[k] = Math.max(out[k] || 0, stars);
    }
  }
  return out;
}

export const isUnlocked = (p: StageProgress, no: number) => no === 1 || (p[no - 1] || 0) > 0;

/** The first stage not cleared yet (or the last one) */
export const nextStage = (p: StageProgress) => STAGES.find((s) => !(p[s.no] > 0))?.no ?? STAGE_COUNT;

export const clearStageProgress = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};
