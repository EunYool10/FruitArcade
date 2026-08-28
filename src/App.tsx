import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import {
  ScreenType,
  MemoryMode,
  LifeLimit,
  GameSettings,
  Achievement,
  UserGameData,
  UserStatistics,
} from './types';
import { Navbar } from './components/Navbar';
import { IntroScreen } from './components/IntroScreen';
import { GameSelectScreen } from './components/GameSelectScreen';
import { MemorySetup } from './components/MemoryGame/MemorySetup';
import { MemoryGameBoard } from './components/MemoryGame/MemoryGameBoard';
import { SuikaGame } from './components/SuikaGame/SuikaGame';
import { StockGame } from './components/StockGame/StockGame';
import { FruitDashGame } from './components/FruitDashGame/FruitDashGame';
import { AchievementsModal } from './components/Modals/AchievementsModal';
import { PatchNotesModal } from './components/Modals/PatchNotesModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { CreditsModal } from './components/Modals/CreditsModal';
import { PauseModal } from './components/Modals/PauseModal';
import { LoginModal } from './components/Modals/LoginModal';
import {
  unlockAchievement,
  setMemoryAchievements,
  getUnlockedAchievements,
} from './utils/achievements';
import {
  loadUserData,
  saveGameResult,
  saveAchievements,
  saveUserSettings,
  DEFAULT_STATISTICS,
} from './utils/userDataService';
import { playSound } from './utils/audio';

const SETTINGS_KEY = 'fruit_arcade_settings';

