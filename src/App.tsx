import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { User } from 'firebase/auth';
import {
  Achievement,
  GameResult,
  GameReward,
  GameSettings,
  GameType,
  HistoryEntry,
  MemoryConfig,
  ScreenType,
  UserStatistics,
} from './types';
import { DEFAULT_SETTINGS, GAMES, GAME_ORDER, PLAY_SCREENS, SCREEN_GAME } from './constants';
import { Navbar, NavTarget } from './components/Navbar';
import { MobileTabBar } from './components/MobileTabBar';
import { Lobby, LobbyTarget } from './components/lobby/Lobby';
import { MemorySetup } from './components/MemoryGame/MemorySetup';
import type { SendResult } from './components/Modals/FriendsModal';
import { PauseModal } from './components/Modals/PauseModal';
import { lazyModal } from './components/ui/lazyModal';
import { Toast, ToastHost } from './components/ui/Toast';
import { PlayerView } from './components/ui/Avatar';
import { PlayerContext } from './components/PlayerContext';
import { ChallengeContext } from './components/ChallengeContext';
import { ChallengeModal } from './components/Modals/ChallengeModal';
import {
  Inventory,
  ItemKind,
  SHOP_ITEMS,
  ShopItem,
  avatarItem,
  clearInventory,
  coinsFor,
  forSale,
  isOwnerGiftId,
  loadInventory,
  loadOwnerGifts,
  mergeInventory,
  saveInventory,
  saveOwnerGifts,
  usableItems,
} from './utils/shop';
import { RankContext } from './components/RankContext';
import { RankResult, cleanPhoto, googlePhotoOf, kstWeek, publicName } from './utils/ranking';
import { maskBadWords } from './utils/badWords';
import { earnedTitles, wornTitle } from './utils/titles';
import { josa } from './utils/format';
import { PRESENCE_EVERY_MS } from './utils/presence';
import { setUpdateIdle } from './utils/pwa';
import { StageProgress, clearStageProgress, loadStageProgress, mergeStageProgress, saveStageProgress } from './components/PuzzleGame/stages';
import { DayStats, clearDays, loadDays, recordDay } from './utils/dailyStats';
import { Challenge, challengeLink, takeChallengeFromUrl } from './utils/challenge';
import { randomSeed } from './utils/rng';
import { Tutorial, markSeen, tutorialSeen } from './components/game/Tutorial';
import {
  ACHIEVEMENT_DEFINITIONS,
  countUnlocked,
  getUnlockedAchievements,
  mergeAchievements,
  resetAchievements,
  unlockAchievement,
  unlockMany,
} from './utils/achievements';
import {
  EMPTY_STATS,
  XP,
  applyResult,
  bestKey,
  clearLocalProgress,
  coinBalance,
  computeXp,
  levelInfo,
  loadHistory,
  loadLocalStats,
  mergeStats,
  pushHistory,
  saveLocalStats,
  StreakState,
  bumpStreak,
  currentStreak,
  loadStreak,
} from './utils/progress';
import { AVATARS, PlayerProfile, loadProfile, loadProfileMod, saveProfile, saveProfileMod } from './utils/profile';
import { DailyState, applyDaily, loadDaily, saveDaily, todayKey } from './utils/missions';
import { playSound } from './utils/audio';
import { TrackName, music } from './utils/music';
import { askProof, dropClaim, endScoredRound, pendingClaims, proveRound, queueClaim, startScoredRound, wakeScoreServer } from './utils/scoreServer';
import { loadReminderState } from './utils/reminderState';

// Windows load their code the first time they open, not with the app
const AchievementsModal = lazyModal(() => import('./components/Modals/AchievementsModal').then((m) => m.AchievementsModal));
const PatchNotesModal = lazyModal(() => import('./components/Modals/PatchNotesModal').then((m) => m.PatchNotesModal));
const TermsModal = lazyModal(() => import('./components/Modals/TermsModal').then((m) => m.TermsModal));
const PlayerModal = lazyModal(() => import('./components/Modals/PlayerModal').then((m) => m.PlayerModal));
const SettingsModal = lazyModal(() => import('./components/Modals/SettingsModal').then((m) => m.SettingsModal));
const CreditsModal = lazyModal(() => import('./components/Modals/CreditsModal').then((m) => m.CreditsModal));
const AppsModal = lazyModal(() => import('./components/Modals/AppsModal').then((m) => m.AppsModal));
const ProfileModal = lazyModal(() => import('./components/Modals/ProfileModal').then((m) => m.ProfileModal));
const RecordsModal = lazyModal(() => import('./components/Modals/RecordsModal').then((m) => m.RecordsModal));
const LeaderboardModal = lazyModal(() => import('./components/Modals/LeaderboardModal').then((m) => m.LeaderboardModal));
const AdminModal = lazyModal(() => import('./components/Modals/AdminModal').then((m) => m.AdminModal));
const FeedbackModal = lazyModal(() => import('./components/Modals/FeedbackModal').then((m) => m.FeedbackModal));
const ShopModal = lazyModal(() => import('./components/Modals/ShopModal').then((m) => m.ShopModal));
const FriendsModal = lazyModal(() => import('./components/Modals/FriendsModal').then((m) => m.FriendsModal));

// Games are code-split so the lobby loads fast
const MemoryGameBoard = lazy(() =>
  import('./components/MemoryGame/MemoryGameBoard').then((m) => ({ default: m.MemoryGameBoard }))
);
const PuzzleGame = lazy(() => import('./components/PuzzleGame/PuzzleGame').then((m) => ({ default: m.PuzzleGame })));
const SuikaGame = lazy(() => import('./components/SuikaGame/SuikaGame').then((m) => ({ default: m.SuikaGame })));
const FruitDashGame = lazy(() =>
  import('./components/FruitDashGame/FruitDashGame').then((m) => ({ default: m.FruitDashGame }))
);
const FruitSliceGame = lazy(() =>
  import('./components/FruitSliceGame/FruitSliceGame').then((m) => ({ default: m.FruitSliceGame }))
);

// Firebase loads after the first paint; Firestore only once someone signs in
const loadAuthApi = () => import('./authApi');
type AuthApi = Awaited<ReturnType<typeof loadAuthApi>>;
const cloudApi = () => import('./utils/userDataService');
type CloudApi = Awaited<ReturnType<typeof cloudApi>>;
const rankApi = () => import('./utils/leaderboardService');
const communityApi = () => import('./utils/communityService');
const remindersApi = () => import('./utils/reminders');
const friendsApi = () => import('./utils/friendsService');

const SETTINGS_KEY = 'fruit_arcade_settings';
const MEMORY_CFG_KEY = 'fruit_arcade_memory';
const DEFAULT_MEMORY: MemoryConfig = { mode: '4', previewTime: 2000, lifeLimit: 'infinite' };

type ModalId = NavTarget | LobbyTarget | 'player';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

const prefersDark = () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

const Loading = () => (
  <div className="grid flex-1 place-items-center py-24 text-center">
    <div>
      <div className="text-5xl animate-bounce" aria-hidden="true">
        🍓
      </div>
      <p className="mt-2 font-display text-lg text-ink-2">불러오는 중...</p>
    </div>
  </div>
);

