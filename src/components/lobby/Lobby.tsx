import React from 'react';
import { BarChart3, Crown, Play } from 'lucide-react';
import { PlayerView } from '../ui/Avatar';
import { GameType, HistoryEntry, UserStatistics } from '../../types';
import { APP_VERSION, GAMES, GAME_ORDER } from '../../constants';
import { LevelInfo, bestKey, playsKey } from '../../utils/progress';
import { DailyState } from '../../utils/missions';
import { PlayerCard } from './PlayerCard';
import { GameCard } from './GameCard';
import { MissionsCard } from './MissionsCard';
import { RecentPlays } from './RecentPlays';
import { applyUpdate, promptInstall, usePwa } from '../../utils/pwa';

export type LobbyTarget = 'profile' | 'achievements' | 'records' | 'patch' | 'credits' | 'settings' | 'leaderboard' | 'feedback' | 'shop';

interface LobbyProps {
  player: PlayerView;
  streak: number;
  stats: UserStatistics;
  history: HistoryEntry[];
  daily: DailyState;
  level: LevelInfo;
  achievementCount: number;
  /** Shop coins to spend */
  coins: number;
  onPlay: (game: GameType, quick?: boolean) => void;
  onOpen: (target: LobbyTarget) => void;
}

const tilt = (deg: number, delay = 0) => ({ '--tilt': `${deg}deg`, animationDelay: `${delay}s` }) as React.CSSProperties;

export const Lobby: React.FC<LobbyProps> = ({ player, streak, stats, history, daily, level, achievementCount, coins, onPlay, onOpen }) => {
  const lastGame = history[0]?.game;
  const quick: GameType = lastGame ?? 'suika';
  const pwa = usePwa();

  return (
    <div className="mx-auto w-full max-w-[1080px] space-y-7 py-2 sm:space-y-9">
      {pwa.updateReady && (
        <div role="status" className="panel flex items-center gap-3 bg-soda-soft p-3 sm:p-4">
          <span className="text-2xl" aria-hidden="true">
            ✨
          </span>
          <p className="flex-1 text-sm font-bold">새 버전이 나왔어요!</p>
          <button type="button" className="btn btn-sm btn-soda" onClick={applyUpdate}>
            새로고침
          </button>
        </div>
      )}

      <section className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Hero */}
        <div className="panel relative flex min-h-[250px] flex-col justify-center overflow-hidden bg-mango-soft p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <span className="absolute right-5 top-4 text-5xl animate-float sm:right-10 sm:text-6xl" style={tilt(12)}>
              🍉
            </span>
            <span className="absolute bottom-5 right-20 text-4xl animate-float sm:right-32 sm:text-5xl" style={tilt(-10, -1.2)}>
              🍊
            </span>
            <span className="absolute bottom-16 right-4 text-3xl animate-float sm:right-10 sm:text-4xl" style={tilt(8, -2.1)}>
              🍒
            </span>
          </div>
          <span className="chip relative w-fit bg-surface">🍓 상큼 과일 아케이드 존</span>
          <h1 className="hero-title relative mt-3 font-display text-5xl leading-[0.95] sm:text-6xl">
            FRUIT
            <br />
            ARCADE
          </h1>
          <p className="relative mt-3 max-w-xs text-sm text-ink-2 sm:max-w-sm sm:text-base">
            과일 게임 네 가지에 매일 바뀌는 미션, 업적, 친구 대결까지. 오늘도 상큼하게 한 판!
          </p>
          <div className="relative mt-5 flex flex-wrap gap-3">
            <button type="button" className="btn btn-lg btn-primary" onClick={() => onPlay(quick, true)}>
              <Play className="h-5 w-5 fill-current" />
              {lastGame ? `${GAMES[quick].short} 한 판 더` : '바로 시작'}
            </button>
            <button type="button" className="btn btn-lg btn-mango" onClick={() => onOpen('leaderboard')}>
              <Crown className="h-5 w-5" strokeWidth={2.5} /> 랭킹
            </button>
            <button type="button" className="btn btn-lg hidden sm:inline-flex" onClick={() => onOpen('records')}>
              <BarChart3 className="h-5 w-5" strokeWidth={2.5} /> 내 기록
            </button>
          </div>
        </div>

        <PlayerCard
          player={player}
          streak={streak}
          level={level}
          stats={stats}
          achievementCount={achievementCount}
          coins={coins}
          onOpenShop={() => onOpen('shop')}
          onOpenProfile={() => onOpen('profile')}
          onOpenAchievements={() => onOpen('achievements')}
          onOpenRecords={() => onOpen('records')}
        />
      </section>

      <section aria-labelledby="games-title">
        <h2 id="games-title" className="mb-3 font-display text-2xl">
          게임 고르기
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {GAME_ORDER.map((g) => (
            <GameCard key={g} meta={GAMES[g]} best={stats[bestKey(g)]} plays={stats[playsKey(g)]} onPlay={() => onPlay(g)} />
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <MissionsCard daily={daily} streak={streak} />
        <RecentPlays history={history} onOpenRecords={() => onOpen('records')} />
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-2 text-sm font-semibold text-ink-3">
        <button type="button" className="underline-offset-4 hover:text-ink hover:underline" onClick={() => onOpen('patch')}>
          패치노트
        </button>
        <button type="button" className="underline-offset-4 hover:text-ink hover:underline" onClick={() => onOpen('credits')}>
          크레딧
        </button>
        <button type="button" className="underline-offset-4 hover:text-ink hover:underline" onClick={() => onOpen('feedback')}>
          의견 보내기
        </button>
        {!pwa.installed && (pwa.canInstall || pwa.ios) && (
          <button
            type="button"
            className="chip bg-soda-soft text-ink hover:bg-soda"
            onClick={() => (pwa.canInstall ? promptInstall() : onOpen('settings'))}
          >
            📲 앱으로 설치
          </button>
        )}
        <span className="font-display">v{APP_VERSION}</span>
      </footer>
    </div>
  );
};
