import {
  DocumentData,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firestore';
import { GameType } from '../types';
import { GAME_ORDER } from '../constants';
import { cleanPhoto, kstDay } from './ranking';
import { COIN_MAX, GIFT_LIMITS } from './coins';
import { maskBadWords } from './badWords';

// Friends and coin gifts (signed-in players only).
//   players/{uid}       public card: name, avatar, title, frame, level, achievements, best scores, friend code
//   friendCodes/{code}  code → uid, claimed once
//   friendships/{a_b}   one doc per pair (uids sorted): pending until the other side accepts
//   gifts/{from_day_n}  coins sent to a friend; at most a few a day, the receiver claims them
// firestore.rules check all of it, including that a player's coins really go down when they send.

export interface PublicPlayer {
  uid: string;
  code: string;
  name: string;
  avatar: string;
  title?: string;
  frame?: string;
  /** Google profile photo (players who kept the default avatar) */
  photo?: string;
  /** 운영진: blue check after the name (only admins can write it) */
  verified?: boolean;
  level: number;
  achievements: number;
  best: Partial<Record<GameType, number>>;
}

/** What the app keeps current on the player's card */
export type PlayerCard = Omit<PublicPlayer, 'uid' | 'code'>;

export interface FriendLink {
  pair: string;
  otherUid: string;
  other: PublicPlayer | null;
  status: 'pending' | 'accepted';
  /** I sent the request */
  fromMe: boolean;
  /** Friends only: when they last had the app open (ms), null when hidden or never */
  lastSeen?: number | null;
}

export interface Gift {
  id: string;
  from: string;
  to: string;
  amount: number;
  at: number;
  claimed: boolean;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
export const showCode = (code: string) => (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code);

const playerRef = (uid: string) => doc(db, 'players', uid);
const codeRef = (code: string) => doc(db, 'friendCodes', code);
export const pairId = (a: string, b: string) => (a < b ? `${a}_${b}` : `${b}_${a}`);

function newCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => CODE_ALPHABET[b % 32]).join('');
}

function toPlayer(uid: string, d: DocumentData): PublicPlayer {
  const best: Partial<Record<GameType, number>> = {};
  for (const g of GAME_ORDER) if (typeof d.best?.[g] === 'number') best[g] = d.best[g];
  return {
    uid,
    code: typeof d.code === 'string' ? d.code : '',
    name: typeof d.name === 'string' ? maskBadWords(d.name) : '???',
    avatar: typeof d.avatar === 'string' ? d.avatar : '🍓',
    ...(typeof d.title === 'string' ? { title: d.title } : {}),
    ...(typeof d.frame === 'string' ? { frame: d.frame } : {}),
    ...(cleanPhoto(d.photo) ? { photo: d.photo } : {}),
    ...(d.verified === true ? { verified: true } : {}),
    level: typeof d.level === 'number' ? d.level : 1,
    achievements: typeof d.achievements === 'number' ? d.achievements : 0,
    best,
  };
}

const sameCard = (a: PlayerCard, b: PlayerCard) =>
  a.name === b.name &&
  a.avatar === b.avatar &&
  (a.title ?? '') === (b.title ?? '') &&
  (a.frame ?? '') === (b.frame ?? '') &&
  (cleanPhoto(a.photo) ?? '') === (cleanPhoto(b.photo) ?? '') &&
  !!a.verified === !!b.verified &&
  a.level === b.level &&
  a.achievements === b.achievements &&
  GAME_ORDER.every((g) => (a.best[g] ?? 0) === (b.best[g] ?? 0));

/** Same caps as the rules (and the leaderboards): a card over them would be refused */
const BEST_CAP: Record<GameType, number> = { memory: 2000, suika: 500000, dash: 100000, puzzle: 100000, slice: 100000, piano: 100000, jump: 100000 };
/** Same as isValidPlayerCard in firestore.rules */
/** Players stop at Lv.100; admins show Lv.999 (firestore.rules: same) */
const LEVEL_CAP = 999;
const ACHIEVEMENT_CAP = 60;

const cardFields = (card: PlayerCard) => ({
  name: card.name,
  avatar: card.avatar,
  level: Math.max(1, Math.min(LEVEL_CAP, Math.round(card.level))),
  achievements: Math.max(0, Math.min(ACHIEVEMENT_CAP, Math.round(card.achievements))),
  best: Object.fromEntries(GAME_ORDER.map((g) => [g, Math.max(0, Math.min(BEST_CAP[g], Math.round(card.best[g] ?? 0)))])),
});

/**
 * My all-time leaderboard scores. Those went through the score server, so the bests on my public
 * card may not go above them (firestore.rules checks the same); games without one show 0.
 */
