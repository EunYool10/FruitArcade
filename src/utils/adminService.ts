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
import { RANK_PERIODS, boardId, cleanPhoto, dayLabel, kstDay } from './ranking';
import { maskBadWords } from './badWords';
import type { GameType } from '../types';

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
  /** Players on each game's board today */
  todayByGame: Record<GameType, number>;
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
    todayByGame: Object.fromEntries(GAME_ORDER.map((g, i) => [g, boards[i].data().count])) as Record<GameType, number>,
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

// ───────── users ─────────

/** One player for the admin user list: the public card, plus last seen, ban and today's play */
export interface UserRow {
  uid: string;
  code: string;
  /** As others see it (bad words masked) */
  name: string;
  /** As the player typed it, for judging the name */
  rawName: string;
  /** 운영진 (blue check) */
  verified: boolean;
  avatar: string;
  photo?: string;
  title?: string;
  frame?: string;
  level: number;
  achievements: number;
  best: Partial<Record<GameType, number>>;
  /** When the card last changed (sign-in or a new best) */
  cardAt: number;
  /** presence/{uid}: null when hidden or never written */
  lastSeen: number | null;
  bannedAt: number | null;
  todayPlays: number;
  todaySeconds: number;
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Everyone with a public card (made the first time a player signs in), newest card first */
export async function listUsers(): Promise<UserRow[]> {
  const [players, presence, bans, activity] = await Promise.all([
    getDocs(query(collection(db, 'players'), orderBy('at', 'desc'), limit(1000))),
    getDocs(query(collection(db, 'presence'), limit(2000))),
    getDocs(query(collection(db, 'bans'), limit(1000))),
    getDocs(collection(db, 'activity', `d${kstDay()}`, 'players')),
  ]);
  const seen = new Map(presence.docs.map((d) => [d.id, millis(d.data().at) || null]));
  const banned = new Map(bans.docs.map((d) => [d.id, millis(d.data().at) || Date.now()]));
  const today = new Map(activity.docs.map((d) => [d.id, d.data()]));
  return players.docs.map((d) => {
    const x = d.data();
    const best: Partial<Record<GameType, number>> = {};
    for (const g of GAME_ORDER) if (typeof x.best?.[g] === 'number') best[g] = x.best[g];
    const raw = str(x.name, '???');
    const play = today.get(d.id);
    return {
      uid: d.id,
      code: str(x.code),
      name: maskBadWords(raw),
      rawName: raw,
      verified: x.verified === true,
      avatar: str(x.avatar, '🍓'),
      ...(cleanPhoto(x.photo) ? { photo: x.photo as string } : {}),
      ...(typeof x.title === 'string' ? { title: x.title } : {}),
      ...(typeof x.frame === 'string' ? { frame: x.frame } : {}),
      level: num(x.level) || 1,
      achievements: num(x.achievements),
      best,
      cardAt: millis(x.at),
      lastSeen: seen.get(d.id) ?? null,
      bannedAt: banned.get(d.id) ?? null,
      todayPlays: num(play?.plays),
      todaySeconds: num(play?.seconds),
    };
  });
}

/** Take a player off today's, this week's and the all-time boards of every game */
export async function clearBoardsOf(uid: string): Promise<void> {
  const batch = writeBatch(db);
  const now = Date.now();
  for (const g of GAME_ORDER) for (const p of RANK_PERIODS) batch.delete(doc(db, 'leaderboards', boardId(g, p, now), 'scores', uid));
  await batch.commit();
}
