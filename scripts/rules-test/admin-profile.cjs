// Rules :test for admins changing a player's look (users profile, board entries, player cards) and
// for owner_ frames, which only admins give (ownerGifts). Mocked; nothing is deployed.
const { firebaseToolsLib } = require('./_tools.cjs');
const FT = firebaseToolsLib();
const fs = require('fs');
const auth = require(FT + 'auth.js');
const PROJECT = 'ambient-post-1kpr3';
const DB = 'ai-studio-9fb7cc09-52d2-4de4-9866-b3ecaf99c200';
const D = `/databases/${DB}/documents`;
const T = '2026-10-25T03:00:00Z';
const BEFORE = '2026-10-25T02:00:00Z';
const U = 'aaaaaaaaaaaaaaaaaaaa'; // the owner gave this player the prism frame
const V = 'bbbbbbbbbbbbbbbbbbbb'; // no gift
const OWNER_UID = 'oooooooooooooooooooo';
const who = (uid, email) => ({ uid, token: { email, email_verified: true, firebase: { sign_in_provider: 'google.com' } } });
const OWNER = who(OWNER_UID, 'owner@x');
const ADMIN = who('dddddddddddddddddddd', 'admin@x');
const PLAYER = who(U, 'p@x');
const OTHER = who(V, 'q@x');
const mocks = [
  { function: 'get', args: [{ exactValue: `${D}/config/admins` }], result: { value: { data: { emails: ['owner@x', 'admin@x'] } } } },
  { function: 'get', args: [{ exactValue: `${D}/ownerGifts/${U}` }], result: { value: { data: { items: ['owner_frame_prism'] } } } },
  { function: 'get', args: [{ exactValue: `${D}/ownerGifts/${V}` }], result: { undefined: {} } },
  { function: 'get', args: [{ exactValue: `${D}/ownerGifts/${OWNER_UID}` }], result: { undefined: {} } },
  { function: 'exists', args: [{ anyValue: {} }], result: { value: false } },
];

const profile = (extra = {}) => ({ uid: U, email: 'p@x', createdAt: '2026-10-01', nickname: '옛날이름', avatar: '', title: 'suika_10000', frame: 'frame_gold', ...extra });
const userDoc = (p) => ({ profile: p, statistics: { coinsEarned: 100, coinsSpent: 0 }, achievements: {}, settings: {} });
const entry = (uid, extra = {}) => ({ uid, name: '옛날이름', avatar: '🍓', score: 5000, at: BEFORE, title: 'suika_10000', frame: 'frame_gold', ...extra });
const card = (uid, extra = {}) => ({
  uid, code: 'ABCD2345', name: '옛날이름', avatar: '🍓', level: 10, achievements: 20,
  best: { memory: 0, suika: 0, dash: 0, puzzle: 0, slice: 0 }, title: 'suika_10000', frame: 'frame_gold', at: BEFORE, ...extra,
});
const without = (o, ...keys) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

const upd = (name, want, authObj, path, before, after) => [name, want, { auth: authObj, path: `${D}/${path}`, method: 'update', time: T, resource: { data: after } }, { data: before }];
const make = (name, want, authObj, path, data) => [name, want, { auth: authObj, path: `${D}/${path}`, method: 'create', time: T, resource: { data } }, null];
const read = (name, want, authObj, path, data) => [name, want, { auth: authObj, path: `${D}/${path}`, method: 'get', time: T }, data ? { data } : null];