export default function App() {
  const [screen, setScreen] = useState<ScreenType>('lobby');
  const [gameKey, setGameKey] = useState(0);
  const [roundActive, setRoundActive] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [memoryCfg, setMemoryCfg] = useState<MemoryConfig>(() => readJSON(MEMORY_CFG_KEY, DEFAULT_MEMORY));

  const [user, setUser] = useState<User | null>(null);
  /** Bumped when the signed-in user's details are refreshed in place (newest Google photo) */
  const [, setUserTick] = useState(0);
  /** On the admin list (config/admins); the server rules check this again for every admin action */
  const [isAdmin, setIsAdmin] = useState(false);
  /** First on the admin list: gives the owner's gifts (프리즘 테두리) */
  const [isGameOwner, setIsGameOwner] = useState(false);
  /** owner_ items the game owner gave this player */
  const [ownerGifts, setOwnerGifts] = useState<string[]>(loadOwnerGifts);
  const userRef = useRef<User | null>(null);
  userRef.current = user;
  const screenRef = useRef(screen);
  screenRef.current = screen;
  // Friends: my friend code, the badge (requests + gifts waiting), whose card is open
  const [myCode, setMyCode] = useState('');
  const [friendBadge, setFriendBadge] = useState(0);
  const [viewUid, setViewUid] = useState<string | null>(null);
  // Streak reminders (web push) on this device
  const [remindersOn, setRemindersOn] = useState(() => loadReminderState().on);
  const [remindersBusy, setRemindersBusy] = useState(false);

  const [stats, setStats] = useState<UserStatistics>(loadLocalStats);
  const statsRef = useRef(stats);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const historyRef = useRef(history);
  const [daily, setDaily] = useState<DailyState>(loadDaily);
  const [streak, setStreak] = useState<StreakState>(loadStreak);
  const [profile, setProfile] = useState<PlayerProfile>(loadProfile);
  const [days, setDays] = useState<DayStats>(loadDays);
  const [inventory, setInventory] = useState<Inventory>(loadInventory);
  const [stageProgress, setStageProgress] = useState<StageProgress>(loadStageProgress);
  const stageProgressRef = useRef(stageProgress);
  const inventoryRef = useRef(inventory);
  const daysRef = useRef(days);

  // Friend challenges: one arriving by link, and the one being played
  const [incomingChallenge, setIncomingChallenge] = useState<Challenge | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const activeChallengeRef = useRef<Challenge | null>(null);
  activeChallengeRef.current = activeChallenge;
  /** Seed of the last round of each game, for share links */
  const roundSeeds = useRef<Partial<Record<GameType, string>>>({});
  const [, setAchieveTick] = useState(0);

  // Leaderboard: ranks after the last round, and which game the window opens on
  const [rank, setRank] = useState<RankResult | null>(null);
  const [rankGame, setRankGame] = useState<GameType>('suika');
  const rankRequest = useRef(0);

  const [modal, setModal] = useState<ModalId | null>(null);
  const [tutorialGame, setTutorialGame] = useState<GameType | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [settings, setSettings] = useState<GameSettings>(() => readJSON(SETTINGS_KEY, DEFAULT_SETTINGS));
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [systemDark, setSystemDark] = useState(prefersDark);

  const isPlayScreen = PLAY_SCREENS.includes(screen);
  const isPlaying = isPlayScreen && roundActive;
  // Games freeze while paused or while any window covers them
  const gamePaused = isPaused || modal !== null || tutorialGame !== null;

  const achievementCount = countUnlocked();
  const level = levelInfo(computeXp(stats, achievementCount));
  const streakNow = currentStreak(streak);
  // Titles: one per unlocked achievement, plus 주간 챔피언 for anyone who topped a weekly board
  const unlocked = getUnlockedAchievements();
  const wasChampion = stats.lastChampionWeek > 0;
  // QA mode (설정, admins only): the app treats the admin like any player, so they can test what
  // players get. Only the perks and admin tools switch off; the public name and the server's
  // admin rights stay as they are.
  const qaMode = isAdmin && settings.qaMode;
  const asAdmin = isAdmin && !settings.qaMode;
  // Items in use: bought ones, plus the whole 운영진 series for admins (who also have unlimited coins)
  const owned = usableItems(inventory, asAdmin, ownerGifts, isGameOwner && asAdmin);
  const coins = asAdmin ? Infinity : coinBalance(stats);
  const titles = earnedTitles(unlocked, wasChampion, owned);
  const title = wornTitle(profile.title, unlocked, wasChampion, owned);
  // A bought avatar shows while it's owned; the free fruit always do
  const avatar = !profile.avatar || AVATARS.includes(profile.avatar) || owned[avatarItem(profile.avatar)?.id ?? ''] ? profile.avatar : '';
  const player: PlayerView = {
    name: maskBadWords(profile.nickname) || user?.displayName || '게스트',
    emoji: avatar || level.emoji,
    photo: avatar ? null : googlePhotoOf(user),
    isGuest: !user,
    title,
    frame: owned[profile.frame] ? profile.frame : '',
    // Shared links and images carry the same public name as the boards, not the Google name
    shareName: user ? publicName(profile.nickname, user.uid, isAdmin) : maskBadWords(profile.nickname) || '게스트',
    // The blue check is part of who the player is (like the name), so QA mode keeps it
    verified: isAdmin,
  };
  /** How the player appears on public boards: nickname (never the Google name), and the Google photo unless a fruit avatar is picked */
  const rankWhoRef = useRef<{ name: string; avatar: string; title?: string; frame?: string; photo?: string; verified?: boolean }>({ name: '', avatar: '' });
  rankWhoRef.current = {
    name: publicName(profile.nickname, user?.uid ?? '', isAdmin),
    avatar: avatar || level.emoji,
    ...(title ? { title: title.id } : {}),
    ...(player.frame ? { frame: player.frame } : {}),
    ...(cleanPhoto(player.photo) ? { photo: player.photo! } : {}),
    ...(isAdmin ? { verified: true } : {}),
  };

  // ───────── helpers ─────────

  const bumpAchievements = () => setAchieveTick((t) => t + 1);

  // Writes to the user's cloud doc run one after another, so the stats transaction never collides with them
  const cloudQueue = useRef<Promise<unknown>>(Promise.resolve());
  const cloudWrite = useCallback(<T,>(op: (api: CloudApi) => Promise<T>): Promise<T> => {
    const run = cloudQueue.current.then(() => cloudApi().then(op));
    cloudQueue.current = run.catch(() => {});
    return run;
  }, []);

  const commitStats = useCallback((next: UserStatistics) => {
    statsRef.current = next;
    setStats(next);
    saveLocalStats(next);
  }, []);

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    setToasts((q) => [...q, { ...t, id: Date.now() + Math.random() }]);
  }, []);

  // One toast at a time
  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(() => setToasts((q) => q.slice(1)), toasts.length > 1 ? 1800 : 2800);
    return () => clearTimeout(timer);
  }, [toasts[0]?.id]);

  // ───────── theme ─────────

  const resolvedTheme = settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'dark' ? '#151020' : '#fff5e6');
  }, [resolvedTheme]);

  useEffect(() => {
    const check = () => {
      const c = takeChallengeFromUrl();
      if (c) setIncomingChallenge(c);
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, []);

  // ───────── music ─────────

  useEffect(() => {
    music.configure(settings.bgmEnabled, settings.bgmVolume);
  }, [settings.bgmEnabled, settings.bgmVolume]);

  useEffect(() => {
    const track: TrackName = screen === 'memory-play' ? 'memory' : screen === 'lobby' || screen === 'memory-setup' ? 'lobby' : screen;
    music.play(track);
  }, [screen]);

  useEffect(() => {
    music.duck(gamePaused);
  }, [gamePaused]);

  // ───────── settings ─────────

  const updateSettings = (next: GameSettings) => {
    setSettings(next);
    writeJSON(SETTINGS_KEY, next);
    const u = userRef.current;
    if (u) cloudWrite((api) => api.saveUserSettings(u.uid, next)).catch(() => {});
  };

  // The top-bar button mutes or unmutes effects and music together
  const handleToggleSound = () => {
    const next = !(settings.sfxEnabled || settings.bgmEnabled);
    updateSettings({ ...settings, sfxEnabled: next, bgmEnabled: next });
    playSound('click', { sfxEnabled: next, volume: settings.volume });
  };

  // A changed nickname / avatar / title / frame shows up on the player's leaderboard entries
  // shortly after (debounced, so flipping through titles makes one update)
  const lookTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** What friends see on my card (same public name as the boards) */
  const cardRef = useRef({ name: '', avatar: '', level: 1, achievements: 0, best: {} as Partial<Record<GameType, number>>, title: '', frame: '', photo: '', verified: false });
  cardRef.current = {
    name: rankWhoRef.current.name,
    avatar: rankWhoRef.current.avatar,
    title: rankWhoRef.current.title ?? '',
    frame: rankWhoRef.current.frame ?? '',
    photo: rankWhoRef.current.photo ?? '',
    verified: !!rankWhoRef.current.verified,
    level: level.level,
    achievements: achievementCount,
    best: Object.fromEntries(GAME_ORDER.map((g) => [g, stats[bestKey(g)]])) as Partial<Record<GameType, number>>,
  };

  const refreshFriendBadge = useCallback(() => {
    const u = userRef.current;
    if (!u) return;
    friendsApi()
      .then((api) => api.pendingCount(u.uid))
      .then((n) => userRef.current?.uid === u.uid && setFriendBadge(n))
      .catch(() => {});
  }, []);

  // Create or refresh my public card a moment after changes (the rules allow one write per 2 s)
  const playerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedulePlayerSync = useCallback(() => {
    if (playerTimer.current) clearTimeout(playerTimer.current);
    playerTimer.current = setTimeout(() => {
      const u = userRef.current;
      if (!u) return;
      const c = cardRef.current;
      friendsApi()
        .then((api) => api.ensurePlayer(u.uid, { ...c, title: c.title || undefined, frame: c.frame || undefined, photo: c.photo || undefined }))
        .then((code) => userRef.current?.uid === u.uid && setMyCode(code))
        .catch((err) => console.warn('Failed to update the player card:', err));
    }, 3000);
  }, []);

  // New friend requests and gifts: checked in the lobby when a window closes, when the app
  // comes back to the front, and every minute while it stays open
  useEffect(() => {
    if (screen === 'lobby' && modal === null) refreshFriendBadge();
  }, [screen, modal, refreshFriendBadge]);

  useEffect(() => {
    if (!user) return;
    const onFront = () => document.visibilityState === 'visible' && refreshFriendBadge();
    const timer = setInterval(onFront, 60_000);
    document.addEventListener('visibilitychange', onFront);
    window.addEventListener('focus', onFront);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onFront);
      window.removeEventListener('focus', onFront);
    };
  }, [user, refreshFriendBadge]);

  const scheduleLookSync = () => {
    schedulePlayerSync();
    if (lookTimer.current) clearTimeout(lookTimer.current);
    lookTimer.current = setTimeout(() => {
      const u = userRef.current;
      if (!u) return;
      rankApi()
        .then((api) => api.syncLook(u.uid, rankWhoRef.current))
        .catch((err) => console.warn('Failed to refresh leaderboard look:', err));
    }, 2500);
  };

  const updateProfile = (next: PlayerProfile) => {
    setProfile(next);
    saveProfile(next);
    const u = userRef.current;
    if (u) {
      cloudWrite((api) => api.saveProfileCustom(u.uid, next)).catch(() => {});
      scheduleLookSync();
    }
  };

  // The Google photo goes onto the boards and the card after sign-in (or when it changes)
  const boardPhoto = rankWhoRef.current.photo ?? '';
  useEffect(() => {
    if (user && boardPhoto) scheduleLookSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, boardPhoto]);

  // ───────── friends: online / last seen ─────────

  // While the app is in front, say "still here" about once a minute; friends see online / last
  // seen from it. Turned off in the settings, the record is removed instead.
  const showPresence = settings.showPresence !== false;
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    if (!showPresence) {
      friendsApi()
        .then((api) => api.clearPresence(uid))
        .catch(() => {});
      return;
    }
    let last = 0;
    const beat = () => {
      if (document.hidden || Date.now() - last < PRESENCE_EVERY_MS - 5000) return;
      last = Date.now();
      friendsApi()
        .then((api) => api.touchPresence(uid))
        .catch(() => {});
    };
    beat();
    const timer = setInterval(beat, PRESENCE_EVERY_MS);
    document.addEventListener('visibilitychange', beat);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [user?.uid, showPresence]);

  // ───────── friends: coin gifts ─────────

  /** Sync my coins up first, send in one transaction, then take the new totals back */
  const sendCoins = async (to: string, amount: number): Promise<SendResult> => {
    const u = userRef.current;
    if (!u) return 'error';
    try {
      await cloudWrite(async (api) => {
        if (!asAdmin) await api.pushMergedStats(u.uid, statsRef.current);
        const f = await friendsApi();
        await f.sendCoins(u.uid, to, amount, asAdmin);
        if (!asAdmin) commitStats(await api.pushMergedStats(u.uid, statsRef.current));
      });
      playSound('star', settings);
      return 'ok';
    } catch (err) {
      const msg = (err as Error)?.message;
      if (msg === 'limit' || msg === 'coins') return msg;
      console.warn('Failed to send coins:', err);
      return 'error';
    }
  };

  const claimGifts = async (ids: string[]): Promise<number> => {
    const u = userRef.current;
    if (!u) return 0;
    const total = await cloudWrite(async (api) => {
      await api.pushMergedStats(u.uid, statsRef.current);
      const f = await friendsApi();
      let sum = 0;
      for (const id of ids) sum += await f.claimGift(u.uid, id);
      commitStats(await api.pushMergedStats(u.uid, statsRef.current));
      return sum;
    });
    if (total > 0) playSound('levelup', settings);
    refreshFriendBadge();
    return total;
  };

  // ───────── streak reminders ─────────

  const toggleReminders = async (on: boolean) => {
    const u = userRef.current;
    if (!u || remindersBusy) return;
    setRemindersBusy(true);
    try {
      const api = await remindersApi();
      if (!on) {
        await api.disableReminders(u.uid);
        setRemindersOn(false);
        pushToast({ icon: '🔕', title: '연속 출석 알림을 껐어요' });
        return;
      }
      const result = await api.enableReminders(u.uid, loadStreak());
      if (result === 'on') {
        setRemindersOn(true);
        pushToast({ icon: '🔔', title: '연속 출석 알림을 켰어요', sub: '그날 아직 안 했으면 저녁 8시에 알려 드려요', tone: 'melon' });
      } else if (result === 'denied') {
        pushToast({ icon: '🔕', title: '알림이 꺼져 있어요', sub: '브라우저 설정에서 이 사이트의 알림을 허용해 주세요', tone: 'berry' });
      } else {
        pushToast({ icon: '⚠️', title: '알림을 켜지 못했어요', sub: '잠시 뒤에 다시 해 주세요', tone: 'berry' });
      }
    } catch {
      pushToast({ icon: '⚠️', title: '알림을 켜지 못했어요', tone: 'berry' });
    } finally {
      setRemindersBusy(false);
    }
  };

  // 운영진 have every achievement; new ones get added the next time an admin signs in
  useEffect(() => {
    const u = userRef.current;
    if (!asAdmin || !u) return;
    const added = unlockMany(ACHIEVEMENT_DEFINITIONS.map((a) => a.id));
    if (!added.length) return;
    bumpAchievements();
    cloudWrite((api) => api.saveAchievements(u.uid, getUnlockedAchievements())).catch(() => {});
    pushToast({ icon: '🏆', title: `운영진이라 업적 ${added.length}개를 모두 달성했어요`, sub: '업적 칭호도 전부 달 수 있어요', tone: 'mango' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asAdmin]);

  // The admin check comes back after sign-in: then the blue check (and a worn 운영진 title or
  // frame) can go on the boards and the card
  useEffect(() => {
    if (asAdmin) scheduleLookSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asAdmin]);

  // ───────── puzzle stages ─────────

  const handleStageClear = (no: number, stars: number) => {
    const next = mergeStageProgress(stageProgressRef.current, { [no]: stars });
    if (next[no] === stageProgressRef.current[no]) return;
    stageProgressRef.current = next;
    setStageProgress(next);
    saveStageProgress(next);
    const u = userRef.current;
    if (u) cloudWrite((api) => api.saveStages(u.uid, next)).catch(() => {});
  };

  // ───────── shop ─────────

  const saveBought = (inv: Inventory) => {
    inventoryRef.current = inv;
    setInventory(inv);
    saveInventory(inv);
    const u = userRef.current;
    if (u) cloudWrite((api) => api.saveInventory(u.uid, inv)).catch(() => {});
  };

  /** Admins don't pay: their coins are unlimited */
  const buyItem = (item: ShopItem) => {
    const stats0 = statsRef.current;
    if (!forSale(item) || inventoryRef.current[item.id] || (!asAdmin && coinBalance(stats0) < item.price)) return;
    saveBought({ ...inventoryRef.current, [item.id]: new Date().toISOString() });
    playSound('levelup', settings);
    pushToast({
      icon: asAdmin ? '🎁' : '🛍️',
      title: `${item.name}${josa(item.name, '을', '를')} ${asAdmin ? '받았어요' : '샀어요'}`,
      sub: '바로 사용해 보세요!',
      tone: 'mango',
    });
    if (asAdmin) return;
    commitStats({ ...stats0, coinsSpent: stats0.coinsSpent + item.price });
    const u = userRef.current;
    if (u) cloudWrite((api) => api.pushMergedStats(u.uid, statsRef.current)).catch(() => {});
  };

  /** Admins: everything in the shop at once */
  const takeAllItems = () => {
    if (!asAdmin) return;
    const now = new Date().toISOString();
    const inv = { ...inventoryRef.current };
    const missing = SHOP_ITEMS.filter((i) => forSale(i) && !inv[i.id]);
    if (!missing.length) return;
    for (const i of missing) inv[i.id] = now;
    saveBought(inv);
    playSound('levelup', settings);
    pushToast({ icon: '🎁', title: `상점 물건 ${missing.length}개를 받았어요`, sub: '운영자는 코인이 무한이에요', tone: 'mango' });
  };

  const equipItem = (kind: ItemKind, item: ShopItem | null) => {
    const id = item?.id ?? '';
    if (kind === 'frame') updateProfile({ ...profile, frame: id });
    else if (kind === 'avatar') updateProfile({ ...profile, avatar: item?.icon ?? '' });
    else if (kind === 'title') updateProfile({ ...profile, title: id });
    else updateSettings({ ...settings, [kind]: id });
  };

  // ───────── auth & cloud sync ─────────

  /** The owner's gifts as ownerGifts/{uid} lists them now; a new one gets a toast */
  const takeGifts = useCallback(
    (ids: string[]) => {
      const next = ids.filter(isOwnerGiftId);
      const before = loadOwnerGifts();
      if (next.some((id) => !before.includes(id)))
        pushToast({ icon: '🌈', title: '프리즘 테두리를 받았어요', sub: '게임 소유자의 선물이에요 · 상점 테두리에 있어요', tone: 'grape' });
      setOwnerGifts(next);
      saveOwnerGifts(next);
    },
    [pushToast]
  );

  /** An admin changed the look (profile.modAt): this device keeps it from now on */
  const takeAdminLook = useCallback(
    (custom: PlayerProfile, modAt: string) => {
      setProfile(custom);
      saveProfile(custom);
      saveProfileMod(modAt);
      // Not for an old change seen on a new device
      if (Date.now() - Date.parse(modAt) < 7 * 86_400_000)
        pushToast({ icon: '🛡️', title: '운영진이 프로필을 바꿨어요', sub: '프로필에서 다시 바꿀 수 있어요', tone: 'grape' });
    },
    [pushToast]
  );

  /** Merge this device's data with the signed-in user's cloud data. */
  const syncCloud = useCallback(
    async (u: User) => {
      try {
        const cloud = await cloudWrite((api) => api.loadUserData(u));

        // Settings: values saved in the cloud win, local ones fill the gaps
        const nextSettings = { ...settingsRef.current, ...cloud.settings };
        setSettings(nextSettings);
        writeJSON(SETTINGS_KEY, nextSettings);
        if (Object.keys(cloud.settings).length === 0) cloudWrite((api) => api.saveUserSettings(u.uid, nextSettings)).catch(() => {});

        // Nickname / avatar / title: the cloud wins when set, otherwise keep this device's choice.
        // After an admin changed them the cloud look counts as it is, even fields put back to empty
        const local = loadProfile();
        const adminLook = !!cloud.modAt && cloud.modAt !== loadProfileMod();
        const mergedProfile = adminLook
          ? cloud.custom
          : {
              nickname: cloud.custom.nickname || local.nickname,
              avatar: cloud.custom.avatar || local.avatar,
              title: cloud.custom.title || local.title,
              frame: cloud.custom.frame || local.frame,
            };
        if (adminLook) takeAdminLook(cloud.custom, cloud.modAt);
        setProfile(mergedProfile);
        saveProfile(mergedProfile);
        if (
          mergedProfile.nickname !== cloud.custom.nickname ||
          mergedProfile.avatar !== cloud.custom.avatar ||
          mergedProfile.title !== cloud.custom.title ||
          mergedProfile.frame !== cloud.custom.frame
        ) {
          cloudWrite((api) => api.saveProfileCustom(u.uid, mergedProfile)).catch(() => {});
        }

        // Puzzle stages: best stars from both sides
        const mergedStages = mergeStageProgress(stageProgressRef.current, cloud.stages);
        stageProgressRef.current = mergedStages;
        setStageProgress(mergedStages);
        saveStageProgress(mergedStages);
        if (Object.entries(mergedStages).some(([k, v]) => (cloud.stages[k] || 0) < v)) {
          cloudWrite((api) => api.saveStages(u.uid, mergedStages)).catch(() => {});
        }

        // Shop items: union of both sides
        const mergedInv = mergeInventory(inventoryRef.current, cloud.inventory);
        inventoryRef.current = mergedInv;
        setInventory(mergedInv);
        saveInventory(mergedInv);
        if (Object.keys(mergedInv).some((id) => !(id in cloud.inventory))) {
          cloudWrite((api) => api.saveInventory(u.uid, mergedInv)).catch(() => {});
        }
        cloudApi()
          .then((api) => api.loadOwnerGifts(u.uid))
          .then(takeGifts)
          .catch((err) => console.warn('Failed to load the owner gifts:', err));

        // Achievements: union of both sides
        const { merged, cloudOutdated } = mergeAchievements(cloud.achievements);
        if (cloudOutdated) cloudWrite((api) => api.saveAchievements(u.uid, merged)).catch(() => {});
        bumpAchievements();

        // Stats: field-wise max, pushed back up atomically
        commitStats(mergeStats(statsRef.current, cloud.statistics));
        cloudWrite((api) => api.pushMergedStats(u.uid, statsRef.current))
          .then((s) => commitStats(mergeStats(statsRef.current, s)))
          .catch((err) => console.warn('Failed to merge stats:', err));
      } catch (err) {
        console.warn('Failed to load user cloud data:', err);
        pushToast({ icon: '⚠️', title: '클라우드 동기화에 실패했어요', tone: 'berry' });
      }
    },
    [commitStats, pushToast, cloudWrite, takeAdminLook, takeGifts]
  );

  // An admin may change the look while the app stays open: look again when it comes back to the
  // front (at most every 3 minutes; the sign-in sync just did)
  useEffect(() => {
    if (!user) return;
    let last = Date.now();
    const check = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 180_000) return;
      last = Date.now();
      cloudApi()
        .then((api) => Promise.all([api.loadCloudLook(user.uid), api.loadOwnerGifts(user.uid)]))
        .then(([look, gifts]) => {
          if (userRef.current?.uid !== user.uid) return;
          takeGifts(gifts);
          if (look.modAt && look.modAt !== loadProfileMod()) takeAdminLook(look.custom, look.modAt);
        })
        .catch(() => {});
    };
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [user, takeAdminLook, takeGifts]);

  /** Last week's #1 on any game earns the 주간 챔피언 title (kept as the latest winning week) */
  const checkChampion = useCallback(
    (u: User) => {
      const week = kstWeek() - 1;
      if (statsRef.current.lastChampionWeek >= week) return;
      rankApi()
        .then((api) => api.championsOfWeek(week))
        .then((champs) => {
          const won = GAME_ORDER.filter((g) => champs[g]?.uid === u.uid);
          if (!won.length || statsRef.current.lastChampionWeek >= week) return;
          commitStats({ ...statsRef.current, lastChampionWeek: week });
          cloudWrite((api) => api.pushMergedStats(u.uid, statsRef.current)).catch(() => {});
          pushToast({
            icon: '👑',
            title: `지난주 ${won.map((g) => GAMES[g].short).join(' · ')} 1위!`,
            sub: "'주간 챔피언' 칭호를 받았어요",
            tone: 'mango',
          });
        })
        .catch((err) => console.warn('Failed to check weekly champions:', err));
    },
    [commitStats, cloudWrite, pushToast]
  );

  // Kept once loaded so the Google popup opens straight from the click (no await before it)
  const authApiRef = useRef<AuthApi | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    loadAuthApi().then((authApi) => {
      if (cancelled) return;
      authApiRef.current = authApi;
      unsubscribe = authApi.onAuthStateChanged(authApi.auth, (u) => {
        setUser(u);
        setIsAdmin(false);
        setIsGameOwner(false);
        if (!u) return;
        // A newer Google photo from a sign-in on another device: fetch the account again
        u.reload()
          .then(() => authApi.auth.currentUser?.uid === u.uid && setUserTick((t) => t + 1))
          .catch(() => {});
        syncCloud(u);
        wakeScoreServer();
        schedulePlayerSync();
        refreshFriendBadge();
        if (loadReminderState().on) remindersApi().then((api) => api.refreshReminders(u.uid, loadStreak())).catch(() => {});
        rankApi()
          .then((api) => api.adminRole(u.email))
          .then((role) => {
            if (authApi.auth.currentUser?.uid !== u.uid) return;
            setIsAdmin(role !== null);
            setIsGameOwner(role === 'owner');
          })
          .catch(() => {});
        checkChampion(u);
      });
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [syncCloud, checkChampion]);

  const handleLogin = async () => {
    try {
      const authApi = authApiRef.current ?? (await loadAuthApi());
      await authApi.signInWithPopup(authApi.auth, authApi.googleProvider);
      playSound('victory', settings);
      setModal(null);
      pushToast({ icon: '👋', title: '로그인했어요', sub: '이제 기록이 클라우드에 저장돼요', tone: 'melon' });
      return { success: true };
    } catch (err: any) {
      console.warn('Google sign-in failed:', err);
      let error = '로그인 중 오류가 발생했어요.';
      if (err?.code === 'auth/popup-closed-by-user') error = '로그인 창이 닫혔어요. 다시 시도해 주세요.';
      else if (err?.code === 'auth/popup-blocked') error = '팝업이 차단됐어요. 브라우저에서 팝업을 허용해 주세요.';
      else if (err?.code === 'auth/cancelled-popup-request') error = '이전 로그인 요청이 취소됐어요.';
      else if (err?.code === 'auth/network-request-failed') error = '네트워크 연결을 확인해 주세요.';
      else if (err?.code === 'auth/unauthorized-domain')
        error = '이 주소에서는 아직 Google 로그인을 쓸 수 없어요. 게스트로 플레이해도 이 기기에 기록이 저장돼요.';
      return { success: false, error };
    }
  };

  const handleLogout = async () => {
    // Reminders belong to this account; removing them needs the sign-in, so do it first
    const leaving = userRef.current;
    if (leaving && loadReminderState().on) {
      await remindersApi()
        .then((api) => api.disableReminders(leaving.uid))
        .catch(() => {});
      setRemindersOn(false);
    }
    try {
      const authApi = authApiRef.current ?? (await loadAuthApi());
      await authApi.signOut(authApi.auth);
    } catch (err) {
      console.warn('Sign out failed:', err);
      return;
    }
    // Don't let this account's progress leak into the next one on this device
    clearLocalProgress();
    clearDays();
    daysRef.current = {};
    setDays({});
    resetAchievements();
    bumpAchievements();
    commitStats({ ...EMPTY_STATS });
    const blank = { nickname: '', avatar: '', title: '', frame: '' };
    clearInventory();
    inventoryRef.current = {};
    setInventory({});
    setOwnerGifts([]);
    saveProfileMod('');
    clearStageProgress();
    stageProgressRef.current = {};
    setStageProgress({});
    setProfile(blank);
    saveProfile(blank);
    historyRef.current = [];
    setHistory([]);
    setModal(null);
    setMyCode('');
    setFriendBadge(0);
    pushToast({ icon: '👋', title: '로그아웃했어요' });
  };

  // ───────── game events ─────────

  // Achievements unlocked together (e.g. at the end of a round) share one toast
  const pendingAchRef = useRef<Achievement[]>([]);
  // Achievements unlocked during the current round, listed on the result card
  const roundAchRef = useRef<string[]>([]);

  const flushAchievementToasts = useCallback(() => {
    const list = pendingAchRef.current;
    pendingAchRef.current = [];
    if (list.length === 0) return;
    playSound('victory', settingsRef.current);
    if (list.length === 1) {
      pushToast({ icon: list[0].icon, title: list[0].title, sub: `업적 달성! +${XP.achievement} XP`, tone: 'mango' });
    } else {
      pushToast({ icon: '🏆', title: `업적 ${list.length}개 달성!`, sub: `+${XP.achievement * list.length} XP`, tone: 'mango' });
    }
  }, [pushToast]);

  const handleUnlockAchieve = useCallback(
    (id: string) => {
      unlockAchievement(id, (ach) => {
        pendingAchRef.current.push(ach);
        roundAchRef.current.push(`${ach.icon} ${ach.title}`);
        if (pendingAchRef.current.length === 1) setTimeout(flushAchievementToasts, 60);
        const u = userRef.current;
        if (u) cloudWrite((api) => api.saveAchievements(u.uid, getUnlockedAchievements())).catch(() => {});
        bumpAchievements();
      });
    },
    [flushAchievementToasts, cloudWrite]
  );

  const handleRoundChange = useCallback((active: boolean) => {
    if (active) {
      roundAchRef.current = [];
      // Signed in: the score server notes when the round began, and checks it when the score comes in
      const u = userRef.current;
      const game = SCREEN_GAME[screenRef.current];
      if (u && game) startScoredRound(game, () => u.getIdToken());
    } else endScoredRound();
    setRoundActive(active);
  }, []);

  // Rounds the score server couldn't check yet (it was asleep or the device offline) wait on the
  // device; they're sent again every couple of minutes until they reach the boards
  const flushingRef = useRef(false);
  const flushPendingRef = useRef(async () => {});
  flushPendingRef.current = async () => {
    const u = userRef.current;
    if (!u || flushingRef.current) return;
    const mine = pendingClaims().filter((c) => c.uid === u.uid);
    if (!mine.length) return;
    flushingRef.current = true;
    try {
      const api = await rankApi();
      for (const claim of mine) {
        const verdict = await askProof(claim, () => u.getIdToken());
        if (verdict && 'later' in verdict) break; // still asleep: next time
        dropClaim(claim);
        if (verdict && 'proof' in verdict) {
          await api.submitScore(u.uid, claim.game, rankWhoRef.current, claim.score, verdict.proof);
          pushToast({ icon: '🏆', title: `${GAMES[claim.game].name} ${claim.score.toLocaleString('ko-KR')}점이 랭킹에 올라갔어요`, tone: 'mango' });
        }
      }
    } catch (err) {
      console.warn('Failed to send a saved round:', err);
    } finally {
      flushingRef.current = false;
    }
  };
  useEffect(() => {
    if (!user) return;
    const run = () => {
      if (document.visibilityState === 'visible') flushPendingRef.current();
    };
    run();
    const timer = setInterval(run, 2 * 60_000);
    document.addEventListener('visibilitychange', run);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
    };
  }, [user]);

  /** Called once per finished round. Returns the rewards for the result screen. */
  const handleGameComplete = useCallback(
    (result: GameResult): GameReward => {
      const prev = statsRef.current;
      const prevBest = prev[bestKey(result.game)];
      const achievements = countUnlocked();

      const { state: nextDaily, completed, stampEarned } = applyDaily(loadDaily(), result);
      saveDaily(nextDaily);
      setDaily(nextDaily);

      const { state: nextStreak, extended } = bumpStreak(loadStreak());
      setStreak(nextStreak);

      const newBest = !result.stage && result.score > 0 && result.score > prevBest;
      const coins = coinsFor(result, { newBest, stamp: stampEarned, firstToday: extended });
      const next = applyResult(prev, result, stampEarned, nextStreak.count, coins);
      commitStats(next);

      const { replay: _replay, ...played } = result;
      historyRef.current = pushHistory(historyRef.current, { ...played, at: Date.now(), best: newBest });
      daysRef.current = recordDay(daysRef.current, result);
      setDays(daysRef.current);
      setHistory(historyRef.current);

      const before = levelInfo(computeXp(prev, achievements));
      const after = levelInfo(computeXp(next, achievements));

      const u = userRef.current;
      if (u) {
        cloudWrite((api) => api.recordCloudResult(u.uid, result, stampEarned, nextStreak.count, coins))
          .then((cloud) => commitStats(mergeStats(statsRef.current, cloud)))
          .catch((err) => console.warn('Failed to save game result:', err));
        // Counted in the admin stats (rounds and play time per day)
        communityApi()
          .then((api) => api.recordActivity(u.uid, result.seconds))
          .catch((err) => console.warn('Failed to record activity:', err));
        schedulePlayerSync();
        // Played today: no reminder tonight
        if (loadReminderState().on) remindersApi().then((api) => api.refreshReminders(u.uid, nextStreak)).catch(() => {});
      }

      // Leaderboards: post the round, then look up today's and the all-time place
      const request = ++rankRequest.current;
      const rankScore = Math.max(0, Math.round(result.score));
      if (u && rankScore > 0 && !result.stage) {
        const game = result.game;
        const who = rankWhoRef.current;
        setRank({ game, status: 'pending' });
        rankApi()
          .then(async (api) => {
            // The score server checks the round first; its proof goes on the board entries
            const verdict = await proveRound(result, u.uid, () => u.getIdToken());
            if (verdict && 'rejected' in verdict) {
              console.warn('The score server did not accept this round:', verdict.rejected);
              if (request === rankRequest.current) setRank({ game, status: 'rejected' });
              return;
            }
            if (verdict && 'later' in verdict) {
              // The server didn't answer (asleep, offline): the round waits here and goes up shortly
              queueClaim(verdict.later);
              wakeScoreServer();
              setTimeout(() => flushPendingRef.current(), 60_000);
              if (request === rankRequest.current) setRank({ game, status: 'queued' });
              return;
            }
            const proof = verdict && 'proof' in verdict ? verdict.proof : undefined;
            const best = await api.submitScore(u.uid, game, who, rankScore, proof);
            const [day, all] = await Promise.all([api.rankOf(game, 'day', best.day), api.rankOf(game, 'all', best.all)]);
            if (request === rankRequest.current) setRank({ game, status: 'done', day, all });
          })
          .catch((err) => {
            console.warn('Failed to post score to the leaderboard:', err);
            if (request === rankRequest.current) setRank({ game, status: 'error' });
          });
      } else {
        setRank(null);
      }

      // Friend challenge outcome
      const ch = activeChallengeRef.current;
      const challenge = ch && ch.g === result.game ? { name: ch.n, target: ch.sc, won: result.score > ch.sc } : null;
      if (challenge?.won) handleUnlockAchieve('challenge_win');

      // Progress achievements (shown on this round's result card)
      const unlockIf = (cond: boolean, id: string) => cond && handleUnlockAchieve(id);
      unlockIf(after.level >= 5, 'level_5');
      unlockIf(after.level >= 10, 'level_10');
      unlockIf(next.missionStamps >= 1, 'stamp_1');
      unlockIf(next.missionStamps >= 10, 'stamp_10');
      unlockIf(nextStreak.count >= 3, 'streak_3');
      unlockIf(nextStreak.count >= 7, 'streak_7');
      unlockIf(nextStreak.count >= 30, 'streak_30');
      unlockIf(result.game === 'suika' && result.score >= 10000, 'suika_10000');
      unlockIf(result.game === 'suika' && result.score >= 100000, 'suika_100000');

      return {
        xpGained: after.xp - before.xp,
        newBest,
        prevBest,
        levelUp: after.level > before.level ? after.level : null,
        missions: completed.map((m) => m.text),
        streak: extended && nextStreak.count > 1 ? nextStreak.count : null,
        achievements: [...roundAchRef.current],
        stamp: stampEarned,
        challenge,
        coins,
      };
    },
    [commitStats, handleUnlockAchieve, cloudWrite]
  );

  // ───────── navigation ─────────

  const goTo = (next: ScreenType) => {
    if (next === 'lobby' || next === 'memory-setup') setActiveChallenge(null);
    setIsPaused(false);
    setRoundActive(false);
    setScreen(next);
  };

  const restartGame = () => {
    setIsPaused(false);
    setRoundActive(false);
    setAutoStart(true);
    setGameKey((k) => k + 1);
  };

  const startMemory = (cfg: MemoryConfig) => {
    setMemoryCfg(cfg);
    writeJSON(MEMORY_CFG_KEY, cfg);
    setGameKey((k) => k + 1);
    goTo('memory-play');
  };

  /** quick = skip the start card ("한 판 더") */
  const playGame = (g: GameType, quick = false) => {
    setActiveChallenge(null);
    setAutoStart(quick);
    setGameKey((k) => k + 1);
    goTo(GAMES[g].screen);
    if (!tutorialSeen(g)) setTutorialGame(g);
  };

  const acceptChallenge = () => {
    const c = incomingChallenge;
    if (!c) return;
    setIncomingChallenge(null);
    setModal(null);
    setAutoStart(false);
    setGameKey((k) => k + 1);
    if (c.g === 'memory') {
      if (c.m) setMemoryCfg(c.m);
      setScreen('memory-play');
    } else {
      setScreen(GAMES[c.g].screen);
    }
    setIsPaused(false);
    setRoundActive(false);
    setActiveChallenge(c);
    if (!tutorialSeen(c.g)) setTutorialGame(c.g);
  };

  const challengeApi = {
    active: activeChallenge,
    linkFor: (game: GameType, score: number) =>
      challengeLink({
        g: game,
        s: roundSeeds.current[game] ?? randomSeed(),
        sc: Math.round(score),
        n: player.shareName ?? player.name,
        m: game === 'memory' ? memoryCfg : undefined,
        d: game === 'dash' ? (activeChallenge?.d ?? settings.dashDifficulty) : undefined,
      }),
  };

  // A downloaded update reloads the page only in an idle lobby (no window open, no round)
  useEffect(() => setUpdateIdle(screen === 'lobby' && modal === null && !isPlaying), [screen, modal, isPlaying]);

  const rankCtx = {
    result: rank,
    signedIn: !!user,
    feedback: () => setModal('feedback'),
    open: (g: GameType) => {
      setRankGame(g);
      setModal('leaderboard');
    },
  };

  const openModal = (id: ModalId) => {
    if (id === 'leaderboard') setRankGame(history[0]?.game ?? 'suika');
    if (id === 'credits') {
      try {
        const count = parseInt(localStorage.getItem('credit_view_count') || '0') + 1;
        localStorage.setItem('credit_view_count', String(count));
        if (count >= 3) handleUnlockAchieve('veteran_tester');
      } catch {
        // ignore
      }
    }
    setModal(id);
  };

  // ESC: close the open window first, otherwise toggle pause mid-round
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (incomingChallenge) {
        setIncomingChallenge(null);
      } else if (tutorialGame) {
        markSeen(tutorialGame);
        setTutorialGame(null);
      } else if (modal) setModal(null);
      else if (isPlaying) setIsPaused((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, isPlaying, tutorialGame, incomingChallenge]);

  // Pause when the tab is hidden mid-round
  useEffect(() => {
    if (!isPlaying) return;
    const onVisibility = () => {
      if (document.hidden) setIsPaused(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isPlaying]);

  // New day → new missions
  useEffect(() => {
    const refresh = () => setDaily((d) => (d.date === todayKey() ? d : loadDaily()));
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  // ───────── data reset ─────────

  const resetAllAchievements = () => {
    resetAchievements();
    bumpAchievements();
    const u = userRef.current;
    if (u) cloudWrite((api) => api.saveAchievements(u.uid, {})).catch(() => {});
  };

  const resetAllRecords = () => {
    clearLocalProgress();
    clearDays();
    daysRef.current = {};
    setDays({});
    commitStats({ ...EMPTY_STATS });
    historyRef.current = [];
    setHistory([]);
    const u = userRef.current;
    if (u) cloudWrite((api) => api.resetCloudStats(u.uid)).catch(() => {});
  };

  // ───────── render ─────────

  const gameCommon = {
    // Card backs, blades and runners only apply while owned (signing out empties the inventory)
    settings: {
      ...settings,
      cardBack: owned[settings.cardBack] ? settings.cardBack : '',
      blade: owned[settings.blade] ? settings.blade : '',
      runner: owned[settings.runner] ? settings.runner : '',
      suikaSkin: owned[settings.suikaSkin] ? settings.suikaSkin : '',
    },
    isPaused: gamePaused,
    onUnlockAchieve: handleUnlockAchieve,
    onGameComplete: handleGameComplete,
    onRoundChange: handleRoundChange,
    onExit: () => goTo('lobby'),
  };

  return (
    <PlayerContext.Provider value={player}>
    <ChallengeContext.Provider value={challengeApi}>
    <RankContext.Provider value={rankCtx}>
    <div className="flex h-dvh w-full flex-col overflow-hidden pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]">
      <ToastHost toast={toasts[0]} />

      <Navbar
        screen={screen}
        roundActive={isPlaying}
        settings={settings}
        player={player}
        level={level}
        challenge={activeChallenge && SCREEN_GAME[screen] === activeChallenge.g ? activeChallenge : null}
        isAdmin={asAdmin}
        qaMode={qaMode}
        friendBadge={friendBadge}
        onHome={() => goTo(screen === 'memory-play' ? 'memory-setup' : 'lobby')}
        onPause={() => setIsPaused(true)}
        onToggleSound={handleToggleSound}
        onOpen={openModal}
      />

      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-full w-full flex-col px-4 pb-8 pt-1 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-1 flex-col"
            >
              <Suspense fallback={<Loading />}>
                {screen === 'lobby' && (
                  <Lobby
                    player={player}
                    streak={streakNow}
                    stats={stats}
                    history={history}
                    daily={daily}
                    level={level}
                    achievementCount={achievementCount}
                    coins={coins}
                    friendBadge={friendBadge}
                    onPlay={playGame}
                    onOpen={openModal}
                  />
                )}

                {screen === 'memory-setup' && (
                  <MemorySetup
                    initial={memoryCfg}
                    settings={settings}
                    onStart={startMemory}
                    onBack={() => goTo('lobby')}
                    onHelp={() => setTutorialGame('memory')}
                  />
                )}

                {screen === 'memory-play' && (
                  <MemoryGameBoard
                    key={gameKey}
                    {...memoryCfg}
                    {...gameCommon}
                    onRetry={restartGame}
                    onChangeSetup={() => goTo('memory-setup')}
                    seed={activeChallenge?.g === 'memory' ? activeChallenge.s : undefined}
                    onRoundSeed={(seed: string) => (roundSeeds.current.memory = seed)}
                  />
                )}

                {screen === 'suika' && (
                  <SuikaGame
                    key={gameKey}
                    {...gameCommon}
                    autoStart={autoStart}
                    dark={resolvedTheme === 'dark'}
                    best={stats.suikaHighScore}
                    unlimitedItems={asAdmin}
                    onHelp={() => setTutorialGame('suika')}
                    seed={activeChallenge?.g === 'suika' ? activeChallenge.s : undefined}
                    onRoundSeed={(seed: string) => (roundSeeds.current.suika = seed)}
                  />
                )}

                {screen === 'dash' && (
                  <FruitDashGame
                    key={gameKey}
                    {...gameCommon}
                    autoStart={autoStart}
                    dark={resolvedTheme === 'dark'}
                    best={stats.dashHighScore}
                    onChangeDifficulty={(d) => updateSettings({ ...settings, dashDifficulty: d })}
                    onHelp={() => setTutorialGame('dash')}
                    seed={activeChallenge?.g === 'dash' ? activeChallenge.s : undefined}
                    onRoundSeed={(seed: string) => (roundSeeds.current.dash = seed)}
                    lockedDifficulty={activeChallenge?.g === 'dash' ? activeChallenge.d : undefined}
                  />
                )}
                {screen === 'puzzle' && (
                  <PuzzleGame
                    key={gameKey}
                    {...gameCommon}
                    autoStart={autoStart}
                    best={stats.puzzleHighScore}
                    onHelp={() => setTutorialGame('puzzle')}
                    seed={activeChallenge?.g === 'puzzle' ? activeChallenge.s : undefined}
                    onRoundSeed={(seed: string) => (roundSeeds.current.puzzle = seed)}
                    stageProgress={stageProgress}
                    onStageClear={handleStageClear}
                  />
                )}
                {screen === 'slice' && (
                  <FruitSliceGame
                    key={gameKey}
                    {...gameCommon}
                    autoStart={autoStart}
                    dark={resolvedTheme === 'dark'}
                    best={stats.sliceHighScore}
                    onHelp={() => setTutorialGame('slice')}
                    seed={activeChallenge?.g === 'slice' ? activeChallenge.s : undefined}
                    onRoundSeed={(seed: string) => (roundSeeds.current.slice = seed)}
                  />
                )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {screen === 'lobby' && <MobileTabBar friendBadge={friendBadge} onOpen={openModal} />}

      <ProfileModal
        isOpen={modal === 'profile'}
        onClose={() => setModal(null)}
        user={user}
        isAdmin={asAdmin}
        player={player}
        profile={profile}
        onUpdateProfile={updateProfile}
        stats={stats}
        level={level}
        achievementCount={achievementCount}
        titles={titles}
        boughtAvatars={SHOP_ITEMS.filter((i) => i.kind === 'avatar' && owned[i.id]).map((i) => i.icon ?? '')}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenAdmin={() => setModal('admin')}
        onOpenShop={() => setModal('shop')}
        onOpenTerms={() => setModal('terms')}
      />
      <AchievementsModal isOpen={modal === 'achievements'} onClose={() => setModal(null)} />
      <RecordsModal isOpen={modal === 'records'} onClose={() => setModal(null)} stats={stats} history={history} days={days} />
      <SettingsModal
        isOpen={modal === 'settings'}
        onClose={() => setModal(null)}
        settings={settings}
        loggedIn={!!user}
        isAdmin={isAdmin}
        myEmail={user?.email ?? ''}
        onUpdateSettings={updateSettings}
        onResetAchievements={resetAllAchievements}
        onResetRecords={resetAllRecords}
        onNotify={(msg) => pushToast({ icon: '✅', title: msg, tone: 'melon' })}
        onOpenFeedback={() => setModal('feedback')}
        reminders={{ on: remindersOn, busy: remindersBusy }}
        onToggleReminders={toggleReminders}
        onOpenTerms={() => setModal('terms')}
      />
      <LeaderboardModal
        isOpen={modal === 'leaderboard'}
        onClose={() => setModal(null)}
        game={rankGame}
        uid={user?.uid ?? null}
        isAdmin={asAdmin}
        onLogin={() => setModal('profile')}
        onViewPlayer={(id) => {
          setViewUid(id);
          setModal('player');
        }}
      />
      <FriendsModal
        isOpen={modal === 'friends'}
        onClose={() => {
          setModal(null);
          refreshFriendBadge();
        }}
        uid={user?.uid ?? null}
        isAdmin={asAdmin}
        myCode={myCode}
        balance={coins}
        onLogin={() => setModal('profile')}
        onSendCoins={sendCoins}
        onClaimGifts={claimGifts}
        onViewPlayer={(id) => {
          setViewUid(id);
          setModal('player');
        }}
        onChanged={refreshFriendBadge}
        onNotify={(icon, title, sub) => pushToast({ icon, title, ...(sub ? { sub } : {}), tone: icon === '⚠️' ? 'berry' : 'soda' })}
      />
      <PlayerModal
        isOpen={modal === 'player'}
        onClose={() => setModal(null)}
        viewerUid={user?.uid ?? null}
        targetUid={viewUid}
        onNotify={(icon, title) => pushToast({ icon, title, tone: icon === '⚠️' ? 'berry' : 'soda' })}
        onChanged={refreshFriendBadge}
        onOpenFriends={() => setModal('friends')}
      />
      <ShopModal
        isOpen={modal === 'shop'}
        onClose={() => setModal(null)}
        balance={coins}
        isAdmin={asAdmin}
        owned={owned}
        player={player}
        equipped={{
          frame: player.frame ?? '',
          avatar: avatarItem(avatar)?.id ?? (avatar ? 'fruit' : ''),
          title: title?.id ?? '',
          cardBack: owned[settings.cardBack] ? settings.cardBack : '',
          blade: owned[settings.blade] ? settings.blade : '',
          runner: owned[settings.runner] ? settings.runner : '',
          suikaSkin: owned[settings.suikaSkin] ? settings.suikaSkin : '',
        }}
        onBuy={buyItem}
        onTakeAll={takeAllItems}
        onEquip={equipItem}
      />
      <AdminModal isOpen={modal === 'admin' && asAdmin} onClose={() => setModal(null)} adminUid={user?.uid ?? null} isGameOwner={isGameOwner} />
      <FeedbackModal
        isOpen={modal === 'feedback'}
        onClose={() => setModal(null)}
        uid={user?.uid ?? null}
        name={rankWhoRef.current.name}
        onLogin={() => setModal('profile')}
        onSent={() => pushToast({ icon: '💌', title: '의견을 보냈어요', sub: '고마워요! 운영자가 꼭 읽을게요', tone: 'melon' })}
      />
      <PatchNotesModal isOpen={modal === 'patch'} onClose={() => setModal(null)} />
      <TermsModal isOpen={modal === 'terms'} onClose={() => setModal(null)} />
      <CreditsModal isOpen={modal === 'credits'} onClose={() => setModal(null)} />
      <AppsModal isOpen={modal === 'apps'} onClose={() => setModal(null)} />
      <ChallengeModal challenge={incomingChallenge} onAccept={acceptChallenge} onDismiss={() => setIncomingChallenge(null)} />
      <Tutorial game={tutorialGame} onClose={() => setTutorialGame(null)} />
      <PauseModal
        isOpen={isPaused && isPlaying && modal === null && tutorialGame === null}
        onResume={() => setIsPaused(false)}
        onRestart={restartGame}
        onExit={() => goTo('lobby')}
        onFeedback={() => setModal('feedback')}
      />
    </div>
    </RankContext.Provider>
    </ChallengeContext.Provider>
    </PlayerContext.Provider>
  );
}
