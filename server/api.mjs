// Score API for server.mjs: checks finished rounds and signs the believable ones for the leaderboard.
//
//   GET  /api/health  → { ok, scores, key }   (key: short fingerprint of SCORE_SECRET, never the secret)
//   POST /api/round   { game }                                   → { ticket }   (marks when a round began)
//   POST /api/score   { game, score, seconds, ticket, replay? }  → { proof, day }
//
// Both POSTs need "Authorization: Bearer <Firebase ID token>" of a Google sign-in. The proof is
// SHA-256 of "<secret>|<uid>|<game>|<score>|<KST day>|<secret>" in upper-case hex, the same
// value firestore.rules computes from config/scoreKey, so only checked rounds reach the boards.
import crypto from 'node:crypto';

const PROJECT = process.env.FIREBASE_PROJECT || 'ambient-post-1kpr3';
const SECRET = process.env.SCORE_SECRET || '';
// Local tests against the Auth emulator only: its tokens carry no signature
const EMULATOR = process.env.SCORE_EMULATOR === '1';
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const ORIGINS = new Set(['https://eunyool10.github.io', 'https://fruitarcade.onrender.com']);
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const TICKET_TTL = 6 * 3600_000;
const DAY_MS = 86_400_000;
const KST = 9 * 3600_000;
const BODY_LIMIT = 32 * 1024;

export const scoresEnabled = SECRET.length >= 32;
const keyId = scoresEnabled ? crypto.createHash('sha256').update(SECRET).digest('hex').slice(0, 8) : null;

// The round checker is built from server/verify.ts (npm run build → dist-server/verify.js)
let checker = null;
async function loadChecker() {
  checker ??= import(new URL('../dist-server/verify.js', import.meta.url)).catch((err) => {
    checker = null;
    throw err;
  });
  return checker;
}

// ───────── Firebase ID tokens ─────────

let certs = { until: 0, keys: {} };
async function googleKeys(force = false) {
  if (!force && Date.now() < certs.until) return certs.keys;
  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new Error(`certs ${res.status}`);
  const pems = await res.json();
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') || '')?.[1] || 3600);
  const keys = Object.fromEntries(Object.entries(pems).map(([kid, pem]) => [kid, crypto.createPublicKey(pem)]));
  certs = { until: Date.now() + Math.min(maxAge, 6 * 3600) * 1000, keys };
  return keys;
}

const decodePart = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

/**
 * The token's claims if it is a valid, current Google sign-in for this project, else null.
 * `keys` (kid → public key) replaces Google's published keys in tests.
 */
export async function verifyIdToken(token, keys) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  let header;
  let claims;
  try {
    header = decodePart(parts[0]);
    claims = decodePart(parts[1]);
  } catch {
    return null;
  }
  if (!(EMULATOR && header.alg === 'none')) {
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;
    let key = (keys ?? (await googleKeys()))[header.kid];
    if (!key && !keys) key = (await googleKeys(true))[header.kid]; // Google rotates its keys
    if (!key) return null;
    const signed = Buffer.from(`${parts[0]}.${parts[1]}`);
    if (!crypto.verify('sha256', signed, key, Buffer.from(parts[2], 'base64url'))) return null;
  }
  const now = Date.now() / 1000;
  if (claims.aud !== PROJECT || claims.iss !== `https://securetoken.google.com/${PROJECT}`) return null;
  if (!(claims.exp > now) || !(claims.iat <= now + 300) || !(claims.auth_time <= now + 300)) return null;
  if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128) return null;
  if (claims.firebase?.sign_in_provider !== 'google.com') return null;
  return claims;
}

// ───────── tickets, proofs, limits ─────────

const mac = (text) => crypto.createHmac('sha256', SECRET).update(text).digest('base64url');

function issueTicket(uid, game) {
  const body = Buffer.from(JSON.stringify({ u: uid, g: game, t: Date.now(), n: crypto.randomUUID() })).toString('base64url');
  return `${body}.${mac(`ticket.${body}`)}`;
}

/** Ticket nonce → expiry: each ticket signs one round */
const usedTickets = new Map();

