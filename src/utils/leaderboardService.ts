import {
  DocumentData,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firestore';
import { GameType } from '../types';
import { GAME_ORDER } from '../constants';
import { RANK_PERIODS, RankEntry, RankPeriod, boardId } from './ranking';

// Public boards: leaderboards/{game}_{period}/scores/{uid}, one best score per player

const scores = (board: string) => collection(db, 'leaderboards', board, 'scores');

const toEntry = (uid: string, d: DocumentData): RankEntry => ({
  uid,
  name: typeof d.name === 'string' ? d.name : '???',
  avatar: typeof d.avatar === 'string' ? d.avatar : '🍓',
  score: typeof d.score === 'number' ? d.score : 0,
});

/**
 * Post a round to today's, this week's and the all-time board. Each board keeps only
 * the player's best, so lower scores are skipped. Returns the best on each board.
 */
export function submitScore(
  uid: string,
  game: GameType,
  who: { name: string; avatar: string },
  score: number
): Promise<Record<RankPeriod, number>> {
  const now = Date.now();
  const refs = RANK_PERIODS.map((p) => doc(scores(boardId(game, p, now)), uid));
  return runTransaction(db, async (tx) => {
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const best = {} as Record<RankPeriod, number>;
    snaps.forEach((snap, i) => {
      const prev = snap.exists() ? Number(snap.data().score) || 0 : -1;
      if (score > prev) tx.set(refs[i], { uid, name: who.name, avatar: who.avatar, score, at: serverTimestamp() });
      best[RANK_PERIODS[i]] = Math.max(prev, score);
    });
    return best;
  });
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
