import React from 'react';
import { Volume2, VolumeX, Pause, Settings, Trophy, FileText, Home, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { User } from 'firebase/auth';
import { ScreenType, GameSettings } from '../types';

interface Props {
  currentScreen: ScreenType;
  settings: GameSettings;
  user: User | null;
  onOpenLoginModal: () => void;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenAchievements: () => void;
  onOpenPatchNotes: () => void;
  onPause: () => void;
  onHome: () => void;
}

export const Navbar: React.FC<Props> = ({
  currentScreen,
  settings,
  user,
  onOpenLoginModal,
  onToggleSound,
  onOpenSettings,
  onOpenAchievements,
  onOpenPatchNotes,
  onPause,
  onHome,
}) => {
  const isPlayingGame =
    currentScreen === 'memory-play' ||
    currentScreen === 'suika' ||
    currentScreen === 'stock' ||
    currentScreen === 'dash';

  return (
    <header className="w-full h-[52px] sm:h-[56px] max-w-[880px] mx-auto px-3 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left Brand Area */}
      <div
        onClick={onHome}
        className="flex items-center gap-2 cursor-pointer group select-none shrink-0 transition-transform active:scale-95"
      >
        <span className="text-xl sm:text-2xl filter drop-shadow-[0_0_8px_rgba(255,122,0,0.55)] group-hover:scale-110 transition-transform shrink-0">
          🍓
        </span>
        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <span className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
            FRUIT ARCADE
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono font-bold">
              v2.0
            </span>
          </span>
          <span className="hidden lg:inline text-slate-600 text-xs">|</span>
          <span className="hidden lg:inline text-xs text-slate-400 font-medium">
            상큼 과일 아케이드 존
          </span>
        </div>
      </div>

      {/* Right Control Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {isPlayingGame && (
          <button
            id="nav-pause-btn"
            onClick={onPause}
            title="일시정지 (ESC)"
            className="h-[var(--ui-btn-h-nav)] min-h-[44px] sm:min-h-0 px-2.5 sm:px-3 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 active:bg-orange-500/10 border border-orange-500/40 text-orange-400 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 cursor-pointer shadow-[0_2px_10px_rgba(255,122,0,0.15)]"
          >
            <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-orange-400/40 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">일시정지</span>
          </button>
        )}

        <button
          id="nav-sound-btn"
          onClick={onToggleSound}
          title={settings.sfxEnabled ? '효과음 끄기' : '효과음 켜기'}
          className={`h-[var(--ui-btn-h-nav)] min-h-[44px] sm:min-h-0 px-2 sm:px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 cursor-pointer ${
            settings.sfxEnabled
              ? 'bg-white/5 hover:bg-white/10 active:bg-white/5 border-white/10 text-slate-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {settings.sfxEnabled ? (
            <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          )}
          <span className="hidden sm:inline whitespace-nowrap">
            {settings.sfxEnabled ? '소리 ON' : '소리 OFF'}
          </span>
        </button>

        {!isPlayingGame && (
          <>
            <button
              id="nav-achievements-btn"
              onClick={onOpenAchievements}
              title="명예의 전당 (업적)"
              className="h-[var(--ui-btn-h-nav)] min-h-[44px] sm:min-h-0 px-2 sm:px-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">업적</span>
            </button>

            <button
              id="nav-patchnotes-btn"
              onClick={onOpenPatchNotes}
              title="패치노트"
              className="h-[var(--ui-btn-h-nav)] min-h-[44px] sm:min-h-0 px-2 sm:px-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">패치노트</span>
            </button>
          </>
        )}

        <button
          id="nav-settings-btn"
          onClick={onOpenSettings}
          title="설정"
          className="h-[var(--ui-btn-h-nav)] min-h-[44px] sm:min-h-0 px-2 sm:px-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 hover:rotate-45 transition-transform shrink-0" />
          <span className="hidden md:inline whitespace-nowrap">설정</span>
        </button>

        {/* User Auth Profile / Google Login Button */}
        {user ? (
          <button
            id="nav-profile-btn"
            onClick={onOpenLoginModal}
            title={`${user.displayName || '게이머'} (${user.email || ''}) - 프로필 관리`}
            className="flex items-center gap-1.5 h-[var(--ui-btn-h-nav)] min-h-[44px] sm:min-h-0 px-2 sm:px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all shrink-0 whitespace-nowrap active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.15)]"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Avatar'}
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-full object-cover border border-emerald-400 shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-emerald-600/40 border border-emerald-400 flex items-center justify-center text-emerald-300 shrink-0">
                <UserIcon className="w-3 h-3" />
              </div>
            )}
            <span className="max-w-[70px] sm:max-w-[90px] truncate text-[11px] font-extrabold text-slate-100 whitespace-nowrap">
              {user.displayName || '게이머'}
            </span>
          </button>
        ) : (
          <button
            id="nav-login-btn"
            onClick={onOpenLoginModal}
            title="Google 계정으로 로그인하고 클라우드 동기화"
            className="h-[var(--ui-btn-h-nav)] min-h-[44px] sm:min-h-0 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white text-xs font-black shadow-[0_2px_14px_rgba(16,185,129,0.3)] transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#ffffff"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#ffffff"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#ffffff"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#ffffff"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span className="font-extrabold tracking-tight whitespace-nowrap">Google 로그인</span>
          </button>
        )}

        {currentScreen !== 'intro' && (
          <button
            id="nav-home-btn"
            onClick={onHome}
            title="메인 메뉴"
            className="h-[var(--ui-btn-h-nav)] min-h-[44px] sm:min-h-0 px-2.5 sm:px-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">메뉴</span>
          </button>
        )}
      </div>
    </header>
  );
};


