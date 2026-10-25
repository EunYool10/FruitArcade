  // Rules :test for the 운영진 blue check: only admins may write verified: true (mocked; nothing deployed)
const { firebaseToolsLib } = require('./_tools.cjs');
const FT = firebaseToolsLib();
const fs = require('fs');
const crypto = require('crypto');
const auth = require(FT + 'auth.js');
const PROJECT = 'ambient-post-1kpr3';
const DB = 'ai-studio-9fb7cc09-52d2-4de4-9866-b3ecaf99c200';
const T = '2026-10-21T03:00:00Z';
const DAY = Math.floor((Date.parse(T) + 9 * 3600e3) / 86400e3);
const SECRET = 'x'.repeat(40);
const ADMIN = 'dddddddddddddddddddd';
const USER = 'aaaaaaaaaaaaaaaaaaaa';
const who = (uid, email) => ({ uid, token: { email, email_verified: true, firebase: { sign_in_provider: 'google.com' } } });
const proof = (uid, score) => crypto.createHash('sha256').update(`${SECRET}|${uid}|suika|${score}|${DAY}|${SECRET}`).digest('hex').toUpperCase();
const entryPath = (uid) => `/databases/${DB}/documents/leaderboards/suika_d${DAY}/scores/${uid}`;
const cardPath = (uid) => `/databases/${DB}/documents/players/${uid}`;
const entry = (uid, extra = {}) => ({ uid, name: '운영자', avatar: '🍓', score: 5000, at: T, proof: proof(uid, 5000), ...extra });
const card = (uid, extra = {}) => ({
  uid, code: 'ABCD2345', name: '운영자', avatar: '🍓', level: 10, achievements: 20,
  best: { memory: 0, suika: 5000, dash: 0, puzzle: 0, slice: 0 }, at: T, ...extra,
});
// get(): config/scoreKey (enforced), config/admins (admin@x) and board entries (score 6000) all read from one mock
const mocks = [
  { function: 'get', args: [{ anyValue: {} }], result: { value: { data: { secret: SECRET, enforce: true, emails: ['admin@x'], score: 6000 } } } },
  { function: 'exists', args: [{ anyValue: {} }], result: { value: false } },
];
const A = who(ADMIN, 'admin@x');
const U = who(USER, 'p@x');
const cases = [
  ['admin posts a score with the check', 'ALLOW', A, entryPath(ADMIN), 'create', entry(ADMIN, { verified: true }), null],
  ['player posts a score with the check', 'DENY', U, entryPath(USER), 'create', entry(USER, { name: '플레이어', verified: true }), null],
  ['player posts a score without it', 'ALLOW', U, entryPath(USER), 'create', entry(USER, { name: '플레이어' }), null],
  ['player sets verified false', 'DENY', U, entryPath(USER), 'create', entry(USER, { name: '플레이어', verified: false }), null],
  ['admin adds the check to an old entry (same score)', 'ALLOW', A, entryPath(ADMIN), 'update', entry(ADMIN, { verified: true }), { data: entry(ADMIN, { at: '2026-10-21T02:00:00Z' }) }],
  ['player adds the check to an old entry', 'DENY', U, entryPath(USER), 'update', entry(USER, { name: '플레이어', verified: true }), { data: entry(USER, { name: '플레이어', at: '2026-10-21T02:00:00Z' }) }],
  ['admin card with the check', 'ALLOW', A, cardPath(ADMIN), 'update', card(ADMIN, { verified: true }), { data: card(ADMIN, { at: '2026-10-21T02:00:00Z' }) }],
  ['player card with the check', 'DENY', U, cardPath(USER), 'update', card(USER, { name: '플레이어', verified: true }), { data: card(USER, { name: '플레이어', at: '2026-10-21T02:00:00Z' }) }],
  ['player card without it', 'ALLOW', U, cardPath(USER), 'update', card(USER, { name: '플레이어' }), { data: card(USER, { name: '플레이어', at: '2026-10-21T02:00:00Z' }) }],
];

(async () => {
  const a = auth.getGlobalDefaultAccount();
  const t = (await auth.getAccessToken(a.tokens.refresh_token, [])).access_token;
  const testCases = cases.map(([, expectation, authObj, path, method, data, resource]) => ({
    expectation,
    request: { auth: authObj, path, method, time: T, resource: { data } },
    ...(resource ? { resource } : {}),
    functionMocks: mocks,
  }));
  const res = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}:test`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: fs.readFileSync(process.argv[2] || 'firestore.rules', 'utf8') }] }, testSuite: { testCases } }),
  });
  const out = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(out).slice(0, 1500));
  let failed = 0;
  out.testResults.forEach((r, i) =>
    console.log(`${r.state === 'SUCCESS' ? 'PASS' : 'FAIL'} ${cases[i][0]} (want ${cases[i][1]})${r.state === 'SUCCESS' ? '' : ' ' + JSON.stringify(r.debugMessages ?? r).slice(0, 400)}`)
  );
  failed = out.testResults.filter((r) => r.state !== 'SUCCESS').length;
  if (failed) process.exitCode = 1;
})().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
