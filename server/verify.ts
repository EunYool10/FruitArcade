// Round checks for the score server (server.mjs). Built for Node with `vite build --ssr`.
// The puzzle is replayed move by move with the game's own engine; the real-time games
// can't be replayed, so their score has to fit the time the round really took.
import {
  CLASSIC_MOVES,
  H,
  W,
  adjacent,
  clearStep,
  collapse,
  findMove,
  findRuns,
  generate,
  reshuffle,
  stepPoints,
  swapped,
} from '../src/components/PuzzleGame/engine';
import { seededRandom } from '../src/utils/rng';

export type Game = 'memory' | 'suika' | 'dash' | 'puzzle' | 'slice';
export const GAMES: Game[] = ['memory', 'suika', 'dash', 'puzzle', 'slice'];

/** Same caps as maxScore() in firestore.rules */
const CAP: Record<Game, number> = { memory: 2000, suika: 100000, dash: 100000, puzzle: 100000, slice: 100000 };

/**
 * Points per second (plus a head start) that no real round goes past. These sit near each
 * game's theoretical best, e.g. FRUIT DASH on hard at top speed with double points the whole time.
 */
const RATE: Record<Exclude<Game, 'puzzle'>, { perSecond: number; burst: number }> = {
  memory: { perSecond: 60, burst: 150 },
  suika: { perSecond: 500, burst: 2000 },
  dash: { perSecond: 140, burst: 300 },
  slice: { perSecond: 160, burst: 300 },
};

/** The round ticket can arrive late while a sleeping server wakes up */
export const TICKET_SLACK_SECONDS = 90;

/** The classic puzzle score for these swaps on this seed's board, or null if a swap is impossible */
export function replayPuzzle(seed: string, moves: [number, number][]): number | null {
  if (moves.length > CLASSIC_MOVES) return null;
  const rng = seededRandom(seed);
  let g = generate(rng);
  let score = 0;
  for (const [a, b] of moves) {
    if (![a, b].every((c) => Number.isInteger(c) && c >= 0 && c < W * H) || !adjacent(a, b)) return null;
    const after = swapped(g, a, b);
    if (!findRuns(after).length) return null;
    g = after;
    let cascade = 0;
    for (let step = clearStep(g, [a, b]); step; step = clearStep(g, [])) {
      cascade++;
      score += stepPoints(step, cascade);
      g = collapse(step.grid, rng);
    }
    if (!findMove(g)) g = reshuffle(g, rng);
  }
  return score;
}

export interface RoundClaim {
  game: unknown;
  score: unknown;
  seconds: unknown;
  /** Seconds since the server handed out this round's ticket */
  wallSeconds: number;
  replay?: unknown;
}

/** null when the round is believable, otherwise a short reason */
export function checkRound(c: RoundClaim): string | null {
  const game = c.game as Game;
  if (!GAMES.includes(game)) return 'game';
  const score = c.score as number;
  const seconds = c.seconds as number;
  if (!Number.isInteger(score) || score < 1 || score > CAP[game]) return 'score';
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > 4 * 3600) return 'seconds';
  if (seconds > c.wallSeconds + TICKET_SLACK_SECONDS) return 'time';

  if (game === 'puzzle') {
    const r = c.replay as { seed?: unknown; moves?: unknown } | undefined;
    if (!r || typeof r.seed !== 'string' || !r.seed || r.seed.length > 24 || !Array.isArray(r.moves)) return 'replay';
    const moves = r.moves as unknown[];
    if (!moves.every((m) => Array.isArray(m) && m.length === 2)) return 'replay';
    return replayPuzzle(r.seed, moves as [number, number][]) === score ? null : 'replay';
  }

  const { perSecond, burst } = RATE[game];
  return score <= perSecond * seconds + burst ? null : 'rate';
}
