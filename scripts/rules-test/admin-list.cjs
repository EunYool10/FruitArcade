// Rules :test for config/admins: admins add admins, only an owner takes anyone off, owners stay
// and only the console changes who they are. Mocked; nothing is deployed.
const { firebaseToolsLib } = require('./_tools.cjs');
const FT = firebaseToolsLib();
const fs = require('fs');
const auth = require(FT + 'auth.js');
const PROJECT = 'ambient-post-1kpr3';
const DB = 'ai-studio-9fb7cc09-52d2-4de4-9866-b3ecaf99c200';
const D = `/databases/${DB}/documents`;
const T = '2026-10-26T03:00:00Z';
const OWNERS = ['owner@x', 'owner2@x'];
const LIST = ['owner@x', 'owner2@x', 'admin@x', 'other@x'];
const who = (email) => ({ uid: 'u' + email.length.toString().padStart(19, '0'), token: { email, email_verified: true, firebase: { sign_in_provider: 'google.com' } } });
const doc = { emails: LIST, owners: OWNERS };
// An older doc without owners: the first email is the owner
const old = { emails: ['owner@x', 'admin@x', 'other@x'] };
const mocksFor = (data) => [{ function: 'get', args: [{ exactValue: `${D}/config/admins` }], result: { value: { data } } }];
const write = (name, want, email, after, before = doc) => [name, want, who(email), after, before];
const cases = [
  write('admin adds an admin', 'ALLOW', 'admin@x', { emails: [...LIST, 'new@x'], owners: OWNERS }),
  write('player adds themselves', 'DENY', 'player@x', { emails: [...LIST, 'player@x'], owners: OWNERS }),
  write('admin removes another admin', 'DENY', 'admin@x', { emails: ['owner@x', 'owner2@x', 'admin@x'], owners: OWNERS }),
  write('owner removes an admin', 'ALLOW', 'owner@x', { emails: ['owner@x', 'owner2@x', 'admin@x'], owners: OWNERS }),
  write('second owner removes an admin', 'ALLOW', 'owner2@x', { emails: ['owner@x', 'owner2@x', 'admin@x'], owners: OWNERS }),
  write('owner removes the other owner', 'DENY', 'owner@x', { emails: ['owner@x', 'admin@x', 'other@x'], owners: OWNERS }),
  write('admin makes themselves an owner', 'DENY', 'admin@x', { emails: LIST, owners: [...OWNERS, 'admin@x'] }),
  write('owner drops the owners field', 'DENY', 'owner@x', { emails: LIST }),
  write('another field', 'DENY', 'admin@x', { emails: [...LIST, 'new@x'], owners: OWNERS, note: 'hi' }),
  write('more than 30', 'DENY', 'admin@x', { emails: [...LIST, ...Array.from({ length: 27 }, (_, i) => `a${i}@x`)], owners: OWNERS }),
  write('old doc: first email removes an admin', 'ALLOW', 'owner@x', { emails: ['owner@x', 'admin@x'] }, old),
  write('old doc: admin removes the first email', 'DENY', 'admin@x', { emails: ['admin@x', 'other@x'] }, old),
];

(async () => {
  const a = auth.getGlobalDefaultAccount();
  const t = (await auth.getAccessToken(a.tokens.refresh_token, [])).access_token;
  const testCases = cases.map(([, expectation, authObj, after, before]) => ({
    expectation,
    request: { auth: authObj, path: `${D}/config/admins`, method: 'update', time: T, resource: { data: after } },
    resource: { data: before },
    functionMocks: mocksFor(before),
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
