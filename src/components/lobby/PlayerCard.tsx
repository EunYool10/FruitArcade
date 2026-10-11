import React from 'react';
import { User } from 'firebase/auth';
import { UserStatistics } from '../../types';
import { LevelInfo } from '../../utils/progress';
import { ACHIEVEMENT_COUNT } from '../../utils/achievements';
import { Avatar } from '../ui/Avatar';
import { Meter } from '../ui/Meter';

interface PlayerCardProps {
  user: User | null;
  level: LevelInfo;
  stats: UserStatistics;
  achievementCount: number;
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
  user,
  level,
  stats,
  achievementCount,
  onOpenProfile,
  onOpenAchievements,
  onOpenRecords,
}) => {
  const into = level.xp - level.floor;
  const span = level.next - level.floor;
  return (
    <section className="panel flex flex-col gap-4 p-5 sm:p-6" aria-label="내 정보">
      <div className="flex items-center gap-3">
        <Avatar user={user} emoji={level.emoji} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl">{user?.displayName || '게스트'}</p>
          <span className="chip mt-1 bg-mango-soft">
            {level.emoji} Lv.{level.level} {level.title}
          </span>
        </div>
        <button type="button" className="btn btn-sm" onClick={onOpenProfile}>
          {user ? '프로필' : '로그인'}
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

      <div className="grid grid-cols-3 gap-2">
        <StatTile icon="🏆" label="업적" value={`${achievementCount}/${ACHIEVEMENT_COUNT}`} onClick={onOpenAchievements} />
        <StatTile icon="🎮" label="플레이" value={`${stats.totalPlayCount}판`} onClick={onOpenRecords} />
        <StatTile icon="🏅" label="미션 도장" value={`${stats.missionStamps}개`} />
      </div>

      {!user && <p className="text-xs text-ink-3">💡 로그인하면 기록과 업적이 클라우드에 저장돼요.</p>}
    </section>
  );
};
