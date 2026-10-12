// Friend challenges: "beat my score on the same board", carried in the link's #hash (no server)
import { DashDifficulty, GameType, MemoryConfig } from '../types';
import { isReservedNickname } from './profile';

export interface Challenge {
  /** game */
  g: GameType;
  /** seed for the board / fruit order */
  s: string;
  /** score to beat */
  sc: number;
  /** challenger's name */
  n: string;
  /** memory settings, so both play the same mode */
  m?: MemoryConfig;
  /** FRUIT DASH difficulty */
  d?: DashDifficulty;
}

const GAMES: GameType[] = ['memory', 'suika', 'dash', 'puzzle', 'slice'];

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeChallenge(c: Challenge): string {
  return toBase64Url(JSON.stringify(c));
}

/** Parse and sanity-check a challenge; anything odd is rejected */
export function decodeChallenge(code: string): Challenge | null {
  try {
    const c = JSON.parse(fromBase64Url(code));
    if (!GAMES.includes(c.g) || typeof c.s !== 'string' || c.s.length > 24) return null;
    if (typeof c.sc !== 'number' || !Number.isFinite(c.sc)) return null;
    // No control characters and no staff-looking names ("QA", "관리자" ...)
    const raw = typeof c.n === 'string' ? c.n.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 12) : '';
    const name = raw && !isReservedNickname(raw) ? raw : '친구';
    const out: Challenge = { g: c.g, s: c.s, sc: Math.min(10_000_000, Math.max(0, Math.round(c.sc))), n: name };
    if (c.g === 'memory' && c.m && ['4', '6', '8', '8-joker'].includes(c.m.mode)) {
      out.m = {
        mode: c.m.mode,
        previewTime: [2000, 3000, 5000, 7000, 10000].includes(c.m.previewTime) ? c.m.previewTime : 3000,
        lifeLimit: ['infinite', '10', '5'].includes(c.m.lifeLimit) ? c.m.lifeLimit : 'infinite',
      };
    }
    if (c.g === 'dash' && ['easy', 'normal', 'hard'].includes(c.d)) out.d = c.d;
    return out;
  } catch {
    return null;
  }
}

export function challengeLink(c: Challenge): string {
  return `${window.location.origin}${window.location.pathname}#c=${encodeChallenge(c)}`;
}

/** Reads a challenge from the address bar once, then removes it so a reload does not repeat it */
export function takeChallengeFromUrl(): Challenge | null {
  const m = window.location.hash.match(/[#&]c=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  history.replaceState(null, '', window.location.pathname + window.location.search);
  return decodeChallenge(m[1]);
}
