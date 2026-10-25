// Rules :test for coins: signed round grants (coinGrants), the new-account cap, and how coins may
// change on users/{uid} (isCoinChangeOk). If the update rule doesn't call isCoinChangeOk yet, the
// suite adds it in memory so the check is tested before it goes live. Nothing is deployed.
const { firebaseToolsLib } = require('./_tools.cjs');
const FT = firebaseToolsLib();
const fs = require('fs');
const crypto = require('crypto');
const auth = require(FT + 'auth.js');
const PROJECT = 'ambient-post-1kpr3';
const DB = 'ai-studio-9fb7cc09-52d2-4de4-9866-b3ecaf99c200';
const D = `/databases/${DB}/documents`;
const T = '2026-10-25T03:00:00Z';
const SECRET = 'x'.repeat(40);
const U = 'aaaaaaaaaaaaaaaaaaaa';
const G = '0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d';
const GIFT = `bbbbbbbbbbbbbbbbbbbb_20750_1`;
const sig = (uid, id, coins) => crypto.createHash('sha256').update(`${SECRET}|grant|${uid}|${id}|${coins}|${SECRET}`).digest('hex').toUpperCase();
const who = (uid, email) => ({ uid, token: { email, email_verified: true, firebase: { sign_in_provider: 'google.com' } } });
const ME = who(U, 'p@x');
const ADMIN = who(U, 'admin@x');
const profile = { uid: U, email: 'p@x', createdAt: '2026-10-01' };
const userDoc = (statistics) => ({ profile, statistics });
const stats = (earned, spent, extra = {}) => ({ coinsEarned: earned, coinsSpent: spent, totalPlayCount: 10, ...extra });
const exact = (fn, path, value) => ({ function: fn, args: [{ exactValue: `${D}/${path}` }], result: { value } });
const mocks = [
  exact('get', 'config/scoreKey', { data: { secret: SECRET, enforce: true } }),
  exact('get', 'config/admins', { data: { emails: ['admin@x'] } }),
  exact('exists', `coinGrants/${G}`, false),
  exact('existsAfter', `coinGrants/${G}`, true),
  exact('getAfter', `coinGrants/${G}`, { data: { uid: U, coins: 30 } }),
  exact('exists', `gifts/${GIFT}`, true),
  exact('get', `gifts/${GIFT}`, { data: { claimed: false, to: U, amount: 300 } }),
  exact('getAfter', `gifts/${GIFT}`, { data: { claimed: true, to: U, amount: 300 } }),
];
const update = (name, want, before, after, authObj = ME) => [name, want, { auth: authObj, path: `${D}/users/${U}`, method: 'update', time: T, resource: { data: userDoc(after) } }, { data: userDoc(before) }];
const grant = (name, want, id, data, authObj = ME) => [name, want, { auth: authObj, path: `${D}/coinGrants/${id}`, method: 'create', time: T, resource: { data } }, null];
const cases = [
  grant('signed grant', 'ALLOW', G, { uid: U, coins: 30, sig: sig(U, G, 30), at: T }),
  grant('grant with a made-up signature', 'DENY', G, { uid: U, coins: 30, sig: 'A'.repeat(64), at: T }),
  grant('grant signed for fewer coins', 'DENY', G, { uid: U, coins: 50, sig: sig(U, G, 30), at: T }),
  grant('grant over 50 coins', 'DENY', G, { uid: U, coins: 60, sig: sig(U, G, 60), at: T }),
  grant("someone else's grant", 'DENY', G, { uid: 'cccccccccccccccccccc', coins: 30, sig: sig('cccccccccccccccccccc', G, 30), at: T }),
  grant('grant with a bad id', 'DENY', 'not-a-ticket', { uid: U, coins: 30, sig: sig(U, 'not-a-ticket', 30), at: T }),
  ['new account with 500 coins', 'ALLOW', { auth: ME, path: `${D}/users/${U}`, method: 'create', time: T, resource: { data: userDoc(stats(500, 0)) } }, null],
  ['new account with 5000 coins', 'DENY', { auth: ME, path: `${D}/users/${U}`, method: 'create', time: T, resource: { data: userDoc(stats(5000, 0)) } }, null],
  update('play counts change, coins stay', 'ALLOW', stats(100, 50), stats(100, 50, { totalPlayCount: 11 })),
  update('coins up without a grant', 'DENY', stats(100, 50), stats(120, 50)),
  update('coins up by a grant (30 + bonuses)', 'ALLOW', stats(100, 50), stats(215, 50, { coinGrant: G })),
  update('coins up by more than the grant allows', 'DENY', stats(100, 50), stats(216, 50, { coinGrant: G })),
  update('spending', 'ALLOW', stats(100, 50), stats(100, 90)),
  update('spent goes down', 'DENY', stats(100, 50), stats(100, 0)),
  update('a new account brings 800 from its device', 'ALLOW', stats(0, 0), stats(800, 0)),
  update('a new account brings 5000', 'DENY', stats(0, 0), stats(5000, 0)),
  update('full reset', 'ALLOW', stats(100, 50), stats(0, 0)),
  update('gift claimed (300)', 'ALLOW', stats(100, 50), stats(400, 50, { giftClaim: GIFT })),
  update('gift claim worth more than the gift', 'DENY', stats(100, 50), stats(401, 50, { giftClaim: GIFT })),
  update('admin', 'ALLOW', stats(100, 50), stats(99_999_999, 50), ADMIN),
];

(async () => {
  const a = auth.getGlobalDefaultAccount();
  const t = (await auth.getAccessToken(a.tokens.refresh_token, [])).access_token;
  let content = fs.readFileSync(process.argv[2] || 'firestore.rules', 'utf8').replace(/\r\n/g, '\n');
  const live = '        && profileIdentityUnchanged()\n        && isCoinChangeOk();';
  if (!content.includes(live)) {
    const before = '        && profileIdentityUnchanged();';
    if (!content.includes(before)) throw new Error('users update rule not found');
    content = content.replace(before, live);
    const create = '      allow create: if isOwner(userId) && isValidUserDoc(userId, request.resource.data);';
    if (!content.includes(create)) throw new Error('users create rule not found');
    content = content.replace(create, create.slice(0, -1) + "\n        && statNum(request.resource.data, 'coinsEarned') <= 1000;");
    console.log('(isCoinChangeOk and the new-account cap are not live yet: tested in memory)');
  }
  const testCases = cases.map(([, expectation, request, resource]) => ({ expectation, request, ...(resource ? { resource } : {}), functionMocks: mocks }));
  const res = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}:test`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content }] }, testSuite: { testCases } }),
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
