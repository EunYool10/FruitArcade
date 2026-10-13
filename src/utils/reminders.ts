// Streak reminders: in the evening the reminder sender (scripts/reminders, GitHub Actions) pushes
// "오늘 한 판 해요!" to players whose streak would end at midnight. Each signed-in device that turns
// them on stores its push subscription, last play day and streak in push/<uid>~<device>, sealed
// with the sender's public key (RSA-OAEP + AES-GCM) so the stored copy is useless to anyone else.
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firestore';
import { StreakState } from './progress';
import { todayKey } from './missions';
import { loadReminderState, saveReminderState } from './reminderState';

/** The sender's VAPID public key (web push only delivers messages signed with its private half) */
const VAPID_PUBLIC = 'BOF1xmUpA0itz4_LEMe64XKNaufoKi6-3HLdcy5iwZ6GAG4RuXYKwND-Zl201P2_tf7ZWvxd3dWtlzvTd5ifATU';
/** The sender's RSA public key (SPKI, base64): subscriptions are sealed with it */
const BOX_PUBLIC =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAz8KOoaYiBTEqTDjbJHWTKBtqPnEaTTi1plSfbdSd0M8XISnbJVFdNau3U4CcT3zrN9EASUb3UPO0rVOFWk1p0ejlvzrtPGWJKgL4Hrb4OzhR4luvF682VfmaTkskgyEnUnVOWTy4A4y1+NV/P/9Kg0sqA3LpkYrDtbdIvdAVuoTDlAZKeLqt8q4+l9Y9ZfBNLojRWwMaLaDhH9argEyzqga3PLlFHae+IgdG06nCwJBTOvlkCTY9mvjUZPCHxk4ygYv62TXAZoBnEePSX1h8G89PLdGWeJNdOIpbyLHbXyeKpM/sgdJc18HoZJdRx8HCgGfclEIKXVzSp2DyOZzBDQIDAQAB';

const toB64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const toB64url = (buf: ArrayBuffer) => toB64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Calendar day number of a "YYYY-MM-DD" date; the sender counts Korean days the same way */
export const dayNumber = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return y && m && d ? Math.floor(Date.UTC(y, m - 1, d) / 86_400_000) : 0;
};

/** Hybrid encryption: a fresh AES-GCM key for the data, wrapped with the sender's RSA key */
async function seal(payload: unknown): Promise<{ ek: string; iv: string; ct: string }> {
  const rsa = await crypto.subtle.importKey('spki', fromB64(BOX_PUBLIC), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(JSON.stringify(payload)));
  const ek = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsa, await crypto.subtle.exportKey('raw', aes));
  return { ek: toB64(ek), iv: toB64(iv), ct: toB64(ct) };
}

/** This browser's push subscription for our key (made when `create`), or null */
async function subscription(create: boolean): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  // One made with a different key can't receive our messages
  const key = sub?.options.applicationServerKey;
  if (sub && key && toB64url(key) !== VAPID_PUBLIC) {
    await sub.unsubscribe();
    sub = null;
  }
  if (!sub && create) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64(VAPID_PUBLIC) });
  return sub;
}

const ref = (uid: string, device: string) => doc(db, 'push', `${uid}~${device}`);
const signature = (sub: PushSubscription, streak: StreakState) => `${sub.endpoint}|${streak.last}|${streak.count}|${todayKey()}`;

async function store(uid: string, sub: PushSubscription, streak: StreakState): Promise<void> {
  const state = loadReminderState();
  const box = await seal({ s: sub.toJSON(), d: dayNumber(streak.last), k: streak.count });
  await setDoc(ref(uid, state.device), { uid, box, at: serverTimestamp() });
  saveReminderState({ ...state, on: true, sent: signature(sub, streak) });
}

export type EnableResult = 'on' | 'denied' | 'error';

/** Turn reminders on for this device: permission, subscription, sealed copy in Firestore */
export async function enableReminders(uid: string, streak: StreakState): Promise<EnableResult> {
  try {
    if ((await Notification.requestPermission()) !== 'granted') return 'denied';
    const sub = await subscription(true);
    if (!sub) return 'error';
    await store(uid, sub, streak);
    return 'on';
  } catch (err) {
    console.warn('Could not turn on reminders:', err);
    return 'error';
  }
}

/** Turn them off: forget the stored copy and the subscription */
export async function disableReminders(uid: string): Promise<void> {
  const state = loadReminderState();
  saveReminderState({ ...state, on: false, sent: '' });
  await Promise.allSettled([deleteDoc(ref(uid, state.device)), subscription(false).then((s) => s?.unsubscribe())]);
}

/** After a round, and once a day when the app opens: keep the stored day and streak current */
export async function refreshReminders(uid: string, streak: StreakState): Promise<void> {
  const state = loadReminderState();
  if (!state.on) return;
  if (Notification.permission !== 'granted') {
    await disableReminders(uid);
    return;
  }
  const sub = await subscription(true);
  if (sub && signature(sub, streak) !== state.sent) await store(uid, sub, streak);
}
