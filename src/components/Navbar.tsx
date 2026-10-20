import React from 'react';
import { ArrowLeft, BarChart3, Crown, Pause, Settings, Shield, ShoppingBag, Trophy, Users, Volume2, VolumeX } from 'lucide-react';
import { GameSettings, ScreenType } from '../types';
import { GAMES, SCREEN_GAME } from '../constants';
import { LevelInfo } from '../utils/progress';
import { Avatar, PlayerView } from './ui/Avatar';
import { Challenge } from '../utils/challenge';
import { formatNumber } from '../utils/format';
import { Emoji } from './ui/Emoji';

export type NavTarget = 'settings' | 'profile' | 'achievements' | 'records' | 'leaderboard' | 'admin' | 'shop' | 'friends';

interface Props {
  screen: ScreenType;
  roundActive: boolean;
  settings: GameSettings;
  player: PlayerView;
  level: LevelInfo;
  /** Friend challenge being played on this screen */
  challenge: Challenge | null;
  /** Shows the admin screen button */
  isAdmin: boolean;
  /** An admin testing as an ordinary player: a QA badge that opens the settings */
  qaMode?: boolean;
  /** Friend requests and gifts waiting */
  friendBadge: number;
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
  player,
  level,
  challenge,
  isAdmin,
  qaMode = false,
  friendBadge,
  onHome,
  onPause,
  onToggleSound,
  onOpen,
}) => {
  const game = SCREEN_GAME[screen];
  const soundOn = settings.sfxEnabled || settings.bgmEnabled;
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
                  <Emoji e={GAMES[game].emoji} />
                </span>
                {challenge ? (
                  <span className="chip truncate bg-berry-soft text-sm">
                    🥊 {challenge.n} {formatNumber(challenge.sc)}점
                  </span>
                ) : (
                  <span className="truncate font-display text-lg">{GAMES[game].name}</span>
                )}
              </span>
            )}
          </div>
        )}

        <nav className="ml-auto flex shrink-0 items-center gap-2" aria-label="빠른 메뉴">
          {inLobby && qaMode && (
            <button
              type="button"
              className="chip h-9 shrink-0 bg-grape-deep px-3 text-white shadow-hard-sm"
              onClick={() => onOpen('settings')}
              aria-label="QA 모드 켜짐: 일반 사용자처럼 테스트 중 (설정에서 끄기)"
              title="일반 사용자처럼 테스트 중이에요. 설정에서 끌 수 있어요"
            >
              🧪 QA
            </button>
          )}
          {inLobby && isAdmin && (
            <button type="button" className="btn btn-icon btn-grape" onClick={() => onOpen('admin')} aria-label="관리자 화면">
              <Shield className={ICON} strokeWidth={2.5} />
            </button>
          )}
          {inLobby && (
            <>
              <button
                type="button"
                className="btn btn-icon relative hidden sm:inline-flex"
                onClick={() => onOpen('friends')}
                aria-label={friendBadge ? `친구 (새 소식 ${friendBadge}개)` : '친구'}
              >
                <Users className={ICON} strokeWidth={2.5} />
                {friendBadge > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-line bg-berry px-1 text-[10px] font-bold text-white">
                    {friendBadge > 9 ? '9+' : friendBadge}
                  </span>
                )}
              </button>
              <button type="button" className="btn btn-icon hidden sm:inline-flex" onClick={() => onOpen('shop')} aria-label="상점">
                <ShoppingBag className={ICON} strokeWidth={2.5} />
              </button>
              <button type="button" className="btn btn-icon hidden sm:inline-flex" onClick={() => onOpen('leaderboard')} aria-label="랭킹">
                <Crown className={ICON} strokeWidth={2.5} />
              </button>
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
            aria-label={soundOn ? '소리 끄기' : '소리 켜기'}
            aria-pressed={soundOn}
          >
            {soundOn ? <Volume2 className={ICON} strokeWidth={2.5} /> : <VolumeX className={`${ICON} text-berry-ink`} strokeWidth={2.5} />}
          </button>
          <button type="button" className="btn btn-icon" onClick={() => onOpen('settings')} aria-label="설정">
            <Settings className={ICON} strokeWidth={2.5} />
          </button>
          {!roundActive && (
            <button
              type="button"
              className="btn h-11 gap-2 px-1.5 sm:pr-3"
              onClick={() => onOpen('profile')}
              aria-label={player.isGuest ? '로그인' : `내 프로필 (Lv.${level.level})`}
            >
              <Avatar player={player} size="sm" />
              <span className="hidden text-sm sm:inline">{player.isGuest ? '로그인' : `Lv.${level.level}`}</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
