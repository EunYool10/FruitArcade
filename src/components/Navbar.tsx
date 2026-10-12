import React from 'react';
import { ArrowLeft, BarChart3, Pause, Settings, Trophy, Volume2, VolumeX } from 'lucide-react';
import { User } from 'firebase/auth';
import { GameSettings, ScreenType } from '../types';
import { GAMES, SCREEN_GAME } from '../constants';
import { LevelInfo } from '../utils/progress';
import { Avatar } from './ui/Avatar';

export type NavTarget = 'settings' | 'profile' | 'achievements' | 'records';

interface Props {
  screen: ScreenType;
  roundActive: boolean;
  settings: GameSettings;
  user: User | null;
  level: LevelInfo;
  onHome: () => void;
  onPause: () => void;
  onToggleSound: () => void;
  onOpen: (target: NavTarget) => void;
}

const ICON = 'h-5 w-5';

export const Navbar: React.FC<Props> = ({
  screen,
  roundActive,
  settings,
  user,
  level,
  onHome,
  onPause,
  onToggleSound,
  onOpen,
}) => {
  const game = SCREEN_GAME[screen];
  const inLobby = screen === 'lobby';

  return (
    <header className="w-full shrink-0">
      <div className="mx-auto flex h-16 max-w-[1080px] items-center gap-2 px-4 short:h-14 sm:px-6">
        {inLobby ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="sticker h-10 w-10 shrink-0 -rotate-6 bg-berry text-xl" aria-hidden="true">
              🍓
            </span>
            <span className="truncate font-display text-lg tracking-tight max-[380px]:hidden sm:text-xl">FRUIT ARCADE</span>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2.5">
            {roundActive ? (
              <button type="button" onClick={onPause} className="btn btn-icon btn-mango" aria-label="일시정지 (ESC)">
                <Pause className={ICON} strokeWidth={3} />
              </button>
            ) : (
              <button type="button" onClick={onHome} className="btn btn-icon" aria-label="로비로">
                <ArrowLeft className={ICON} strokeWidth={3} />
              </button>
            )}
            {game && (
              <span className="flex min-w-0 items-center gap-2">
                <span className="text-2xl" aria-hidden="true">
                  {GAMES[game].emoji}
                </span>
                <span className="truncate font-display text-lg">{GAMES[game].name}</span>
              </span>
            )}
          </div>
        )}

        <nav className="ml-auto flex shrink-0 items-center gap-2" aria-label="빠른 메뉴">
          {inLobby && (
            <>
              <button type="button" className="btn btn-icon hidden sm:inline-flex" onClick={() => onOpen('records')} aria-label="내 기록">
                <BarChart3 className={ICON} strokeWidth={2.5} />
              </button>
              <button type="button" className="btn btn-icon hidden sm:inline-flex" onClick={() => onOpen('achievements')} aria-label="업적">
                <Trophy className={ICON} strokeWidth={2.5} />
              </button>
            </>
          )}
          <button
            type="button"
            className="btn btn-icon"
            onClick={onToggleSound}
            aria-label={settings.sfxEnabled ? '효과음 끄기' : '효과음 켜기'}
            aria-pressed={settings.sfxEnabled}
          >
            {settings.sfxEnabled ? <Volume2 className={ICON} strokeWidth={2.5} /> : <VolumeX className={`${ICON} text-berry-ink`} strokeWidth={2.5} />}
          </button>
          <button type="button" className="btn btn-icon" onClick={() => onOpen('settings')} aria-label="설정">
            <Settings className={ICON} strokeWidth={2.5} />
          </button>
          {!roundActive && (
            <button
              type="button"
              className="btn h-11 gap-2 px-1.5 sm:pr-3"
              onClick={() => onOpen('profile')}
              aria-label={user ? `내 프로필 (Lv.${level.level})` : '로그인'}
            >
              <Avatar user={user} emoji={level.emoji} size="sm" />
              <span className="hidden text-sm sm:inline">{user ? `Lv.${level.level}` : '로그인'}</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
