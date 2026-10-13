// Daily streak reminders, run by GitHub Actions at about 20:00 Korean time
// (.github/workflows/reminders.yml). Reads the sealed subscriptions in push/*, opens them with
// PUSH_BOX_KEY and pushes "오늘 한 판 해요!" to players whose streak ends at midnight: their
// last round was yesterday (Korean time) on every device they turned reminders on.
//
// Env: VAPID_PRIVATE_KEY, PUSH_BOX_KEY (secrets), DRY_RUN=1 to only report,
//      FIRESTORE_BASE to use another Firestore (e.g. the emulator in tests).
import crypto from 'node:crypto';
import fs from 'node:fs';
import webpush from 'web-push';

const CONFIG = JSON.parse(fs.readFileSync(new URL('../../firebase-applet-config.json', import.meta.url), 'utf8'));
const BASE =
  process.env.FIRESTORE_BASE ||
  `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/${CONFIG.firestoreDatabaseId}/documents`;
const ORIGIN = new URL(BASE).origin;
/** Same key as src/utils/reminders.ts */
const VAPID_PUBLIC = 'BOF1xmUpA0itz4_LEMe64XKNaufoKi6-3HLdcy5iwZ6GAG4RuXYKwND-Zl201P2_tf7ZWvxd3dWtlzvTd5ifATU';
const { VAPID_PRIVATE_KEY, PUSH_BOX_KEY } = process.env;
const DRY_RUN = process.env.DRY_RUN === '1';
const STALE_DAYS = 40;
const DAY_MS = 86_400_000;
/** Korean calendar day number, counted like dayNumber() in the app */
const today = Math.floor((Date.now() + 9 * 3600_000) / DAY_MS);

if (!VAPID_PRIVATE_KEY || !PUSH_BOX_KEY) {
  console.error('VAPID_PRIVATE_KEY and PUSH_BOX_KEY are required');
  process.exit(1);
}

/** Undo the app's seal: RSA-OAEP(SHA-256) wraps an AES-256-GCM key (WebCrypto appends the tag) */
function open(box) {
  const key = crypto.privateDecrypt(
    { key: PUSH_BOX_KEY, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(box.ek, 'base64')
  );
  const data = Buffer.from(box.ct, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  decipher.setAuthTag(data.subarray(data.length - 16));
  return JSON.parse(Buffer.concat([decipher.update(data.subarray(0, data.length - 16)), decipher.final()]).toString('utf8'));
}

async function listDocs() {
  const docs = [];
  let pageToken = '';
  do {
    const res = await fetch(`${BASE}/push?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`);
    if (!res.ok) throw new Error(`listing push/ failed: ${res.status} ${await res.text()}`);
    const body = await res.json();
    docs.push(...(body.documents || []));
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return docs;
}

const docs = await listDocs();
const stale = [];
let unreadable = 0;
/** uid → latest play day and streak across their devices, and every device's subscription */
const players = new Map();
for (const d of docs) {
  const f = d.fields || {};
  const at = Date.parse(f.at?.timestampValue || d.updateTime);
  if (!(Date.now() - at < STALE_DAYS * DAY_MS)) {
    stale.push(d.name);
    continue;
  }
  const box = Object.fromEntries(Object.entries(f.box?.mapValue?.fields || {}).map(([k, v]) => [k, v.stringValue]));
  let sealed;
  try {
    sealed = open(box);
  } catch {
    unreadable++;
    continue;
  }
  const uid = f.uid?.stringValue;
  const day = Number(sealed.d) || 0;
  const streak = Number(sealed.k) || 0;
  const p = players.get(uid) || { day: 0, streak: 0, subs: [] };
  if (day > p.day) Object.assign(p, { day, streak });
  else if (day === p.day) p.streak = Math.max(p.streak, streak);
  if (sealed.s?.endpoint) p.subs.push(sealed.s);
  players.set(uid, p);
}

let due = 0;
let sent = 0;
let gone = 0;
let failed = 0;
for (const p of players.values()) {
  if (p.day !== today - 1 || p.streak < 1) continue;
  due++;
  const message = JSON.stringify({
    title: `🔥 ${p.streak}일 연속 출석 중!`,
    body: `오늘 한 판 하면 ${p.streak + 1}일째가 돼요. 자정이 지나면 끊겨요!`,
    tag: 'streak',
  });
  for (const sub of p.subs) {
    if (DRY_RUN) continue;
    try {
      await webpush.sendNotification(sub, message, {
        vapidDetails: { subject: 'https://eunyool10.github.io/FruitArcade/', publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE_KEY },
        TTL: 4 * 3600,
        urgency: 'normal',
      });
      sent++;
    } catch (err) {
      // 404/410: the browser dropped this subscription; its doc goes stale and is cleaned up later
      if (err.statusCode === 404 || err.statusCode === 410) gone++;
      else {
        failed++;
        console.warn(`push failed (${err.statusCode || err.message})`);
      }
    }
  }
}

// Docs nobody refreshed for 40 days (the rules let anyone remove those)
let removed = 0;
for (const name of DRY_RUN ? [] : stale) {
  const res = await fetch(`${ORIGIN}/v1/${name}`, { method: 'DELETE' });
  if (res.ok) removed++;
}

console.log(
  `day ${today}${DRY_RUN ? ' (dry run)' : ''}: ${docs.length} devices, ${players.size} players, ${due} due, ` +
    `${sent} sent, ${gone} gone, ${failed} failed, ${unreadable} unreadable, ${removed}/${stale.length} stale removed`
);
