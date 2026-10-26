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

export type Game = 'memory' | 'suika' | 'dash' | 'puzzle' | 'slice' | 'piano';
export const GAMES: Game[] = ['memory', 'suika', 'dash', 'puzzle', 'slice', 'piano'];

/** Same caps as maxScore() in firestore.rules */
const CAP: Record<Game, number> = { memory: 2000, suika: 500000, dash: 100000, puzzle: 100000, slice: 100000, piano: 100000 };

/**
 * Points per second (plus a head start) that no real round goes past. These sit near each
 * game's theoretical best, e.g. FRUIT DASH on hard at top speed with double points the whole time.
 */
const RATE: Record<Exclude<Game, 'puzzle'>, { perSecond: number; burst: number }> = {
  memory: { perSecond: 60, burst: 150 },
  // Points grow ×0.1 every 30 s up to ×2, so the late-game rate doubles
  suika: { perSecond: 1000, burst: 2000 },
  dash: { perSecond: 140, burst: 300 },
  // 어려움 throws faster and pays ×1.5
  slice: { perSecond: 240, burst: 450 },
  // One point a tile, and the board never scrolls faster than 10 rows a second
  piano: { perSecond: 11, burst: 30 },
};

/** The round ticket can arrive late while a sleeping server wakes up */
export const TICKET_SLACK_SECONDS = 90;

/** Points per coin, as in coinsFor (src/utils/shop.ts) */
const COIN_PER_SCORE: Record<Game, number> = { memory: 10, suika: 150, dash: 15, puzzle: 60, slice: 25, piano: 6 };

/**
 * Coins a checked round earns before its bonuses (new best, stamp, first today, a win): the same
 * base as coinsFor. The server signs it as a grant; the rules let a round add at most this plus
 * the bonuses (GRANT_BONUS in src/utils/shop.ts, 85 in firestore.rules).
 */
export const roundCoins = (game: Game, score: number) => 10 + Math.min(40, Math.floor(Math.max(0, score) / COIN_PER_SCORE[game]));

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