async function boardBests(uid: string): Promise<Partial<Record<GameType, number>>> {
  const snaps = await Promise.all(GAME_ORDER.map((g) => getDoc(doc(db, 'leaderboards', `${g}_all`, 'scores', uid)).catch(() => null)));
  const out: Partial<Record<GameType, number>> = {};
  GAME_ORDER.forEach((g, i) => {
    const score = snaps[i]?.exists() ? snaps[i]!.data().score : 0;
    out[g] = typeof score === 'number' && score > 0 ? score : 0;
  });
  return out;
}

/** Make sure the player has a public card (claiming a friend code the first time); returns the code */
export async function ensurePlayer(uid: string, card: PlayerCard): Promise<string> {
  const onBoards = await boardBests(uid);
  card = { ...card, best: Object.fromEntries(GAME_ORDER.map((g) => [g, Math.min(card.best[g] ?? 0, onBoards[g] ?? 0)])) };
  const snap = await getDoc(playerRef(uid));
  if (snap.exists()) {
    const current = toPlayer(uid, snap.data());
    if (!sameCard(current, { ...card, ...cardFields(card) })) {
      await updateDoc(playerRef(uid), {
        ...cardFields(card),
        title: card.title ? card.title : deleteField(),
        frame: card.frame ? card.frame : deleteField(),
        photo: cleanPhoto(card.photo) ?? deleteField(),
        verified: card.verified ? true : deleteField(),
        at: serverTimestamp(),
      });
    }
    return current.code;
  }
  // A code that someone else already has makes the batch fail: try another one
  for (let attempt = 1; ; attempt++) {
    const code = newCode();
    const batch = writeBatch(db);
    batch.set(codeRef(code), { uid });
    batch.set(playerRef(uid), {
      uid,
      code,
      ...cardFields(card),
      ...(card.title ? { title: card.title } : {}),
      ...(card.frame ? { frame: card.frame } : {}),
      ...(cleanPhoto(card.photo) ? { photo: card.photo } : {}),
      ...(card.verified ? { verified: true } : {}),
      at: serverTimestamp(),
    });
    try {
      await batch.commit();
      return code;
    } catch (err) {
      if (attempt >= 4) throw err;
    }
  }
}

export async function getPlayer(uid: string): Promise<PublicPlayer | null> {
  const snap = await getDoc(playerRef(uid));
  return snap.exists() ? toPlayer(uid, snap.data()) : null;
}

export async function findByCode(code: string): Promise<PublicPlayer | null> {
  const snap = await getDoc(codeRef(cleanCode(code)));
  return snap.exists() ? getPlayer(String(snap.data().uid)) : null;
}

/** Friends, requests to me and my requests, with the other player's card */
export async function loadFriends(uid: string): Promise<FriendLink[]> {
  const snap = await getDocs(query(collection(db, 'friendships'), where('users', 'array-contains', uid)));
  const links = snap.docs.map((d) => {
    const data = d.data();
    const users: string[] = Array.isArray(data.users) ? data.users : [];
    return {
      pair: d.id,
      otherUid: users.find((u) => u !== uid) ?? '',
      status: data.status === 'accepted' ? ('accepted' as const) : ('pending' as const),
      fromMe: data.from === uid,
    };
  });
  const [others, seen] = await Promise.all([
    Promise.all(links.map((l) => getPlayer(l.otherUid).catch(() => null))),
    Promise.all(links.map((l) => (l.status === 'accepted' ? lastSeen(l.otherUid).catch(() => null) : Promise.resolve(null)))),
  ]);
  return links.map((l, i) => ({ ...l, other: others[i], ...(l.status === 'accepted' ? { lastSeen: seen[i] } : {}) }));
}

// ───────── presence ─────────
// presence/{uid} = { at }: when the player last had the app open. The player, their friends and
// admins can read it. The app writes it about once a minute while it is in front (utils/presence.ts
// turns it into online / last seen).

export const touchPresence = (uid: string) => setDoc(doc(db, 'presence', uid), { at: serverTimestamp() });

/** Stop showing when I was last here (the setting is off) */
export const clearPresence = (uid: string) => deleteDoc(doc(db, 'presence', uid));

/** When a friend (or I) last had the app open, null when they hide it or never came */
export async function lastSeen(uid: string): Promise<number | null> {
  const snap = await getDoc(doc(db, 'presence', uid));
  const at = snap.exists() ? snap.data().at : null;
  return at && typeof at.toMillis === 'function' ? at.toMillis() : null;
}

/** sent: a new request; accepted: they had asked me already; exists: already friends or asked */
export async function requestFriend(uid: string, otherUid: string): Promise<'sent' | 'accepted' | 'exists'> {
  const ref = doc(db, 'friendships', pairId(uid, otherUid));
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const d = snap.data();
    if (d.status === 'pending' && d.from === otherUid) {
      await acceptFriend(snap.id);
      return 'accepted';
    }
    return 'exists';
  }
  await setDoc(ref, { users: [uid, otherUid].sort(), from: uid, status: 'pending', at: serverTimestamp() });
  return 'sent';
}

