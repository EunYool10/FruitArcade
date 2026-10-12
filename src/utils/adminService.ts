import {
  DocumentData,
  collection,
  count,
  deleteDoc,
  doc,
  getAggregateFromServer,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  sum,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firestore';
import { GAME_ORDER } from '../constants';
import type { FeedbackKind, ReportReason } from './communityService';
import { boardId, dayLabel, kstDay } from './ranking';

// Admin screen data. firestore.rules only lets accounts on config/admins read or change any of it.

const millis = (v: unknown) => (v as { toMillis?: () => number })?.toMillis?.() ?? 0;
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);

export interface DayStat {
  label: string;
  players: number;
  plays: number;
  seconds: number;
}

export interface AdminStats {
  /** Last 7 days, oldest first (signed-in players only) */
  days: DayStat[];
  openReports: number;
  newFeedback: number;
  bans: number;
  /** Entries on today's boards, all games together */
  todayEntries: number;
}

export async function loadStats(): Promise<AdminStats> {
  const today = kstDay();
  const days = await Promise.all(
    [...Array(7)].map(async (_, i) => {
      const day = today - 6 + i;
      const snap = await getAggregateFromServer(collection(db, 'activity', `d${day}`, 'players'), {
        players: count(),
        plays: sum('plays'),
        seconds: sum('seconds'),
      });
      const d = snap.data();
      return { label: dayLabel(day), players: d.players ?? 0, plays: d.plays ?? 0, seconds: d.seconds ?? 0 };
    })
  );
  const [openReports, newFeedback, bans, ...boards] = await Promise.all([
    getCountFromServer(query(collection(db, 'reports'), where('status', '==', 'open'))),
    getCountFromServer(query(collection(db, 'feedback'), where('status', '==', 'new'))),
    getCountFromServer(collection(db, 'bans')),
    ...GAME_ORDER.map((g) => getCountFromServer(collection(db, 'leaderboards', boardId(g, 'day'), 'scores'))),
  ]);
  return {
    days,
    openReports: openReports.data().count,
    newFeedback: newFeedback.data().count,
    bans: bans.data().count,
    todayEntries: boards.reduce((n, b) => n + b.data().count, 0),
  };
}

// ───────── reports ─────────

export interface ReportItem {
  id: string;
  reporter: string;
  target: string;
  targetName: string;
  board: string;
  score: number;
  reason: ReportReason;
  note: string;
  at: number;
  status: 'open' | 'done';
}

const toReport = (id: string, d: DocumentData): ReportItem => ({
  id,
  reporter: str(d.reporter),
  target: str(d.target),
  targetName: str(d.targetName, '???'),
  board: str(d.board),
  score: typeof d.score === 'number' ? d.score : 0,
  reason: (['name', 'score', 'other'].includes(d.reason) ? d.reason : 'other') as ReportReason,
  note: str(d.note),
  at: millis(d.at),
  status: d.status === 'done' ? 'done' : 'open',
});

/** Open reports (or the latest 100 of any status), newest first */
export async function listReports(includeDone: boolean): Promise<ReportItem[]> {
  const q = includeDone
    ? query(collection(db, 'reports'), orderBy('at', 'desc'), limit(100))
    : query(collection(db, 'reports'), where('status', '==', 'open'), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toReport(d.id, d.data())).sort((a, b) => b.at - a.at);
}

export function setReportStatus(id: string, status: 'open' | 'done'): Promise<void> {
  return updateDoc(doc(db, 'reports', id), { status });
}

/** Mark every open report about one player as handled */
export async function closeReportsAbout(target: string): Promise<void> {
  const snap = await getDocs(query(collection(db, 'reports'), where('target', '==', target), where('status', '==', 'open')));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { status: 'done' }));
  await batch.commit();
}

/** Remove one entry from any board (including past days and weeks) */
export function deleteBoardEntry(board: string, uid: string): Promise<void> {
  return deleteDoc(doc(db, 'leaderboards', board, 'scores', uid));
}

// ───────── feedback ─────────

export interface FeedbackItem {
  id: string;
  uid: string;
  name: string;
  kind: FeedbackKind;
  message: string;
  version: string;
  device: string;
  at: number;
  status: 'new' | 'done';
}

export async function listFeedback(): Promise<FeedbackItem[]> {
  const snap = await getDocs(query(collection(db, 'feedback'), orderBy('at', 'desc'), limit(100)));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      uid: str(x.uid),
      name: str(x.name, '???'),
      kind: (['bug', 'idea', 'other'].includes(x.kind) ? x.kind : 'other') as FeedbackKind,
      message: str(x.message),
      version: str(x.version),
      device: str(x.device),
      at: millis(x.at),
      status: x.status === 'done' ? 'done' : 'new',
    };
  });
}

export function setFeedbackStatus(id: string, status: 'new' | 'done'): Promise<void> {
  return updateDoc(doc(db, 'feedback', id), { status });
}

export function deleteFeedback(id: string): Promise<void> {
  return deleteDoc(doc(db, 'feedback', id));
}
