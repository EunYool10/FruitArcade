// Rules :test for presence/{uid} against the local firestore.rules (nothing is deployed).
const { firebaseToolsLib } = require('./_tools.cjs');
const FT = firebaseToolsLib();
const fs = require('fs');
const auth = require(FT + 'auth.js');
const PROJECT = 'ambient-post-1kpr3';
const DB = 'ai-studio-9fb7cc09-52d2-4de4-9866-b3ecaf99c200';
const T = '2026-10-20T12:00:00Z';
const path = (uid) => `/databases/${DB}/documents/presence/${uid}`;
const ppath = (uid) => `/databases/${DB}/documents/players/${uid}`;
const who = (uid, email) => ({ uid, token: { email, email_verified: true, firebase: { sign_in_provider: 'google.com' } } });
const ME = 'aaaaaaaaaaaaaaaaaaaa';
const FRIEND = 'bbbbbbbbbbbbbbbbbbbb';
const STRANGER = 'cccccccccccccccccccc';
const ADMIN = 'dddddddddddddddddddd';
// get(): config/admins lists admin@x; any friendship doc reads as accepted. exists(): per case.
const mocks = (friends) => [
  { function: 'get', args: [{ anyValue: {} }], result: { value: { data: { emails: ['admin@x'], status: 'accepted' } } } },
  { function: 'exists', args: [{ anyValue: {} }], result: { value: friends } },
];
const cases = [
  ['owner creates now', 'ALLOW', { auth: who(ME, 'me@x'), path: path(ME), method: 'create', time: T, resource: { data: { at: T } } }, null, false],
  ['owner creates with extra field', 'DENY', { auth: who(ME, 'me@x'), path: path(ME), method: 'create', time: T, resource: { data: { at: T, x: 1 } } }, null, false],
  ['owner creates with a made-up time', 'DENY', { auth: who(ME, 'me@x'), path: path(ME), method: 'create', time: T, resource: { data: { at: '2026-10-21T00:00:00Z' } } }, null, false],
  ['someone else writes my presence', 'DENY', { auth: who(STRANGER, 's@x'), path: path(ME), method: 'create', time: T, resource: { data: { at: T } } }, null, false],
  ['owner updates after 60 s', 'ALLOW', { auth: who(ME, 'me@x'), path: path(ME), method: 'update', time: T, resource: { data: { at: T } } }, { data: { at: '2026-10-20T11:59:00Z' } }, false],
  ['owner updates after 5 s', 'DENY', { auth: who(ME, 'me@x'), path: path(ME), method: 'update', time: T, resource: { data: { at: T } } }, { data: { at: '2026-10-20T11:59:55Z' } }, false],
  ['owner reads own', 'ALLOW', { auth: who(ME, 'me@x'), path: path(ME), method: 'get', time: T }, { data: { at: T } }, false],
  ['friend reads', 'ALLOW', { auth: who(FRIEND, 'f@x'), path: path(ME), method: 'get', time: T }, { data: { at: T } }, true],
  ['stranger reads', 'DENY', { auth: who(STRANGER, 's@x'), path: path(ME), method: 'get', time: T }, { data: { at: T } }, false],
  ['signed-out reads', 'DENY', { path: path(ME), method: 'get', time: T }, { data: { at: T } }, false],
  ['admin reads', 'ALLOW', { auth: who(ADMIN, 'admin@x'), path: path(ME), method: 'get', time: T }, { data: { at: T } }, false],
  ['admin lists', 'ALLOW', { auth: who(ADMIN, 'admin@x'), path: path(ME), method: 'list', time: T }, { data: { at: T } }, false],
  ['player lists', 'DENY', { auth: who(FRIEND, 'f@x'), path: path(ME), method: 'list', time: T }, { data: { at: T } }, true],
  ['owner deletes', 'ALLOW', { auth: who(ME, 'me@x'), path: path(ME), method: 'delete', time: T }, { data: { at: T } }, false],
  ['admin lists players', 'ALLOW', { auth: who(ADMIN, 'admin@x'), path: ppath(ME), method: 'list', time: T }, { data: { at: T } }, false],
  ['player lists players', 'DENY', { auth: who(FRIEND, 'f@x'), path: ppath(ME), method: 'list', time: T }, { data: { at: T } }, false],
  ['player gets a card', 'ALLOW', { auth: who(FRIEND, 'f@x'), path: ppath(ME), method: 'get', time: T }, { data: { at: T } }, false],
  ['friend deletes', 'DENY', { auth: who(FRIEND, 'f@x'), path: path(ME), method: 'delete', time: T }, { data: { at: T } }, true],
];

(async () => {
  const account = auth.getGlobalDefaultAccount();
  const t = (await auth.getAccessToken(account.tokens.refresh_token, [])).access_token;
  const content = fs.readFileSync(process.argv[2] || 'firestore.rules', 'utf8');
  const testCases = cases.map(([, expectation, request, resource, friends]) => ({
    expectation,
    request,
    ...(resource ? { resource } : {}),
    functionMocks: mocks(friends),
  }));
  const res = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}:test`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content }] }, testSuite: { testCases } }),
  });
  const out = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(out).slice(0, 1500));
  if (out.issues?.length) console.log('issues', JSON.stringify(out.issues).slice(0, 800));
  out.testResults.forEach((r, i) => console.log(`${r.state === 'SUCCESS' ? 'PASS' : 'FAIL'} ${cases[i][0]} (want ${cases[i][1]})${r.state === 'SUCCESS' ? '' : ' ' + JSON.stringify(r.debugMessages ?? r.errorPosition ?? '').slice(0, 300)}`));
  if (out.testResults.some((r) => r.state !== 'SUCCESS')) process.exitCode = 1;
})().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
