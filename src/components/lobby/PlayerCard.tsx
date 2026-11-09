import React from 'react';
import { ChevronRight, Pencil } from 'lucide-react';
import { UserStatistics } from '../../types';
import { LevelInfo, levelIcon } from '../../utils/progress';
import { ACHIEVEMENT_COUNT } from '../../utils/achievements';
import { Avatar, PlayerView } from '../ui/Avatar';
import { TitleTag } from '../ui/TitleTag';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import { Meter } from '../ui/Meter';
import { formatCompact, formatNumber } from '../../utils/format';
import { Emoji } from '../ui/Emoji';

interface PlayerCardProps {
  player: PlayerView;
  streak: number;
  level: LevelInfo;
  stats: UserStatistics;
  achievementCount: number;
  coins: number;
  friendBadge: number;
  onOpenShop: () => void;
  onOpenFriends: () => void;
  onOpenProfile: () => void;
  onOpenAchievements: () => void;
  onOpenRecords: () => void;
}

/** One column of the ledger along the bottom of the card */
const Stat: React.FC<{ label: string; value: string; onClick?: () => void }> = ({ label, value, onClick }) => {
  const body = (
    <>
      <span className="block truncate font-display text-xl leading-tight tabular-nums">{value}</span>
      <span className="mt-0.5 block text-[11px] font-bold text-ink-3">{label}</span>
    </>
  );
  // The cell carries the divider; the button inside it can round its hover without bending the line
  return (
    <div className="min-w-0 px-1">
      {onClick ? (
        <button type="button" onClick={onClick} className="w-full rounded-lg py-1.5 text-center transition-colors hover:bg-surface-2">
          {body}
        </button>
      ) : (
        <div className="py-1.5 text-center">{body}</div>
      )}
    </div>
  );
};

/** Coins or friends: what it is, how much, and where it goes */
const Pocket: React.FC<{
  label: string;
  value: React.ReactNode;
  action: string;
  className: string;
  ariaLabel: string;
  onClick: () => void;
}> = ({ label, value, action, className, ariaLabel, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    className={`min-w-0 rounded-[0.8rem] border border-line px-3 py-2 text-left shadow-hard-sm transition-transform hover:-translate-y-px ${className}`}
  >
    {/* The action shares the label's line, so the value has the whole width even on the narrowest phones */}
    <span className="flex items-center justify-between gap-2 text-[11px] font-bold text-ink-2">
      <span>{label}</span>
      <span className="flex shrink-0 items-center">
        {action}
        <ChevronRight className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
      </span>
    </span>
    <span className="mt-0.5 block truncate font-display text-xl leading-tight tabular-nums">{value}</span>
  </button>
);

/** The player's card at the shop: who they are, their level, what's in their pocket and a short ledger */
export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  streak,
  level,
  stats,
  achievementCount,
  coins,
  friendBadge,
  onOpenShop,
  onOpenFriends,
  onOpenProfile,
  onOpenAchievements,
  onOpenRecords,
}) => {
  // At the top (Lv.100, or Lv.999 for admins) the bar stays full
  const into = level.max ? 1 : level.xp - level.floor;
  const span = level.max ? 1 : level.next - level.floor;
  return (
    <section className="panel flex flex-col justify-between gap-4 p-5 sm:p-6" aria-label="내 정보">
      {/* Who: avatar, name with the blue check, level and title; editing is a small pencil in the corner */}
      <div className="flex items-center gap-3.5">
        <button type="button" className="shrink-0 rounded-full" onClick={onOpenProfile} aria-label={player.isGuest ? '로그인' : '프로필 편집'}>
          <Avatar player={player} size="lg" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1.5 font-display text-2xl leading-tight max-[360px]:text-xl">
            <span className="truncate">{player.name}</span>
            {player.verified && <VerifiedBadge className="h-5 w-5 shrink-0" />}
          </p>
          <p className="mt-1 text-sm font-bold text-ink-2">
            <Emoji e={levelIcon(level)} /> Lv.{level.level} <span className="text-ink-3">{level.title}</span>
          </p>
          {player.title && (
            <p className="mt-1.5 flex">
              <TitleTag title={player.title} />
            </p>
          )}
        </div>
        {player.isGuest ? (
          <button type="button" className="btn btn-sm btn-primary shrink-0 self-start" onClick={onOpenProfile}>
            로그인
          </button>
        ) : (
          <button type="button" className="btn btn-sm btn-icon shrink-0 self-start" onClick={onOpenProfile} aria-label="프로필 편집" title="프로필 편집">
            <Pencil className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* How far to the next level, in one line above the bar */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs font-bold text-ink-2">
          <span>{level.max ? '최고 레벨' : `다음 레벨까지 ${formatNumber(level.next - level.xp)} XP`}</span>
          <span className="tabular-nums text-ink-3">{level.max ? `${formatNumber(level.xp)} XP` : `${formatNumber(into)} / ${formatNumber(span)}`}</span>
        </div>
        <Meter value={into} max={span} label="경험치" className="h-2.5" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Pocket
          label="코인"
          value={
            <>
              <Emoji e="🪙" className="mr-1" />
              {/* The sign face has no ∞ of its own and falls back to a tiny one */}
              {Number.isFinite(coins) ? formatCompact(coins) : <span className="font-sans text-2xl font-black leading-none">∞</span>}
            </>
          }
          action="상점"
          className="bg-mango-soft"
          ariaLabel={`${Number.isFinite(coins) ? `코인 ${formatNumber(coins)}개` : '코인 무한'} · 상점 열기`}
          onClick={onOpenShop}
        />
        <Pocket
          label="친구"
          value={friendBadge > 0 ? <span className="text-berry-ink">새 소식 {friendBadge > 9 ? '9+' : friendBadge}</span> : '함께 놀기'}
          action="보기"
          className="bg-soda-soft"
          ariaLabel={friendBadge ? `친구 (새 소식 ${friendBadge}개)` : '친구'}
          onClick={onOpenFriends}
        />
      </div>

      {/* A short ledger instead of four boxes */}
      <div className="grid grid-cols-4 divide-x divide-dashed divide-line border-t border-dashed border-line pt-2.5">
        <Stat label="업적" value={`${achievementCount}/${ACHIEVEMENT_COUNT}`} onClick={onOpenAchievements} />
        <Stat label="플레이" value={`${formatCompact(stats.totalPlayCount)}판`} onClick={onOpenRecords} />
        <Stat label="연속 출석" value={`${streak}일`} />
        <Stat label="도장" value={`${stats.missionStamps}개`} />
      </div>

      {player.isGuest && <p className="text-xs text-ink-3">로그인하면 기록과 업적이 클라우드에 저장돼요.</p>}
    </section>
  );
};
