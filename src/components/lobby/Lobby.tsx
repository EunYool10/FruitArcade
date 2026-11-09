import React, { useState } from 'react';
import { BarChart3, Crown, Play } from 'lucide-react';
import { PlayerView } from '../ui/Avatar';
import { GameType, HistoryEntry, UserStatistics } from '../../types';
import { APP_VERSION, GAMES, GAME_ORDER, GameMeta } from '../../constants';
import { LevelInfo, bestKey, playsKey } from '../../utils/progress';
import { DailyState } from '../../utils/missions';
import { PlayerCard } from './PlayerCard';
import { GameCard } from './GameCard';
import { MissionsCard } from './MissionsCard';
import { RecentPlays } from './RecentPlays';
import { applyUpdate, promptInstall, usePwa } from '../../utils/pwa';
import { Emoji } from '../ui/Emoji';

export type LobbyTarget = 'profile' | 'achievements' | 'records' | 'patch' | 'credits' | 'settings' | 'leaderboard' | 'feedback' | 'shop' | 'terms' | 'friends' | 'apps';

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
  /** Friend requests and gifts waiting */
  friendBadge: number;
  onPlay: (game: GameType, quick?: boolean) => void;
  onOpen: (target: LobbyTarget) => void;
}

type Kind = 'all' | GameMeta['kind'];
const KINDS: [Kind, string][] = [
  ['all', '전체'],
  ['reflex', '순발력'],
  ['brain', '두뇌'],
  ['party', '여럿이'],
];

/** Plain text links along the bottom of the lobby */
const FOOTER_LINK = 'underline-offset-4 hover:text-ink hover:underline';

/** What's in the lobby's crate, with a slight lean each; the grapes only fit on the wide phone crate */
const CRATE_FRUIT: [string, number][] = [
  ['🍉', -8],
  ['🍎', 5],
  ['🍇', -4],
  ['🍓', -6],
  ['🍊', 8],
];

