// Rules :test for player cards: bests backed by the all-time board, level / achievement caps (mocked)
const { firebaseToolsLib } = require('./_tools.cjs');
const FT = firebaseToolsLib();
const fs = require('fs');
const auth = require(FT + 'auth.js');
const PROJECT = 'ambient-post-1kpr3';
const DB = 'ai-studio-9fb7cc09-52d2-4de4-9866-b3ecaf99c200';
const T = '2026-10-20T12:00:00Z';
const U = 'aaaaaaaaaaaaaaaaaaaa';
const path = `/databases/${DB}/documents/players/${U}`;
const me = { uid: U, token: { email: 'p@x', email_verified: true, firebase: { sign_in_provider: 'google.com' } } };
const card = (extra = {}) => ({
  uid: U, code: 'ABCD2345', name: '플레이어', avatar: '🍓', level: 10, achievements: 20,
  best: { memory: 0, suika: 5000, dash: 0, puzzle: 0, slice: 0 }, at: T, ...extra,
});
const old = { data: card({ at: '2026-10-20T11:00:00Z' }) };
// Every get() reads as an all-time board entry with score 6000 (and an empty admin list)
const mocks = [
  { function: 'get', args: [{ anyValue: {} }], result: { value: { data: { score: 6000, emails: [] } } } },
  { function: 'exists', args: [{ anyValue: {} }], result: { value: false } },
];
const cases = [
  ['best under the board score', 'ALLOW', card()],
  ['best equal to the board score', 'ALLOW', card({ best: { memory: 0, suika: 6000, dash: 0, puzzle: 0, slice: 0 } })],
  ['best above the board score', 'DENY', card({ best: { memory: 0, suika: 9000, dash: 0, puzzle: 0, slice: 0 } })],
  ['all zero', 'ALLOW', card({ best: { memory: 0, suika: 0, dash: 0, puzzle: 0, slice: 0 } })],
  ['level 200', 'ALLOW', card({ level: 200 })],
  ['level 250', 'DENY', card({ level: 250 })],
  ['60 achievements', 'ALLOW', card({ achievements: 60 })],
  ['70 achievements', 'DENY', card({ achievements: 70 })],
];

(async () => {
  const a = auth.getGlobalDefaultAccount();
  const t = (await auth.getAccessToken(a.tokens.refresh_token, [])).access_token;
  const testCases = cases.map(([, expectation, data]) => ({
    expectation,
    request: { auth: me, path, method: 'update', time: T, resource: { data } },
    resource: old,
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
