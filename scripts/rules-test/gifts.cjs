// Rules :test for coin gifts: players send at most 5 a day and up to 300 each, paying for them;
// admins have no daily count or amount limit (up to the coin cap). Mocked; nothing is deployed.
const { firebaseToolsLib } = require('./_tools.cjs');
const FT = firebaseToolsLib();
const fs = require('fs');
const auth = require(FT + 'auth.js');
const PROJECT = 'ambient-post-1kpr3';
const DB = 'ai-studio-9fb7cc09-52d2-4de4-9866-b3ecaf99c200';
const D = `/databases/${DB}/documents`;
const T = '2026-10-26T03:00:00Z';
const DAY = Math.floor((Date.parse(T) + 9 * 3600e3) / 86400e3);
const P = 'aaaaaaaaaaaaaaaaaaaa';
const A = 'dddddddddddddddddddd';
const F = 'ffffffffffffffffffff';
const who = (uid, email) => ({ uid, token: { email, email_verified: true, firebase: { sign_in_provider: 'google.com' } } });
const PLAYER = who(P, 'p@x');
const ADMIN = who(A, 'admin@x');
const pair = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
const mocks = [
  { function: 'get', args: [{ exactValue: `${D}/config/admins` }], result: { value: { data: { emails: ['admin@x'] } } } },
  { function: 'exists', args: [{ exactValue: `${D}/friendships/${pair(P, F)}` }], result: { value: true } },
  { function: 'exists', args: [{ exactValue: `${D}/friendships/${pair(A, F)}` }], result: { value: true } },
  { function: 'get', args: [{ exactValue: `${D}/friendships/${pair(P, F)}` }], result: { value: { data: { status: 'accepted' } } } },
  { function: 'get', args: [{ exactValue: `${D}/friendships/${pair(A, F)}` }], result: { value: { data: { status: 'accepted' } } } },
  { function: 'exists', args: [{ anyValue: {} }], result: { value: false } },
  // The player has 1000 coins earned, 0 spent, and pays in the same write
  { function: 'get', args: [{ exactValue: `${D}/users/${P}` }], result: { value: { data: { statistics: { coinsEarned: 1000, coinsSpent: 0 } } } } },
  { function: 'getAfter', args: [{ exactValue: `${D}/users/${P}` }], result: { value: { data: { statistics: { coinsEarned: 1000, coinsSpent: 300 } } } } },
];
const gift = (from, n, amount) => ({ from, to: F, amount, day: DAY, at: T, claimed: false });
const make = (name, want, authObj, n, amount) => [name, want, authObj, `${authObj.uid}_${DAY}_${n}`, gift(authObj.uid, n, amount)];
const cases = [
  make("player's 5th gift today", 'ALLOW', PLAYER, 5, 300),
  make("player's 6th gift today", 'DENY', PLAYER, 6, 300),
  make('player sends 301', 'DENY', PLAYER, 1, 301),
  make("admin's 21st gift today", 'ALLOW', ADMIN, 21, 1000),
  make("admin's 500th gift today", 'ALLOW', ADMIN, 500, 1000),
  make('admin sends the coin cap', 'ALLOW', ADMIN, 2, 99999999999),
  make('admin sends past the coin cap', 'DENY', ADMIN, 3, 100000000000),
  make('admin uses slot 0', 'DENY', ADMIN, 0, 10),
];

(async () => {
  const a = auth.getGlobalDefaultAccount();
  const t = (await auth.getAccessToken(a.tokens.refresh_token, [])).access_token;
  const testCases = cases.map(([, expectation, authObj, id, data]) => ({
    expectation,
    request: { auth: authObj, path: `${D}/gifts/${id}`, method: 'create', time: T, resource: { data } },
    functionMocks: mocks,
  }));
  const res = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}:test`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: fs.readFileSync(process.argv[2] || 'firestore.rules', 'utf8') }] }, testSuite: { testCases } }),
  });
  const out = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(out).slice(0, 1500));
  out.testResults.forEach((r, i) =>
    console.log(`${r.state === 'SUCCESS' ? 'PASS' : 'FAIL'} ${cases[i][0]} (want ${cases[i][1]})${r.state === 'SUCCESS' ? '' : ' ' + JSON.stringify(r.debugMessages ?? r).slice(0, 400)}`)
  );
  if (out.testResults.some((r) => r.state !== 'SUCCESS')) process.exitCode = 1;
})().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