export const Lobby: React.FC<LobbyProps> = ({ player, streak, stats, history, daily, level, achievementCount, coins, friendBadge, onPlay, onOpen }) => {
  const lastGame = history[0]?.game;
  const quick: GameType = lastGame ?? 'suika';
  const pwa = usePwa();
  const [kind, setKind] = useState<Kind>('all');
  const shown = GAME_ORDER.filter((g) => kind === 'all' || GAMES[g].kind === kind);

  return (
    <div className="mx-auto w-full max-w-[1080px] space-y-7 py-2 sm:space-y-9">
      {pwa.updateReady && (
        <div role="status" className="panel flex items-center gap-3 bg-soda-soft p-3 sm:p-4">
          <span className="text-2xl" aria-hidden="true">
            ✨
          </span>
          <p className="flex-1 text-sm font-bold">새 버전이 나왔어요! 잠시 뒤 자동으로 바뀌어요</p>
          <button type="button" className="btn btn-sm btn-soda" onClick={applyUpdate}>
            지금 바꾸기
          </button>
        </div>
      )}

      {/* grid-cols-1 (minmax(0,1fr)): an implicit auto column grows to its widest content and pushes the panels off the right edge on narrow phones */}
      <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Hero */}
        {/* Hero: the shop front. A striped awning, the painted sign, and a crate of fruit on the counter */}
        <div className="panel relative flex min-h-[280px] flex-col overflow-hidden">
          <div className="awning shrink-0" aria-hidden="true" />
          {/* Phones: a crate the width of the counter along the bottom. Wider screens: one crate in the corner */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 sm:left-auto sm:right-6 sm:w-[188px]" aria-hidden="true">
            <div className="relative h-[78px] sm:h-[100px]">
              {/* One row, evenly spaced; the crate is drawn after it, so the fruit sit inside */}
              <div className="absolute inset-x-4 bottom-[26px] flex items-end justify-between text-[38px] leading-none sm:inset-x-1 sm:bottom-[46px] sm:text-[44px]">
                {CRATE_FRUIT.map(([e, deg], i) => (
                  <span key={e} className={i === 2 ? 'sm:hidden' : ''} style={{ transform: `rotate(${deg}deg)` }}>
                    <Emoji e={e} />
                  </span>
                ))}
              </div>
              <div className="crate absolute inset-x-0 bottom-0 h-[36px] rounded-none sm:h-[58px] sm:rounded-t-[0.35rem]">
                <span className="hand absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-3deg] whitespace-nowrap rounded-sm bg-[#fff7e6] px-2 text-[13px] leading-5 text-[#7a4a1e] shadow-sm sm:text-[15px]">
                  오늘 들어온 과일
                </span>
              </div>
            </div>
          </div>
          <div className="relative flex flex-1 flex-col justify-center px-6 pb-[6.25rem] pt-9 sm:px-8 sm:pb-7 sm:pt-11">
            <p className="font-display text-sm tracking-[0.3em] text-berry-ink">FRUIT ARCADE</p>
            <h1 className="hero-title mt-1 font-display text-[2.9rem] leading-none sm:text-6xl">과일 아케이드</h1>
            <p className="hand mt-2 text-xl text-ink-2 sm:text-2xl">오늘도 신선하게 한 판!</p>
            <p className="mt-2 max-w-[13.5rem] text-sm text-ink-3 sm:max-w-sm">
              과일 게임 {GAME_ORDER.length}가지, 매일 바뀌는 미션과 업적, 친구 대결까지.
            </p>
          <div className="relative mt-5 grid grid-cols-[1fr_auto] gap-2.5 sm:flex sm:flex-wrap sm:gap-3 sm:pr-[200px] lg:pr-[180px]">
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
        </div>

        <PlayerCard
          player={player}
          streak={streak}
          level={level}
          stats={stats}
          achievementCount={achievementCount}
          coins={coins}
          friendBadge={friendBadge}
          onOpenShop={() => onOpen('shop')}
          onOpenFriends={() => onOpen('friends')}
          onOpenProfile={() => onOpen('profile')}
          onOpenAchievements={() => onOpen('achievements')}
          onOpenRecords={() => onOpen('records')}
        />
      </section>

      <section aria-labelledby="games-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 id="games-title" className="flex items-baseline gap-2 font-display text-[1.7rem] leading-none">
            게임 진열대
            <span className="hand text-base text-ink-3">골라 담아 보세요</span>
          </h2>
          {/* Filter by kind, so a long list stays easy to scan */}
          <div role="tablist" aria-label="게임 종류" className="well grid w-full grid-cols-4 gap-1 p-1 sm:flex sm:w-auto">
            {KINDS.map(([k, label]) => {
              const count = GAME_ORDER.filter((g) => k === 'all' || GAMES[g].kind === k).length;
              const on = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setKind(k)}
                  className={`flex h-8 shrink-0 items-center justify-center gap-1 rounded-[0.55rem] px-1 text-[13px] font-bold transition-colors sm:px-3.5 sm:text-sm ${on ? 'bg-surface text-ink shadow-hard-sm' : 'text-ink-2 hover:text-ink'}`}
                >
                  {label} <span className={`tabular-nums ${on ? 'opacity-70' : 'text-ink-3'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {shown.map((g) => (
            <GameCard key={g} meta={GAMES[g]} best={stats[bestKey(g)]} plays={stats[playsKey(g)]} onPlay={() => onPlay(g)} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MissionsCard daily={daily} streak={streak} stamps={stats.missionStamps} onPlay={(g) => onPlay(g)} />
        <RecentPlays history={history} onOpenRecords={() => onOpen('records')} onPlay={(g) => onPlay(g)} />
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-2 text-sm font-semibold text-ink-3">
        <button type="button" className={FOOTER_LINK} onClick={() => onOpen('patch')}>
          패치노트
        </button>
        <button type="button" className={FOOTER_LINK} onClick={() => onOpen('credits')}>
          크레딧
        </button>
        <button type="button" className={FOOTER_LINK} onClick={() => onOpen('feedback')}>
          의견 보내기
        </button>
        <button type="button" className={FOOTER_LINK} onClick={() => onOpen('terms')}>
          약관 · 개인정보
        </button>
        <button type="button" className={FOOTER_LINK} onClick={() => onOpen('apps')}>
          은율이의 다른 앱
        </button>
        {!pwa.installed && (pwa.canInstall || pwa.ios) && (
          <button type="button" className={FOOTER_LINK} onClick={() => (pwa.canInstall ? promptInstall() : onOpen('settings'))}>
            앱으로 설치
          </button>
        )}
        <span className="font-display">v{APP_VERSION}</span>
      </footer>
    </div>
  );
};