function readTicket(ticket, uid, game) {
  const [body, sig] = String(ticket || '').split('.');
  if (!body || !sig) return null;
  const want = Buffer.from(mac(`ticket.${body}`));
  const got = Buffer.from(sig);
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  let t;
  try {
    t = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const age = Date.now() - t.t;
  if (t.u !== uid || t.g !== game || !(age >= 0 && age <= TICKET_TTL) || usedTickets.has(t.n)) return null;
  return t;
}

const dayIndex = (ms = Date.now()) => Math.floor((ms + KST) / DAY_MS);
const proofFor = (uid, game, score, day) =>
  crypto.createHash('sha256').update(`${SECRET}|${uid}|${game}|${score}|${day}|${SECRET}`).digest('hex').toUpperCase();

/** Sliding-window limiter: true when `key` made more than `max` calls in `windowMs` */
const hits = new Map();
function tooMany(key, max, windowMs) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}

// Forget old tickets and quiet limiter keys now and then
setInterval(() => {
  const now = Date.now();
  for (const [n, until] of usedTickets) if (until < now) usedTickets.delete(n);
  for (const [k, list] of hits) if (!list.some((t) => now - t < 10 * 60_000)) hits.delete(k);
}, 10 * 60_000).unref();

// ───────── HTTP ─────────

function readJson(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > BODY_LIMIT) {
        resolve(null);
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

const short = (uid) => `${String(uid).slice(0, 6)}…`;

/** Handles /api/* requests; resolves once the response is sent */
export async function handleApi(req, res, pathname) {
  const origin = String(req.headers.origin || '');
  const cors = ORIGINS.has(origin) || LOCAL_ORIGIN.test(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
  const send = (status, data) => {
    res.writeHead(status, { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify(data));
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...cors,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '600',
    });
    res.end();
    return;
  }
  if (pathname === '/api/health') {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, { error: 'method' });
    return send(200, { ok: true, scores: scoresEnabled, key: keyId });
  }
  if (pathname !== '/api/round' && pathname !== '/api/score') return send(404, { error: 'not-found' });
  if (req.method !== 'POST') return send(405, { error: 'method' });
  if (!scoresEnabled) return send(503, { error: 'not-configured' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (tooMany(`ip:${ip}`, 120, 60_000)) return send(429, { error: 'busy' });

  const auth = String(req.headers.authorization || '');
  const claims = auth.startsWith('Bearer ') ? await verifyIdToken(auth.slice(7)).catch(() => null) : null;
  if (!claims) return send(401, { error: 'auth' });
  const uid = claims.sub;

  const body = await readJson(req);
  if (!body || typeof body !== 'object') return send(400, { error: 'body' });
  const verify = await loadChecker().catch(() => null);
  if (!verify) return send(503, { error: 'checker' });
  const { game } = body;
  if (!verify.GAMES.includes(game)) return send(400, { error: 'game' });

  if (pathname === '/api/round') {
    if (tooMany(`round:${uid}`, 30, 60_000)) return send(429, { error: 'busy' });
    return send(200, { ticket: issueTicket(uid, game) });
  }

  if (tooMany(`score:${uid}`, 12, 60_000)) return send(429, { error: 'busy' });
  const ticket = readTicket(body.ticket, uid, game);
  if (!ticket) {
    console.warn(`[score] ${short(uid)} ${game} ${body.score}: bad ticket`);
    return send(403, { error: 'ticket' });
  }
  const reason = verify.checkRound({
    game,
    score: body.score,
    seconds: body.seconds,
    wallSeconds: (Date.now() - ticket.t) / 1000,
    replay: body.replay,
  });
  if (reason) {
    console.warn(`[score] ${short(uid)} ${game} ${body.score} in ${body.seconds}s: rejected (${reason})`);
    return send(403, { error: reason });
  }
  usedTickets.set(ticket.n, ticket.t + TICKET_TTL);
  const day = dayIndex();
  console.log(`[score] ${short(uid)} ${game} ${body.score} in ${body.seconds}s: ok`);
  return send(200, { proof: proofFor(uid, game, body.score, day), day });
}
