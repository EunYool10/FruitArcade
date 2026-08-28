import { User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserGameData, UserStatistics, GameSettings, UnlockedAchievements } from '../types';

export const DEFAULT_SETTINGS: GameSettings = {
  sfxEnabled: true,
  volume: 70,
  animEnabled: true,
  comboEffect: true,
  particleEffect: true,
  shakeEffect: true,
  celebrateEffect: true,
  highContrast: false,
  cardScale: 100,
};

export const DEFAULT_STATISTICS: UserStatistics = {
  totalPlayCount: 0,
  totalPlayTime: 0,
  memoryPlayCount: 0,
  suikaPlayCount: 0,
  stockPlayCount: 0,
  dashPlayCount: 0,
  memoryHighScore: 0,
  suikaHighScore: 0,
  stockHighScore: 0,
  dashHighScore: 0,
  lastPlayedAt: new Date().toISOString(),
};

/**
 * Load or initialize user game data from Firestore
 */
export async function loadUserData(user: User): Promise<UserGameData> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data() as Partial<UserGameData>;
    const profile = {
      uid: user.uid,
      displayName: user.displayName || '게이머',
      email: user.email,
      photoURL: user.photoURL,
      createdAt: data.profile?.createdAt || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    const statistics: UserStatistics = {
      ...DEFAULT_STATISTICS,
      ...(data.statistics || {}),
    };

    const achievements: UnlockedAchievements = data.achievements || {};
    const settings: GameSettings = {
      ...DEFAULT_SETTINGS,
      ...(data.settings || {}),
    };

    // Update lastLoginAt
    await updateDoc(userRef, {
      'profile.lastLoginAt': profile.lastLoginAt,
      'profile.displayName': profile.displayName,
      'profile.photoURL': profile.photoURL,
    }).catch(() => {});

    return { profile, statistics, achievements, settings };
  } else {
    // Initialize new user document
    const now = new Date().toISOString();
    const newUserData: UserGameData = {
      profile: {
        uid: user.uid,
        displayName: user.displayName || '게이머',
        email: user.email,
        photoURL: user.photoURL,
        createdAt: now,
        lastLoginAt: now,
      },
      statistics: DEFAULT_STATISTICS,
      achievements: {},
      settings: DEFAULT_SETTINGS,
    };

    await setDoc(userRef, newUserData);
    return newUserData;
  }
}

/**
 * Save user game progress & stats safely with high-score check
 */
export async function saveGameResult(
  uid: string,
  gameType: 'memory' | 'suika' | 'stock' | 'dash',
  score: number,
  playTimeSeconds: number,
  currentStats: UserStatistics
): Promise<UserStatistics> {
  const userRef = doc(db, 'users', uid);

  const updatedStats: UserStatistics = {
    ...currentStats,
    totalPlayCount: currentStats.totalPlayCount + 1,
    totalPlayTime: currentStats.totalPlayTime + Math.max(0, Math.round(playTimeSeconds)),
    lastPlayedAt: new Date().toISOString(),
  };

  if (gameType === 'memory') {
    updatedStats.memoryPlayCount += 1;
    if (score > updatedStats.memoryHighScore) {
      updatedStats.memoryHighScore = score;
    }
  } else if (gameType === 'suika') {
    updatedStats.suikaPlayCount += 1;
    if (score > updatedStats.suikaHighScore) {
      updatedStats.suikaHighScore = score;
    }
  } else if (gameType === 'stock') {
    updatedStats.stockPlayCount += 1;
    if (score > updatedStats.stockHighScore) {
      updatedStats.stockHighScore = score;
    }
  } else if (gameType === 'dash') {
    updatedStats.dashPlayCount += 1;
    if (score > updatedStats.dashHighScore) {
      updatedStats.dashHighScore = score;
    }
  }

  await updateDoc(userRef, {
    statistics: updatedStats,
  });

  return updatedStats;
}

/**
 * Sync unlocked achievements to Firestore
 */
export async function saveAchievements(uid: string, achievements: UnlockedAchievements): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    achievements,
  });
}

/**
 * Sync game settings to Firestore
 */
export async function saveUserSettings(uid: string, settings: GameSettings): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    settings,
  });
}
