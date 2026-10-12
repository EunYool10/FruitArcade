import { User } from 'firebase/auth';
import { doc, getDoc, runTransaction, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firestore';
import { GameResult, GameSettings, UnlockedAchievements, UserStatistics } from '../types';
import { EMPTY_STATS, applyResult, mergeStats, sameStats } from './progress';
import { PlayerProfile } from './profile';

/** Raw cloud values; the app merges them with what this device already has. */
export interface CloudData {
  statistics: Partial<UserStatistics>;
  achievements: UnlockedAchievements;
  settings: Partial<GameSettings>;
  /** Nickname / fruit avatar chosen in the app (empty strings when never set) */
  custom: PlayerProfile;
  /** Shop items bought (item id → purchase date) */
  inventory: Record<string, string>;
}

const userRef = (uid: string) => doc(db, 'users', uid);

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
      'profile.photoURL': user.photoURL,
    }).catch(() => {});
    return {
      statistics: data.statistics || {},
      achievements: data.achievements || {},
      settings: data.settings || {},
      custom: { nickname: data.profile?.nickname || '', avatar: data.profile?.avatar || '', title: data.profile?.title || '', frame: data.profile?.frame || '' },
      inventory: data.inventory && typeof data.inventory === 'object' ? data.inventory : {},
    };
  }

  await setDoc(ref, {
    profile: { uid: user.uid, displayName, email: user.email, photoURL: user.photoURL, createdAt: now, lastLoginAt: now },
    statistics: EMPTY_STATS,
    achievements: {},
    settings: {},
  });
  return { statistics: {}, achievements: {}, settings: {}, custom: { nickname: '', avatar: '', title: '', frame: '' }, inventory: {} };
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

export async function saveInventory(uid: string, inventory: Record<string, string>): Promise<void> {
  await updateDoc(userRef(uid), { inventory });
}