const board = (uid) => `leaderboards/suika_all/scores/${uid}`;
const cases = [
  // users/{uid}.profile
  upd('admin renames a player', 'ALLOW', ADMIN, `users/${U}`, userDoc(profile()), userDoc(profile({ nickname: '새이름', title: '', modAt: 'm2026-10-25 12:00' }))),
  upd('player renames someone else', 'DENY', OTHER, `users/${U}`, userDoc(profile()), userDoc(profile({ nickname: '새이름' }))),
  upd('admin changes stats', 'DENY', ADMIN, `users/${U}`, userDoc(profile()), { ...userDoc(profile()), statistics: { coinsEarned: 9999, coinsSpent: 0 } }),
  upd('admin changes the email', 'DENY', ADMIN, `users/${U}`, userDoc(profile()), userDoc(profile({ email: 'x@x' }))),

  // board entries
  upd('admin: new name, fruit avatar, photo off', 'ALLOW', ADMIN, board(U), entry(U, { photo: 'https://lh3.googleusercontent.com/a/x' }), entry(U, { name: '새이름', avatar: '🍇' })),
  upd('admin: title and frame off', 'ALLOW', ADMIN, board(U), entry(U), without(entry(U), 'title', 'frame')),
  upd('admin changes the score', 'DENY', ADMIN, board(U), entry(U), entry(U, { score: 9 })),
  upd('admin puts on a staff title', 'DENY', ADMIN, board(U), entry(U), entry(U, { title: 'staff_admin' })),
  upd('admin puts on a frame they did not own', 'DENY', ADMIN, board(U), entry(U), entry(U, { frame: 'frame_holo' })),
  upd('admin puts on a new photo', 'DENY', ADMIN, board(U), entry(U), entry(U, { photo: 'https://lh3.googleusercontent.com/a/y' })),
  upd('admin gives a staff-looking name', 'DENY', ADMIN, board(U), entry(U), entry(U, { name: '운영자' })),
  upd('admin: prism frame on a gifted player', 'ALLOW', ADMIN, board(U), entry(U), entry(U, { frame: 'owner_frame_prism' })),
  upd('admin: prism frame on a player without the gift', 'DENY', ADMIN, board(V), entry(V), entry(V, { frame: 'owner_frame_prism' })),
  upd('player edits someone else\'s entry', 'DENY', OTHER, board(U), entry(U), entry(U, { name: '바보' })),

  // player cards
  upd('admin edits a card', 'ALLOW', ADMIN, `players/${U}`, card(U), card(U, { name: '새이름', avatar: '🍇', at: T })),
  upd('admin changes a card level', 'DENY', ADMIN, `players/${U}`, card(U), card(U, { level: 99, at: T })),
  upd('gifted player wears the prism frame', 'ALLOW', PLAYER, `players/${U}`, card(U), card(U, { frame: 'owner_frame_prism', at: T })),
  upd('player without the gift wears it', 'DENY', OTHER, `players/${V}`, card(V), card(V, { frame: 'owner_frame_prism', at: T })),
  upd('an admin card shows Lv.999', 'ALLOW', OWNER, `players/${OWNER_UID}`, card(OWNER_UID), card(OWNER_UID, { level: 999, at: T })),
  upd('an admin wears it', 'ALLOW', OWNER, `players/${OWNER_UID}`, card(OWNER_UID), card(OWNER_UID, { frame: 'owner_frame_prism', at: T })),

  // ownerGifts
  make('owner gives the prism frame', 'ALLOW', OWNER, `ownerGifts/${V}`, { items: ['owner_frame_prism'], at: T }),
  make('another admin gives the prism frame', 'ALLOW', ADMIN, `ownerGifts/${V}`, { items: ['owner_frame_prism'], at: T }),
  make('player gives it to themselves', 'DENY', OTHER, `ownerGifts/${V}`, { items: ['owner_frame_prism'], at: T }),
  make('admin gives an unknown item', 'DENY', ADMIN, `ownerGifts/${V}`, { items: ['owner_frame_prism', 'frame_holo'], at: T }),
  read('player reads their gifts', 'ALLOW', PLAYER, `ownerGifts/${U}`, { items: ['owner_frame_prism'], at: T }),
  read('player reads someone else\'s gifts', 'DENY', OTHER, `ownerGifts/${U}`, { items: ['owner_frame_prism'], at: T }),
];

(async () => {
  const a = auth.getGlobalDefaultAccount();
  const t = (await auth.getAccessToken(a.tokens.refresh_token, [])).access_token;
  const testCases = cases.map(([, expectation, request, resource]) => ({ expectation, request, ...(resource ? { resource } : {}), functionMocks: mocks }));
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
