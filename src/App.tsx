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
import { DEFAULT_SETTINGS, GAMES, PLAY_SCREENS, SCREEN_GAME } from './constants';
import { Navbar, NavTarget } from './components/Navbar';
import { Lobby, LobbyTarget } from './components/lobby/Lobby';
import { MemorySetup } from './components/MemoryGame/MemorySetup';
import { AchievementsModal } from './components/Modals/AchievementsModal';
import { PatchNotesModal } from './components/Modals/PatchNotesModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { CreditsModal } from './components/Modals/CreditsModal';
import { PauseModal } from './components/Modals/PauseModal';
import { ProfileModal } from './components/Modals/ProfileModal';
import { RecordsModal } from './components/Modals/RecordsModal';
import { Toast, ToastHost } from './components/ui/Toast';
import { PlayerView } from './components/ui/Avatar';
import { PlayerContext } from './components/PlayerContext';
import { ChallengeContext } from './components/ChallengeContext';
import { ChallengeModal } from './components/Modals/ChallengeModal';
import { LeaderboardModal } from './components/Modals/LeaderboardModal';
import { RankContext } from './components/RankContext';
import { RankResult, publicName } from './utils/ranking';
import { Challenge, challengeLink, takeChallengeFromUrl } from './utils/challenge';
import { randomSeed } from './utils/rng';
import { Tutorial, markSeen, tutorialSeen } from './components/game/Tutorial';
import {
  countUnlocked,
  getUnlockedAchievements,
  mergeAchievements,
  resetAchievements,
  unlockAchievement,
} from './utils/achievements';
import {
  EMPTY_STATS,
  XP,
  applyResult,
  bestKey,
  clearLocalProgress,
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
import { PlayerProfile, loadProfile, saveProfile } from './utils/profile';
import { DailyState, applyDaily, loadDaily, saveDaily, todayKey } from './utils/missions';
import { playSound } from './utils/audio';
import { TrackName, music } from './utils/music';

// Games are code-split so the lobby loads fast
const MemoryGameBoard = lazy(() =>
  import('./components/MemoryGame/MemoryGameBoard').then((m) => ({ default: m.MemoryGameBoard }))
);
const PuzzleGame = lazy(() => import('./components/PuzzleGame/PuzzleGame').then((m) => ({ default: m.PuzzleGame })));
const SuikaGame = lazy(() => import('./components/SuikaGame/SuikaGame').then((m) => ({ default: m.SuikaGame })));
const FruitDashGame = lazy(() =>
  import('./components/FruitDashGame/FruitDashGame').then((m) => ({ default: m.FruitDashGame }))
);

// Firebase loads after the first paint; Firestore only once someone signs in
const loadAuthApi = () => import('./authApi');
type AuthApi = Awaited<ReturnType<typeof loadAuthApi>>;
const cloudApi = () => import('./utils/userDataService');
const rankApi = () => import('./utils/leaderboardService');

const SETTINGS_KEY = 'fruit_arcade_settings';
const MEMORY_CFG_KEY = 'fruit_arcade_memory';
const DEFAULT_MEMORY: MemoryConfig = { mode: '4', previewTime: 2000, lifeLimit: 'infinite' };

type ModalId = NavTarget | LobbyTarget;

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
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const [stats, setStats] = useState<UserStatistics>(loadLocalStats);
  const statsRef = useRef(stats);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const historyRef = useRef(history);
  const [daily, setDaily] = useState<DailyState>(loadDaily);
  const [streak, setStreak] = useState<StreakState>(loadStreak);
  const [profile, setProfile] = useState<PlayerProfile>(loadProfile);

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
  const player: PlayerView = {
    name: profile.nickname || user?.displayName || '게스트',
    emoji: profile.avatar || level.emoji,
    photo: profile.avatar ? null : user?.photoURL ?? null,
    isGuest: !user,
  };
  /** How the player appears on public boards (nickname only, never the Google name) */
  const rankWhoRef = useRef({ name: '', avatar: '' });
  rankWhoRef.current = { name: publicName(profile.nickname, user?.uid ?? ''), avatar: profile.avatar || level.emoji };

  // ───────── helpers ─────────

  const bumpAchievements = () => setAchieveTick((t) => t + 1);

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
    const track: TrackName =
      screen === 'memory-play' ? 'memory' : screen === 'suika' ? 'suika' : screen === 'dash' ? 'dash' : screen === 'puzzle' ? 'puzzle' : 'lobby';
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
    if (u) cloudApi().then((api) => api.saveUserSettings(u.uid, next)).catch(() => {});
  };

  // The top-bar button mutes or unmutes effects and music together
  const handleToggleSound = () => {
    const next = !(settings.sfxEnabled || settings.bgmEnabled);
    updateSettings({ ...settings, sfxEnabled: next, bgmEnabled: next });
    playSound('click', { sfxEnabled: next, volume: settings.volume });
  };

  const updateProfile = (next: PlayerProfile) => {
    setProfile(next);
    saveProfile(next);
    const u = userRef.current;
    if (u) cloudApi().then((api) => api.saveProfileCustom(u.uid, next)).catch(() => {});
  };

  // ───────── auth & cloud sync ─────────

  /** Merge this device's data with the signed-in user's cloud data. */
  const syncCloud = useCallback(
    async (u: User) => {
      try {
        const api = await cloudApi();
        const cloud = await api.loadUserData(u);

        // Plain writes finish before the stats transaction so they never collide with it
        const writes: Promise<unknown>[] = [];

        // Settings: values saved in the cloud win, local ones fill the gaps
        const nextSettings = { ...settingsRef.current, ...cloud.settings };
        setSettings(nextSettings);
        writeJSON(SETTINGS_KEY, nextSettings);
        if (Object.keys(cloud.settings).length === 0) writes.push(api.saveUserSettings(u.uid, nextSettings));

        // Nickname / avatar: the cloud wins when set, otherwise keep this device's choice
        const local = loadProfile();
        const mergedProfile = {
          nickname: cloud.custom.nickname || local.nickname,
          avatar: cloud.custom.avatar || local.avatar,
        };
        setProfile(mergedProfile);
        saveProfile(mergedProfile);
        if (mergedProfile.nickname !== cloud.custom.nickname || mergedProfile.avatar !== cloud.custom.avatar) {
          writes.push(api.saveProfileCustom(u.uid, mergedProfile));
        }

        // Achievements: union of both sides
        const { merged, cloudOutdated } = mergeAchievements(cloud.achievements);
        if (cloudOutdated) writes.push(api.saveAchievements(u.uid, merged));
        bumpAchievements();

        // Stats: field-wise max, pushed back up atomically
        commitStats(mergeStats(statsRef.current, cloud.statistics));
        await Promise.allSettled(writes);
        api
          .pushMergedStats(u.uid, statsRef.current)
          .then((s) => commitStats(mergeStats(statsRef.current, s)))
          .catch((err) => console.warn('Failed to merge stats:', err));
      } catch (err) {
        console.warn('Failed to load user cloud data:', err);
        pushToast({ icon: '⚠️', title: '클라우드 동기화에 실패했어요', tone: 'berry' });
      }
    },
    [commitStats, pushToast]
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
        if (u) syncCloud(u);
      });
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [syncCloud]);

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
    try {
      const authApi = authApiRef.current ?? (await loadAuthApi());
      await authApi.signOut(authApi.auth);
    } catch (err) {
      console.warn('Sign out failed:', err);
      return;
    }
    // Don't let this account's progress leak into the next one on this device
    clearLocalProgress();
    resetAchievements();
    bumpAchievements();
    commitStats({ ...EMPTY_STATS });
    const blank = { nickname: '', avatar: '' };
    setProfile(blank);
    saveProfile(blank);
    historyRef.current = [];
    setHistory([]);
    setModal(null);
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
        if (u) cloudApi().then((api) => api.saveAchievements(u.uid, getUnlockedAchievements())).catch(() => {});
        bumpAchievements();
      });
    },
    [flushAchievementToasts]
  );

  const handleRoundChange = useCallback((active: boolean) => {
    if (active) roundAchRef.current = [];
    setRoundActive(active);
  }, []);

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

      const next = applyResult(prev, result, stampEarned, nextStreak.count);
      commitStats(next);

      const newBest = result.score > 0 && result.score > prevBest;
      historyRef.current = pushHistory(historyRef.current, { ...result, at: Date.now(), best: newBest });
      setHistory(historyRef.current);

      const before = levelInfo(computeXp(prev, achievements));
      const after = levelInfo(computeXp(next, achievements));

      const u = userRef.current;
      if (u) {
        cloudApi()
          .then((api) => api.recordCloudResult(u.uid, result, stampEarned, nextStreak.count))
          .then((cloud) => commitStats(mergeStats(statsRef.current, cloud)))
          .catch((err) => console.warn('Failed to save game result:', err));
      }

      // Leaderboards: post the round, then look up today's and the all-time place
      const request = ++rankRequest.current;
      const rankScore = Math.max(0, Math.round(result.score));
      if (u && rankScore > 0) {
        const game = result.game;
        const who = rankWhoRef.current;
        setRank({ game, status: 'pending' });
        rankApi()
          .then(async (api) => {
            const best = await api.submitScore(u.uid, game, who, rankScore);
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
      };
    },
    [commitStats, handleUnlockAchieve]
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
        n: player.name,
        m: game === 'memory' ? memoryCfg : undefined,
        d: game === 'dash' ? (activeChallenge?.d ?? settings.dashDifficulty) : undefined,
      }),
  };

  const rankCtx = {
    result: rank,
    signedIn: !!user,
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
    if (u) cloudApi().then((api) => api.saveAchievements(u.uid, {})).catch(() => {});
  };

  const resetAllRecords = () => {
    clearLocalProgress();
    commitStats({ ...EMPTY_STATS });
    historyRef.current = [];
    setHistory([]);
    const u = userRef.current;
    if (u) cloudApi().then((api) => api.resetCloudStats(u.uid)).catch(() => {});
  };

  // ───────── render ─────────

  const gameCommon = {
    settings,
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
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <ToastHost toast={toasts[0]} />

      <Navbar
        screen={screen}
        roundActive={isPlaying}
        settings={settings}
        player={player}
        level={level}
        challenge={activeChallenge && SCREEN_GAME[screen] === activeChallenge.g ? activeChallenge : null}
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
                  />
                )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <ProfileModal
        isOpen={modal === 'profile'}
        onClose={() => setModal(null)}
        user={user}
        player={player}
        profile={profile}
        onUpdateProfile={updateProfile}
        stats={stats}
        level={level}
        achievementCount={achievementCount}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      <AchievementsModal isOpen={modal === 'achievements'} onClose={() => setModal(null)} />
      <RecordsModal isOpen={modal === 'records'} onClose={() => setModal(null)} stats={stats} history={history} />
      <SettingsModal
        isOpen={modal === 'settings'}
        onClose={() => setModal(null)}
        settings={settings}
        loggedIn={!!user}
        onUpdateSettings={updateSettings}
        onResetAchievements={resetAllAchievements}
        onResetRecords={resetAllRecords}
        onNotify={(msg) => pushToast({ icon: '✅', title: msg, tone: 'melon' })}
      />
      <LeaderboardModal
        isOpen={modal === 'leaderboard'}
        onClose={() => setModal(null)}
        game={rankGame}
        uid={user?.uid ?? null}
        onLogin={() => setModal('profile')}
      />
      <PatchNotesModal isOpen={modal === 'patch'} onClose={() => setModal(null)} />
      <CreditsModal isOpen={modal === 'credits'} onClose={() => setModal(null)} />
      <ChallengeModal challenge={incomingChallenge} onAccept={acceptChallenge} onDismiss={() => setIncomingChallenge(null)} />
      <Tutorial game={tutorialGame} onClose={() => setTutorialGame(null)} />
      <PauseModal
        isOpen={isPaused && isPlaying && modal === null && tutorialGame === null}
        onResume={() => setIsPaused(false)}
        onRestart={restartGame}
        onExit={() => goTo('lobby')}
      />
    </div>
    </RankContext.Provider>
    </ChallengeContext.Provider>
    </PlayerContext.Provider>
  );
}