const defaultSettings: GameSettings = {
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

export default function App() {
  const [screen, setScreen] = useState<ScreenType>('intro');
  const [memoryMode, setMemoryMode] = useState<MemoryMode>('4');
  const [previewTime, setPreviewTime] = useState<number>(2000);
  const [lifeLimit, setLifeLimit] = useState<LifeLimit>('infinite');

  // Firebase Auth & Cloud Data State
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStatistics>(DEFAULT_STATISTICS);

  // Modals
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAchieveOpen, setIsAchieveOpen] = useState(false);
  const [isPatchOpen, setIsPatchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Achievement unlock notification banner
  const [unlockedBanner, setUnlockedBanner] = useState<Achievement | null>(null);

  // Settings
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  // Listen to Auth State and Sync Cloud Data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const data: UserGameData = await loadUserData(currentUser);
          if (data.statistics) setUserStats(data.statistics);
          if (data.achievements) {
            setMemoryAchievements(data.achievements);
          }
          if (data.settings) {
            setSettings(data.settings);
          }
        } catch (err) {
          console.warn('Failed to load user cloud data:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      playSound('victory', settings);
      return { success: true };
    } catch (err: any) {
      console.warn('Google Sign-in aborted or failed:', err);
      let errorMsg = '로그인 중 오류가 발생했습니다.';
      if (err?.code === 'auth/popup-closed-by-user') {
        errorMsg = '로그인 팝업이 닫혔습니다. 다시 시도해주세요.';
      } else if (err?.code === 'auth/cancelled-popup-request') {
        errorMsg = '이전 로그인 요청이 취소되었습니다.';
      } else if (err?.code === 'auth/network-request-failed') {
        errorMsg = '네트워크 연결 상태를 확인해주세요.';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      return { success: false, error: errorMsg };
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserStats(DEFAULT_STATISTICS);
      playSound('click', settings);
    } catch (err) {
      console.warn('Sign out failed:', err);
    }
  };

  const updateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch {
      // ignore
    }
    if (user) {
      saveUserSettings(user.uid, newSettings).catch(() => {});
    }
  };

  const handleToggleSound = () => {
    const next = !settings.sfxEnabled;
    updateSettings({ ...settings, sfxEnabled: next });
    playSound('click', { sfxEnabled: next, volume: settings.volume });
  };

  const handleUnlockAchieve = useCallback(
    (id: string) => {
      unlockAchievement(id, (ach) => {
        setUnlockedBanner(ach);
        playSound('victory', settings);

        // Sync to cloud if user is logged in
        if (user) {
          const current = getUnlockedAchievements();
          saveAchievements(user.uid, current).catch(() => {});
        }

        setTimeout(() => {
          setUnlockedBanner((prev) => (prev?.id === ach.id ? null : prev));
        }, 4000);
      });
    },
    [settings, user]
  );

  // Save game result to cloud & local
  const handleGameComplete = useCallback(
    (gameType: 'memory' | 'suika' | 'stock' | 'dash', finalScore: number, playTimeSeconds: number) => {
      if (user) {
        saveGameResult(user.uid, gameType, finalScore, playTimeSeconds, userStats)
          .then((updated) => setUserStats(updated))
          .catch((err) => console.warn('Failed to save game result:', err));
      }
    },
    [user, userStats]
  );

  // Start Memory Game from setup
  const handleStartMemory = (m: MemoryMode, pt: number, ll: LifeLimit) => {
    setMemoryMode(m);
    setPreviewTime(pt);
    setLifeLimit(ll);
    setScreen('memory-play');
  };

  // Keyboard shortcut listener for ESC (Pause toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const isGameRunning =
          screen === 'memory-play' || screen === 'suika' || screen === 'stock' || screen === 'dash';
        if (isGameRunning) {
          setIsPaused((p) => !p);
        } else if (isLoginOpen || isAchieveOpen || isPatchOpen || isSettingsOpen || isCreditsOpen) {
          setIsLoginOpen(false);
          setIsAchieveOpen(false);
          setIsPatchOpen(false);
          setIsSettingsOpen(false);
          setIsCreditsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, isLoginOpen, isAchieveOpen, isPatchOpen, isSettingsOpen, isCreditsOpen]);

  // Credit view count check for achievement
  const handleOpenCredits = () => {
    try {
      let count = parseInt(localStorage.getItem('credit_view_count') || '0');
      count++;
      localStorage.setItem('credit_view_count', count.toString());
      if (count >= 3) {
        handleUnlockAchieve('veteran_tester');
      }
    } catch {
      // ignore
    }
    setIsCreditsOpen(true);
  };

  return (
    <div
      id="app-wrapper"
      className="relative flex flex-col items-center justify-between w-full h-screen overflow-hidden text-[#e8edf5] select-none"
      style={{
        background: 'linear-gradient(135deg, #171217 0%, #101019 45%, #070d19 100%)',
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(255, 122, 0, 0.08) 0%, transparent 65%),
          radial-gradient(ellipse at 15% 10%, rgba(255, 122, 0, 0.10) 0%, transparent 50%),
          radial-gradient(ellipse at 85% 85%, rgba(37, 99, 235, 0.09) 0%, transparent 50%),
          linear-gradient(135deg, #171217 0%, #101019 45%, #070d19 100%)
        `,
      }}
    >
      {/* Achievement Unlocked Toast Banner */}
      {unlockedBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500/90 to-orange-500/90 border border-amber-300/80 text-white shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <div className="text-2xl animate-bounce">{unlockedBanner.icon}</div>
          <div>
            <div className="text-[10px] font-black tracking-widest text-amber-200 uppercase">🏆 업적 달성!</div>
            <div className="text-sm font-extrabold">{unlockedBanner.title} 해금 완료!</div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <Navbar
        currentScreen={screen}
        settings={settings}
        user={user}
        onOpenLoginModal={() => setIsLoginOpen(true)}
        onToggleSound={handleToggleSound}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAchievements={() => setIsAchieveOpen(true)}
        onOpenPatchNotes={() => setIsPatchOpen(true)}
        onPause={() => setIsPaused(true)}
        onHome={() => {
          setIsPaused(false);
          setScreen('intro');
        }}
      />

      {/* Main Screen Content with Smooth Transition Animation */}
      <main className="flex-1 w-full flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden p-[var(--ui-space-lg)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex-1 flex flex-col items-center justify-center min-h-0"
          >
            {screen === 'intro' && (
              <IntroScreen
                onStart={() => setScreen('game-select')}
                onOpenAchievements={() => setIsAchieveOpen(true)}
                onOpenPatchNotes={() => setIsPatchOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenCredits={handleOpenCredits}
                settings={settings}
              />
            )}

            {screen === 'game-select' && (
              <GameSelectScreen
                onSelectGame={(selectedScreen) => setScreen(selectedScreen)}
                onBack={() => setScreen('intro')}
                settings={settings}
              />
            )}

            {screen === 'memory-setup' && (
              <MemorySetup
                onStartGame={handleStartMemory}
                onBack={() => setScreen('game-select')}
                settings={settings}
                onToggleSound={handleToggleSound}
              />
            )}

            {screen === 'memory-play' && (
              <MemoryGameBoard
                mode={memoryMode}
                previewTime={previewTime}
                lifeLimit={lifeLimit}
                settings={settings}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onMenu={() => setScreen('intro')}
                onRetry={() => setScreen('memory-setup')}
                onUnlockAchieve={handleUnlockAchieve}
                isPaused={isPaused}
              />
            )}

            {screen === 'suika' && (
              <SuikaGame
                settings={settings}
                onMenu={() => setScreen('intro')}
                isPaused={isPaused}
              />
            )}

            {screen === 'stock' && (
              <StockGame
                settings={settings}
                onMenu={() => setScreen('intro')}
                isPaused={isPaused}
              />
            )}

            {screen === 'dash' && (
              <FruitDashGame
                settings={settings}
                onMenu={() => setScreen('intro')}
                isPaused={isPaused}
                handleGameComplete={handleGameComplete}
                onGameOver={(score, dur) => handleGameComplete('dash', score, dur)}
                onUnlockAchieve={handleUnlockAchieve}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Overlays / Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        user={user}
        userStats={userStats}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <AchievementsModal
        isOpen={isAchieveOpen}
        onClose={() => setIsAchieveOpen(false)}
      />

      <PatchNotesModal
        isOpen={isPatchOpen}
        onClose={() => setIsPatchOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        onNotify={(msg) => alert(msg)}
      />

      <CreditsModal
        isOpen={isCreditsOpen}
        onClose={() => setIsCreditsOpen(false)}
        onUnlockAchieve={handleUnlockAchieve}
      />

      <PauseModal
        isOpen={isPaused}
        onResume={() => setIsPaused(false)}
        onHome={() => {
          setIsPaused(false);
          setScreen('intro');
        }}
      />
    </div>
  );
}

