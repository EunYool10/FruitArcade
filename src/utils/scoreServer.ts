import type { GameResult, GameType } from '../types';

// The score server (server.mjs on Render) checks each finished round and signs the believable
// ones; the leaderboard rules only take scores that carry that signature.
// The Render site calls itself; GitHub Pages and other copies call Render.
const API: string =
  (import.meta.env.VITE_SCORE_API as string | undefined) ??
  (location.hostname === 'fruitarcade.onrender.com' ? '' : 'https://fruitarcade.onrender.com');

/** Render's free plan sleeps after about 15 quiet minutes, and waking it can take most of a minute */
const TIMEOUT_MS = 90_000;
/**
 * One try at a round's ticket waits this long. The first try wakes a sleeping server, a later one
 * gets the ticket while it still counts (the server lets it arrive up to 90 s after the round began).
 */
const TICKET_TRY_MS = 20_000;
const TICKET_TRIES = 4;
/** While a round runs the server is poked now and then, so it's awake when the score comes in */
const KEEP_AWAKE_MS = 5 * 60_000;
/** Rounds that couldn't be checked (server asleep, offline) wait here and are sent again */
const PENDING_KEY = 'fruit_arcade_pending_scores';
/** Tickets last 6 hours on the server */
const PENDING_TTL = 6 * 3600_000 - 10 * 60_000;

type TokenFn = () => Promise<string>;

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string
  ) {
    super(`${status} ${reason}`);
  }
}

async function call<T>(path: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API}${path}`, { ...init, signal: ctrl.signal });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, typeof body.error === 'string' ? body.error : 'error');
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

const post = <T>(path: string, token: string, body: unknown, timeoutMs?: number) =>
  call<T>(
    path,
    { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    timeoutMs
  );

/** Wake the server ahead of time (Render puts it to sleep when nobody uses it) */
export function wakeScoreServer(): void {
  call('/api/health').catch(() => {});
}

let ticket: { game: GameType; promise: Promise<string | null> } | null = null;
let keepAwake: ReturnType<typeof setInterval> | null = null;

/** A signed-in round started: get the server's ticket that marks when, and keep the server awake */
export function startScoredRound(game: GameType, getToken: TokenFn): void {
  const promise = (async () => {
    for (let i = 0; i < TICKET_TRIES; i++) {
      try {
        const r = await post<{ ticket: string }>('/api/round', await getToken(), { game }, TICKET_TRY_MS);
        return r.ticket;
      } catch (err) {
        // A refusal won't change by asking again; a timeout or a waking server will
        if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 429) return null;
      }
    }
    return null;
  })();
  ticket = { game, promise };
  if (keepAwake) clearInterval(keepAwake);
  keepAwake = setInterval(wakeScoreServer, KEEP_AWAKE_MS);
}

/** The round ended or was left: stop keeping the server awake (the ticket stays for proveRound) */
export function endScoredRound(): void {
  if (keepAwake) clearInterval(keepAwake);
  keepAwake = null;
}

/** A finished round to be checked: kept on the device when the server can't be reached */
export interface Claim {
  uid: string;
  game: GameType;
  score: number;
  seconds: number;
  ticket: string;
  replay?: unknown;
  /** When the round ended */
  at: number;
}

/** The server's answer: a proof for the boards, a rejection, "ask again later", or null without a ticket */
export type Verdict = { proof: string } | { rejected: string } | { later: Claim } | null;

/** Ask the server to check a round */
export async function askProof(claim: Claim, getToken: TokenFn): Promise<Verdict> {
  try {
    const r = await post<{ proof: string }>('/api/score', await getToken(), {
      game: claim.game,
      score: claim.score,
      seconds: claim.seconds,
      ticket: claim.ticket,
      ...(claim.replay ? { replay: claim.replay } : {}),
    });
    return typeof r.proof === 'string' ? { proof: r.proof } : { later: claim };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return { rejected: err.reason };
    // Asleep, offline or busy: the round waits on the device and is sent again
    return { later: claim };
  }
}

export async function proveRound(result: GameResult, uid: string, getToken: TokenFn): Promise<Verdict> {
  const mine = ticket?.game === result.game ? ticket : null;
  ticket = null;
  endScoredRound();
  const roundTicket = mine ? await mine.promise : null;
  if (!roundTicket) return null;
  return askProof(
    {
      uid,
      game: result.game,
      score: Math.max(0, Math.round(result.score)),
      seconds: Math.max(0, Math.round(result.seconds)),
      ticket: roundTicket,
      ...(result.replay ? { replay: result.replay } : {}),
      at: Date.now(),
    },
    getToken
  );
}

// ───────── rounds waiting on this device ─────────

export function pendingClaims(): Claim[] {
  try {
    const list = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]') as Claim[];
    return Array.isArray(list) ? list.filter((c) => c && typeof c.ticket === 'string' && Date.now() - c.at < PENDING_TTL) : [];
  } catch {
    return [];
  }
}

function savePending(list: Claim[]) {
  try {
    if (list.length) localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-20)));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    // storage full or blocked: the round just won't be retried
  }
}

export const queueClaim = (claim: Claim) => savePending([...pendingClaims().filter((c) => c.ticket !== claim.ticket), claim]);
export const dropClaim = (claim: Claim) => savePending(pendingClaims().filter((c) => c.ticket !== claim.ticket));
