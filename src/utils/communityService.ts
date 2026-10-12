import { doc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firestore';
import { APP_VERSION } from '../constants';
import { RankEntry, dayId } from './ranking';

// Things signed-in players send to the admins: reports, feedback, and daily play counts

export type ReportReason = 'name' | 'score' | 'other';
export type FeedbackKind = 'bug' | 'idea' | 'other';

const isDenied = (err: unknown) => (err as { code?: string })?.code === 'permission-denied';

/**
 * Flag a leaderboard entry for the admins.
 * Each player can report an entry once, so a second try comes back as 'duplicate'.
 */
export async function reportEntry(
  reporterUid: string,
  board: string,
  entry: RankEntry,
  reason: ReportReason,
  note: string
): Promise<'sent' | 'duplicate'> {
  try {
    await setDoc(doc(db, 'reports', `${board}~${entry.uid}~${reporterUid}`), {
      reporter: reporterUid,
      target: entry.uid,
      targetName: entry.name.slice(0, 40),
      board,
      score: Math.round(entry.score),
      reason,
      note: note.replace(/\s+/g, ' ').trim().slice(0, 200),
      at: serverTimestamp(),
      status: 'open',
    });
    return 'sent';
  } catch (err) {
    if (isDenied(err)) return 'duplicate';
    throw err;
  }
}

/** "Windows · Chrome · 웹 · 1280×800" so bug reports say where they happened */
function deviceSummary(): string {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad|iPod/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Mac OS X/.test(ua)
        ? 'macOS'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Linux/.test(ua)
            ? 'Linux'
            : '기타';
  const browser = /SamsungBrowser/.test(ua)
    ? 'Samsung Internet'
    : /Edg\//.test(ua)
      ? 'Edge'
      : /Firefox\/|FxiOS/.test(ua)
        ? 'Firefox'
        : /CriOS|Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : '기타';
  const mode = window.matchMedia('(display-mode: standalone)').matches ? '앱' : '웹';
  return `${os} · ${browser} · ${mode} · ${window.innerWidth}×${window.innerHeight}`.slice(0, 200);
}

/** Line breaks are fine, other control characters are dropped */
const cleanMessage = (m: string) =>
  m
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 1000);

/** One message per player every 5 minutes; a quicker second message comes back as 'too-soon' */
export async function sendFeedback(uid: string, name: string, kind: FeedbackKind, message: string): Promise<'sent' | 'too-soon'> {
  const bucket = Math.floor(Date.now() / 300_000);
  try {
    await setDoc(doc(db, 'feedback', `${uid}~${bucket}`), {
      uid,
      name: name.slice(0, 40),
      kind,
      message: cleanMessage(message),
      version: APP_VERSION,
      device: deviceSummary(),
      at: serverTimestamp(),
      status: 'new',
    });
    return 'sent';
  } catch (err) {
    if (isDenied(err)) return 'too-soon';
    throw err;
  }
}

/**
 * Count a finished round for today's stats (signed-in players only).
 * Server-side increments, so nothing has to be read first (players can't read these docs).
 */
export function recordActivity(uid: string, seconds: number): Promise<void> {
  const secs = Math.max(0, Math.min(3600, Math.round(seconds)));
  return setDoc(
    doc(db, 'activity', dayId(), 'players', uid),
    { plays: increment(1), seconds: increment(secs), at: serverTimestamp() },
    { merge: true }
  );
}
