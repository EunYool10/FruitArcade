import React from 'react';
import { UserStatistics } from '../../types';
import { LevelInfo } from '../../utils/progress';
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

const StatTile: React.FC<{ icon: string; label: string; value: string; onClick?: () => void }> = ({
  icon,
  label,
  value,
  onClick,
}) => {
  const body = (
    <>
      <span className="block text-lg" aria-hidden="true">
        {icon}
      </span>
      <span className="block font-display text-lg leading-tight tabular-nums">{value}</span>
      <span className="block text-[11px] font-bold text-ink-3">{label}</span>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="well px-2 py-2.5 text-center transition-colors hover:bg-surface-3">
      {body}
    </button>
  ) : (
    <div className="well px-2 py-2.5 text-center">{body}</div>
  );
};

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
  const into = level.xp - level.floor;
  const span = level.next - level.floor;
  return (
    <section className="panel flex flex-col gap-4 p-5 sm:p-6" aria-label="내 정보">
      {/* Who: avatar, name with the blue check, level and title; editing sits in the corner */}
      <div className="flex items-start gap-3">
        <button type="button" className="shrink-0 rounded-full" onClick={onOpenProfile} aria-label={player.isGuest ? '로그인' : '프로필 편집'}>
          <Avatar player={player} size="lg" />
        </button>
        <div className="min-w-0 flex-1 pt-1">
          <p className="flex min-w-0 items-center gap-1.5 font-display text-xl leading-tight">
            <span className="truncate">{player.name}</span>
            {player.verified && <VerifiedBadge className="h-5 w-5" />}
          </p>
          <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-ink-2">
            <span className="shrink-0">
              <Emoji e={level.emoji} /> Lv.{level.level} <span className="text-ink-3">{level.title}</span>
            </span>
            {player.title && <TitleTag title={player.title} />}
          </p>
        </div>
        <button type="button" className={`btn btn-sm shrink-0 ${player.isGuest ? 'btn-primary' : ''}`} onClick={onOpenProfile}>
          {player.isGuest ? '로그인' : '✏️ 편집'}
        </button>
      </div>

      {/* What to do: coins open the shop, friends open the friends window */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn btn-sm btn-mango w-full justify-between px-3"
          onClick={onOpenShop}
          aria-label={`${Number.isFinite(coins) ? `코인 ${formatNumber(coins)}개` : '코인 무한'} · 상점 열기`}
        >
          <span>🪙 {formatCompact(coins)}</span>
          <span className="text-xs opacity-80">상점 ›</span>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-soda relative w-full justify-between px-3"
          onClick={onOpenFriends}
          aria-label={friendBadge ? `친구 (새 소식 ${friendBadge}개)` : '친구'}
        >
          <span>👥 친구</span>
          {friendBadge > 0 ? (
            <span className="rounded-full bg-berry px-1.5 text-[11px] font-bold text-white">{friendBadge > 9 ? '9+' : friendBadge}</span>
          ) : (
            <span className="text-xs opacity-80">›</span>
          )}
        </button>
      </div>

      <div>
        <div className="mb-1.5 flex justify-between text-xs font-bold text-ink-2">
          <span>경험치</span>
          <span className="tabular-nums">
            {into} / {span} XP
          </span>
        </div>
        <Meter value={into} max={span} label="경험치" />
        <p className="mt-1.5 text-xs text-ink-3">다음 레벨까지 {level.next - level.xp} XP</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <StatTile icon="🏆" label="업적" value={`${achievementCount}/${ACHIEVEMENT_COUNT}`} onClick={onOpenAchievements} />
        <StatTile icon="🎮" label="플레이" value={`${stats.totalPlayCount}판`} onClick={onOpenRecords} />
        <StatTile icon="🔥" label="연속 출석" value={`${streak}일`} />
        <StatTile icon="🏅" label="도장" value={`${stats.missionStamps}개`} />
      </div>

      {player.isGuest && <p className="text-xs text-ink-3">💡 로그인하면 기록과 업적이 클라우드에 저장돼요.</p>}
    </section>
  );
};
