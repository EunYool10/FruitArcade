// Rules :test for config/admins: admins add admins, only the owner (first email) removes, the owner
// stays. Mocked; nothing is deployed.
const { firebaseToolsLib } = require('./_tools.cjs');
const FT = firebaseToolsLib();
const fs = require('fs');
const auth = require(FT + 'auth.js');
const PROJECT = 'ambient-post-1kpr3';
const DB = 'ai-studio-9fb7cc09-52d2-4de4-9866-b3ecaf99c200';
const D = `/databases/${DB}/documents`;
const T = '2026-10-25T03:00:00Z';
const LIST = ['owner@x', 'admin@x', 'other@x'];
const who = (email) => ({ uid: 'u' + email.length.toString().padStart(19, '0'), token: { email, email_verified: true, firebase: { sign_in_provider: 'google.com' } } });
const mocks = [{ function: 'get', args: [{ exactValue: `${D}/config/admins` }], result: { value: { data: { emails: LIST } } } }];
const write = (name, want, email, emails, extra = {}) => [name, want, who(email), { emails, ...extra }];
const cases = [
  write('admin adds an admin', 'ALLOW', 'admin@x', [...LIST, 'new@x']),
  write('player adds themselves', 'DENY', 'player@x', [...LIST, 'player@x']),
  write('admin removes another admin', 'DENY', 'admin@x', ['owner@x', 'admin@x']),
  write('owner removes an admin', 'ALLOW', 'owner@x', ['owner@x', 'admin@x']),
  write('owner removed', 'DENY', 'admin@x', ['admin@x', 'other@x']),
  write('owner moved off first place', 'DENY', 'owner@x', ['admin@x', 'owner@x', 'other@x']),
  write('another field', 'DENY', 'admin@x', [...LIST, 'new@x'], { note: 'hi' }),
  write('more than 30', 'DENY', 'admin@x', [...LIST, ...Array.from({ length: 28 }, (_, i) => `a${i}@x`)]),
];

(async () => {
  const a = auth.getGlobalDefaultAccount();
  const t = (await auth.getAccessToken(a.tokens.refresh_token, [])).access_token;
  const testCases = cases.map(([, expectation, authObj, data]) => ({
    expectation,
    request: { auth: authObj, path: `${D}/config/admins`, method: 'update', time: T, resource: { data } },
    resource: { data: { emails: LIST } },
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
