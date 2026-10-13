import {
  DocumentData,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firestore';
import { GameType } from '../types';
import { GAME_ORDER } from '../constants';
import { RANK_PERIODS, RankEntry, RankPeriod, boardId } from './ranking';

// Public boards: leaderboards/{game}_{period}/scores/{uid}, one best score per player

const scores = (board: string) => collection(db, 'leaderboards', board, 'scores');

const TITLE_ID = /^[a-z0-9_]{1,32}$/;

const toEntry = (uid: string, d: DocumentData): RankEntry => ({
  uid,
  name: typeof d.name === 'string' ? d.name : '???',
  avatar: typeof d.avatar === 'string' ? d.avatar : '🍓',
  score: typeof d.score === 'number' ? d.score : 0,
  ...(typeof d.title === 'string' && TITLE_ID.test(d.title) ? { title: d.title } : {}),
  ...(typeof d.frame === 'string' && TITLE_ID.test(d.frame) ? { frame: d.frame } : {}),
});

/**
 * Post a round to today's, this week's and the all-time board. Each board keeps only
 * the player's best, so lower scores are skipped. Returns the best on each board.
 * `proof` is the score server's signature for this round (required once the rules enforce it).
 */
export function submitScore(
  uid: string,
  game: GameType,
  who: { name: string; avatar: string; title?: string; frame?: string },
  score: number,
  proof?: string
): Promise<Record<RankPeriod, number>> {
  const now = Date.now();
  const refs = RANK_PERIODS.map((p) => doc(scores(boardId(game, p, now)), uid));
  return runTransaction(db, async (tx) => {
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const best = {} as Record<RankPeriod, number>;
    snaps.forEach((snap, i) => {
      const prev = snap.exists() ? Number(snap.data().score) || 0 : -1;
      const title = who.title && TITLE_ID.test(who.title) ? { title: who.title } : {};
      const frame = who.frame && TITLE_ID.test(who.frame) ? { frame: who.frame } : {};
      const signed = proof ? { proof } : {};
      if (score > prev) tx.set(refs[i], { uid, name: who.name, avatar: who.avatar, score, at: serverTimestamp(), ...title, ...frame, ...signed });
      best[RANK_PERIODS[i]] = Math.max(prev, score);
    });
    return best;
  });
}

export interface Look {
  name: string;
  avatar: string;
  title?: string;
  frame?: string;
}

/**
 * Put a new nickname / avatar / title / frame on the player's current entries
 * (today, this week, all time for every game). Scores stay as they are.
 */
export async function syncLook(uid: string, look: Look): Promise<number> {
  const now = Date.now();
  const refs = GAME_ORDER.flatMap((g) => RANK_PERIODS.map((p) => doc(scores(boardId(g, p, now)), uid)));
  const snaps = await Promise.all(refs.map((r) => getDoc(r)));
  const title = look.title && TITLE_ID.test(look.title) ? look.title : '';
  const frame = look.frame && TITLE_ID.test(look.frame) ? look.frame : '';
  const writes = snaps.flatMap((snap, i) => {
    if (!snap.exists()) return [];
    const d = snap.data();
    if (d.name === look.name && d.avatar === look.avatar && (d.title ?? '') === title && (d.frame ?? '') === frame) return [];
    return [
      updateDoc(refs[i], {
        name: look.name,
        avatar: look.avatar,
        title: title || deleteField(),
        frame: frame || deleteField(),
        at: serverTimestamp(),
      }),
    ];
  });
  const done = await Promise.allSettled(writes);
  return done.filter((r) => r.status === 'fulfilled').length;
}

/** 1-based place of `score` on a board; ties share a place */
export async function rankOf(game: GameType, period: RankPeriod, score: number): Promise<number> {
  const snap = await getCountFromServer(query(scores(boardId(game, period)), where('score', '>', score)));
  return snap.data().count + 1;
}

export async function topScores(game: GameType, period: RankPeriod, n = 50): Promise<RankEntry[]> {
  const snap = await getDocs(query(scores(boardId(game, period)), orderBy('score', 'desc'), limit(n)));
  return snap.docs.map((d) => toEntry(d.id, d.data()));
}

/** Top entry of one board, or null when nobody played */
async function topOne(board: string): Promise<RankEntry | null> {
  const snap = await getDocs(query(collection(db, 'leaderboards', board, 'scores'), orderBy('score', 'desc'), limit(1)));
  return snap.empty ? null : toEntry(snap.docs[0].id, snap.docs[0].data());
}

/** Each game's #1 for a finished week */
export async function championsOfWeek(week: number): Promise<Partial<Record<GameType, RankEntry>>> {
  const tops = await Promise.all(GAME_ORDER.map((g) => topOne(`${g}_w${week}`)));
  const out: Partial<Record<GameType, RankEntry>> = {};
  GAME_ORDER.forEach((g, i) => {
    const e = tops[i];
    if (e) out[g] = e;
  });
  return out;
}

/** One game's weekly winners, newest week first */
export async function hallOfFame(game: GameType, weeks: number[]): Promise<{ week: number; entry: RankEntry | null }[]> {
  const tops = await Promise.all(weeks.map((w) => topOne(`${game}_w${w}`)));
  return weeks.map((week, i) => ({ week, entry: tops[i] }));
}

export async function myEntry(game: GameType, period: RankPeriod, uid: string): Promise<RankEntry | null> {
  const snap = await getDoc(doc(scores(boardId(game, period)), uid));
  return snap.exists() ? toEntry(uid, snap.data()) : null;
}

// ───────── admin (firestore.rules only lets accounts on config/admins do these) ─────────

/** True when the signed-in Google account is on the admin list (only admins can read it) */
export async function checkAdmin(): Promise<boolean> {
  try {
    return (await getDoc(doc(db, 'config', 'admins'))).exists();
  } catch {
    return false;
  }
}

/** Admin: remove one entry from a board */
export function deleteEntry(game: GameType, period: RankPeriod, uid: string): Promise<void> {
  return deleteDoc(doc(scores(boardId(game, period)), uid));
}

/** Admin: block a player from the leaderboards and clear their entries on every current board */
export async function banPlayer(adminUid: string, uid: string, name: string): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, 'bans', uid), { by: adminUid, name: name.slice(0, 40) || '???', at: serverTimestamp() });
  const now = Date.now();
  for (const g of GAME_ORDER) for (const p of RANK_PERIODS) batch.delete(doc(scores(boardId(g, p, now)), uid));
  await batch.commit();
}

export interface BanEntry {
  uid: string;
  name: string;
  at: number;
}

export async function listBans(): Promise<BanEntry[]> {
  const snap = await getDocs(query(collection(db, 'bans'), orderBy('at', 'desc'), limit(50)));
  return snap.docs.map((d) => {
    const data = d.data();
    return { uid: d.id, name: typeof data.name === 'string' ? data.name : '???', at: data.at?.toMillis?.() ?? 0 };
  });
}

export function unban(uid: string): Promise<void> {
  return deleteDoc(doc(db, 'bans', uid));
}
