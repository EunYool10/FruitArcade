import type { GameResult, GameType } from '../types';

// The score server (server.mjs on Render) checks each finished round and signs the believable
// ones; once enforcing, the leaderboard rules only take scores that carry that signature.
// The Render site calls itself; GitHub Pages and other copies call Render.
const API: string =
  (import.meta.env.VITE_SCORE_API as string | undefined) ??
  (location.hostname === 'fruitarcade.onrender.com' ? '' : 'https://fruitarcade.onrender.com');

/** Render's free plan sleeps when idle, and waking it can take most of a minute */
const TIMEOUT_MS = 90_000;

type TokenFn = () => Promise<string>;

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string
  ) {
    super(`${status} ${reason}`);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API}${path}`, { ...init, signal: ctrl.signal });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, typeof body.error === 'string' ? body.error : 'error');
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

const post = <T>(path: string, token: string, body: unknown) =>
  call<T>(path, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/** Wake the server ahead of time (Render puts it to sleep when nobody uses it) */
export function wakeScoreServer(): void {
  call('/api/health').catch(() => {});
}

let ticket: { game: GameType; promise: Promise<string | null> } | null = null;

/** A signed-in round started: get the server's ticket that marks when */
export function startScoredRound(game: GameType, getToken: TokenFn): void {
  const promise = getToken()
    .then((token) => post<{ ticket: string }>('/api/round', token, { game }))
    .then((r) => r.ticket)
    .catch(() => null);
  ticket = { game, promise };
}

/** The server's answer for a finished round: a proof for the boards, a rejection, or null when it can't be asked */
export type Verdict = { proof: string } | { rejected: string } | null;

export async function proveRound(result: GameResult, getToken: TokenFn): Promise<Verdict> {
  const mine = ticket?.game === result.game ? ticket : null;
  ticket = null;
  const roundTicket = mine ? await mine.promise : null;
  if (!roundTicket) return null;
  try {
    const r = await post<{ proof: string }>('/api/score', await getToken(), {
      game: result.game,
      score: Math.max(0, Math.round(result.score)),
      seconds: Math.max(0, Math.round(result.seconds)),
      ticket: roundTicket,
      ...(result.replay ? { replay: result.replay } : {}),
    });
    return typeof r.proof === 'string' ? { proof: r.proof } : null;
  } catch (err) {
    return err instanceof ApiError && err.status === 403 ? { rejected: err.reason } : null;
  }
}