/** none, sent (I asked), received (they asked me), friends */
export async function friendStatus(uid: string, otherUid: string): Promise<'none' | 'sent' | 'received' | 'friends'> {
  const snap = await getDoc(doc(db, 'friendships', pairId(uid, otherUid)));
  if (!snap.exists()) return 'none';
  const d = snap.data();
  if (d.status === 'accepted') return 'friends';
  return d.from === uid ? 'sent' : 'received';
}

export const acceptFriend = (pair: string) => updateDoc(doc(db, 'friendships', pair), { status: 'accepted', at: serverTimestamp() });

/** Decline, cancel or unfriend */
export const removeFriend = (pair: string) => deleteDoc(doc(db, 'friendships', pair));

const toGift = (id: string, d: DocumentData): Gift => ({
  id,
  from: String(d.from),
  to: String(d.to),
  amount: Number(d.amount) || 0,
  at: d.at?.toMillis?.() ?? 0,
  claimed: !!d.claimed,
});

/** Unclaimed gifts to me, recent gifts both ways, and how many I sent today */
export async function loadGifts(uid: string) {
  const gifts = collection(db, 'gifts');
  const [inbox, received, sent, today] = await Promise.all([
    getDocs(query(gifts, where('to', '==', uid), where('claimed', '==', false), limit(50))),
    getDocs(query(gifts, where('to', '==', uid), orderBy('at', 'desc'), limit(20))),
    getDocs(query(gifts, where('from', '==', uid), orderBy('at', 'desc'), limit(20))),
    getDocs(query(gifts, where('from', '==', uid), where('day', '==', kstDay()))),
  ]);
  return {
    inbox: inbox.docs.map((d) => toGift(d.id, d.data())).sort((a, b) => b.at - a.at),
    received: received.docs.map((d) => toGift(d.id, d.data())),
    sent: sent.docs.map((d) => toGift(d.id, d.data())),
    sentToday: today.size,
  };
}

/** Requests waiting for me plus unclaimed gifts (the badge on the friends button) */
export async function pendingCount(uid: string): Promise<number> {
  const [links, inbox] = await Promise.all([
    getDocs(query(collection(db, 'friendships'), where('users', 'array-contains', uid))),
    getDocs(query(collection(db, 'gifts'), where('to', '==', uid), where('claimed', '==', false), limit(50))),
  ]);
  return links.docs.filter((d) => d.data().status === 'pending' && d.data().from !== uid).length + inbox.size;
}

/**
 * Send coins to a friend. The gift and the sender's spent coins go in one transaction
 * (admins don't pay). Throws 'limit' after today's gifts, 'coins' when the balance is short.
 */
export async function sendCoins(uid: string, to: string, amount: number, isAdmin: boolean): Promise<void> {
  const day = kstDay();
  const mine = await getDocs(query(collection(db, 'gifts'), where('from', '==', uid), where('day', '==', day)));
  const used = new Set(mine.docs.map((d) => d.id));
  const cap = (isAdmin ? GIFT_LIMITS.admin : GIFT_LIMITS.player).perDay;
  let n = 1;
  while (used.has(`${uid}_${day}_${n}`)) n++;
  if (n > cap) throw new Error('limit');
  const giftRef = doc(db, 'gifts', `${uid}_${day}_${n}`);
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (tx) => {
    const user = await tx.get(userRef);
    if (!isAdmin) {
      const st = user.data()?.statistics ?? {};
      const earned = Number(st.coinsEarned) || 0;
      const spent = Number(st.coinsSpent) || 0;
      if (earned - spent < amount) throw new Error('coins');
      tx.update(userRef, { 'statistics.coinsSpent': spent + amount });
    }
    tx.set(giftRef, { from: uid, to, amount, day, at: serverTimestamp(), claimed: false });
  });
}

/**
 * Claim a gift: it is marked claimed and the coins are added in one transaction.
 * Coins past COIN_MAX are left out. Returns the coins added.
 */
export async function claimGift(uid: string, giftId: string): Promise<number> {
  const giftRef = doc(db, 'gifts', giftId);
  const userRef = doc(db, 'users', uid);
  return runTransaction(db, async (tx) => {
    const [gift, user] = [await tx.get(giftRef), await tx.get(userRef)];
    const g = gift.data();
    if (!g || g.to !== uid || g.claimed) return 0;
    const st = user.data()?.statistics ?? {};
    const earned = Number(st.coinsEarned) || 0;
    const room = Math.max(0, COIN_MAX - (earned - (Number(st.coinsSpent) || 0)));
    const added = Math.min(Number(g.amount) || 0, room);
    tx.update(giftRef, { claimed: true });
    if (added > 0) tx.update(userRef, { 'statistics.coinsEarned': earned + added });
    return added;
  });
}
