// Rules :test: leaderboard writes once config/scoreKey.enforce is true (mocked; nothing is deployed or changed)
const { firebaseToolsLib } = require('./_tools.cjs');
const FT = firebaseToolsLib();
const fs = require('fs');
const crypto = require('crypto');
const auth = require(FT + 'auth.js');
const PROJECT = 'ambient-post-1kpr3';
const DB = 'ai-studio-9fb7cc09-52d2-4de4-9866-b3ecaf99c200';
const T = '2026-10-20T12:00:00Z';
const DAY = Math.floor((Date.parse(T) + 9 * 3600e3) / 86400e3);
const SECRET = 'x'.repeat(40);
const U = 'aaaaaaaaaaaaaaaaaaaa';
const pathOf = (game) => `/databases/${DB}/documents/leaderboards/${game}_d${DAY}/scores/${U}`;
const proof = (score, day = DAY, game = 'suika') => crypto.createHash('sha256').update(`${SECRET}|${U}|${game}|${score}|${day}|${SECRET}`).digest('hex').toUpperCase();
const me = { uid: U, token: { email: 'p@x', email_verified: true, firebase: { sign_in_provider: 'google.com' } } };
const entry = (score, extra = {}) => ({ uid: U, name: '플레이어', avatar: '🍓', score, at: T, ...extra });
const mocks = (enforce) => [
  { function: 'get', args: [{ anyValue: {} }], result: { value: { data: { secret: SECRET, enforce, emails: [] } } } },
  { function: 'exists', args: [{ anyValue: {} }], result: { value: false } },
];
const cases = [
  ['enforce on: no proof', 'DENY', true, 'create', entry(5000), null],
  ['enforce on: valid proof', 'ALLOW', true, 'create', entry(5000, { proof: proof(5000) }), null],
  ["enforce on: yesterday's proof", 'ALLOW', true, 'create', entry(5000, { proof: proof(5000, DAY - 1) }), null],
  ['enforce on: proof for another score', 'DENY', true, 'create', entry(9000, { proof: proof(5000) }), null],
  ['enforce on: made-up proof', 'DENY', true, 'create', entry(5000, { proof: 'A'.repeat(64) }), null],
  ['enforce on: higher score without proof', 'DENY', true, 'update', entry(6000), { data: entry(5000, { at: '2026-10-20T11:00:00Z' }) }],
  ['enforce on: same score, new look', 'ALLOW', true, 'update', entry(5000, { name: '새이름' }), { data: entry(5000, { at: '2026-10-20T11:00:00Z' }) }],
  ['enforce off (today): no proof', 'ALLOW', false, 'create', entry(5000), null],
  ['piano board: valid proof', 'ALLOW', true, 'create', entry(120, { proof: proof(120, DAY, 'piano') }), null, 'piano'],
  ['piano board: over the cap', 'DENY', true, 'create', entry(100001, { proof: proof(100001, DAY, 'piano') }), null, 'piano'],
];

(async () => {
  const a = auth.getGlobalDefaultAccount();
  const t = (await auth.getAccessToken(a.tokens.refresh_token, [])).access_token;
  const testCases = cases.map(([, expectation, enforce, method, data, resource, game = 'suika']) => ({
    expectation,
    request: { auth: me, path: pathOf(game), method, time: T, resource: { data } },
    ...(resource ? { resource } : {}),
    functionMocks: mocks(enforce),
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
