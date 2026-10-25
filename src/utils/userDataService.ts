import { User } from 'firebase/auth';
import { DocumentData, doc, getDoc, runTransaction, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firestore';
import { GameResult, GameSettings, UnlockedAchievements, UserStatistics } from '../types';
import { EMPTY_STATS, applyResult, mergeStats, sameStats } from './progress';
import { PlayerProfile } from './profile';
import { googlePhotoOf } from './ranking';

/** Raw cloud values; the app merges them with what this device already has. */
export interface CloudData {
  statistics: Partial<UserStatistics>;
  achievements: UnlockedAchievements;
  settings: Partial<GameSettings>;
  /** Nickname / fruit avatar chosen in the app (empty strings when never set) */
  custom: PlayerProfile;
  /** When an admin last changed the look ('' = never) */
  modAt: string;
  /** Shop items bought (item id → purchase date) */
  inventory: Record<string, string>;
  /** Puzzle stage → best stars */
  stages: Record<string, number>;
}

const userRef = (uid: string) => doc(db, 'users', uid);

const customOf = (p: DocumentData | undefined): PlayerProfile => ({
  nickname: p?.nickname || '',
  avatar: p?.avatar || '',
  title: p?.title || '',
  frame: p?.frame || '',
});

/** Load the user's document, creating it on first login. */
export async function loadUserData(user: User): Promise<CloudData> {
  const ref = userRef(user.uid);
  const snap = await getDoc(ref);
  const now = new Date().toISOString();
  const displayName = user.displayName || '게이머';

  if (snap.exists()) {
    const data = snap.data();
    // Awaited so it can't collide with the stats transaction that runs right after
    await updateDoc(ref, {
      'profile.lastLoginAt': now,
      'profile.displayName': displayName,
      'profile.photoURL': googlePhotoOf(user),
    }).catch(() => {});
    return {
      statistics: data.statistics || {},
      achievements: data.achievements || {},
      settings: data.settings || {},
      custom: customOf(data.profile),
      modAt: typeof data.profile?.modAt === 'string' ? data.profile.modAt : '',
      inventory: data.inventory && typeof data.inventory === 'object' ? data.inventory : {},
      stages: data.stages && typeof data.stages === 'object' ? data.stages : {},
    };
  }

  await setDoc(ref, {
    profile: { uid: user.uid, displayName, email: user.email, photoURL: googlePhotoOf(user), createdAt: now, lastLoginAt: now },
    statistics: EMPTY_STATS,
    achievements: {},
    settings: {},
  });
  return { statistics: {}, achievements: {}, settings: {}, custom: customOf(undefined), modAt: '', inventory: {}, stages: {} };
}

/** Atomically add one finished round to the cloud stats (safe with several devices). */
export function recordCloudResult(uid: string, result: GameResult, stamp: boolean, streak: number, coins: number): Promise<UserStatistics> {
  const ref = userRef(uid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = { ...EMPTY_STATS, ...(snap.data()?.statistics || {}) };
    const next = applyResult(current, result, stamp, streak, coins);
    tx.update(ref, { statistics: next });
    return next;
  });
}

/** Push this device's stats up without ever lowering what the cloud already has. */
export function pushMergedStats(uid: string, local: UserStatistics): Promise<UserStatistics> {
  const ref = userRef(uid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const cloud = { ...EMPTY_STATS, ...(snap.data()?.statistics || {}) };
    const merged = mergeStats(cloud, local);
    if (!sameStats(merged, cloud)) tx.update(ref, { statistics: merged });
    return merged;
  });
}

export async function resetCloudStats(uid: string): Promise<void> {
  await updateDoc(userRef(uid), { statistics: EMPTY_STATS });
}

export async function saveAchievements(uid: string, achievements: UnlockedAchievements): Promise<void> {
  await updateDoc(userRef(uid), { achievements });
}

export async function saveUserSettings(uid: string, settings: GameSettings): Promise<void> {
  await updateDoc(userRef(uid), { settings });
}

export async function saveProfileCustom(uid: string, p: PlayerProfile): Promise<void> {
  await updateDoc(userRef(uid), { 'profile.nickname': p.nickname, 'profile.avatar': p.avatar, 'profile.title': p.title, 'profile.frame': p.frame });
}

export async function saveStages(uid: string, stages: Record<string, number>): Promise<void> {
  await updateDoc(userRef(uid), { stages });
}

/** The look as it is in the cloud, to catch an admin's change while the app stays open */
export async function loadCloudLook(uid: string): Promise<{ custom: PlayerProfile; modAt: string }> {
  const p = (await getDoc(userRef(uid))).data()?.profile;
  return { custom: customOf(p), modAt: typeof p?.modAt === 'string' ? p.modAt : '' };
}

/** Items an admin gave this player (ownerGifts/{uid}); [] when none */
export async function loadOwnerGifts(uid: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'ownerGifts', uid));
  const items = snap.exists() ? snap.data().items : [];
  return Array.isArray(items) ? items.filter((id): id is string => typeof id === 'string') : [];
}

export async function saveInventory(uid: string, inventory: Record<string, string>): Promise<void> {
  await updateDoc(userRef(uid), { inventory });
}
