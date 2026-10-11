import React, { useState } from 'react';
import { AlertCircle, Loader2, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';
import { UserStatistics } from '../../types';
import { GAMES, GAME_ORDER, TONE } from '../../constants';
import { LevelInfo, bestKey } from '../../utils/progress';
import { ACHIEVEMENT_COUNT } from '../../utils/achievements';
import { formatNumber, formatTime } from '../../utils/format';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Meter } from '../ui/Meter';
import { ConfirmButton } from '../ui/ConfirmButton';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  stats: UserStatistics;
  level: LevelInfo;
  achievementCount: number;
  onLogin: () => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
}

const GoogleIcon = () => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
  </svg>
);

const PERKS = [
  { icon: '☁️', title: '어디서나 이어하기', desc: '기기를 바꿔도 기록과 업적이 그대로예요.' },
  { icon: '🏆', title: '업적 · 레벨 보관', desc: '모은 업적과 경험치가 계정에 저장돼요.' },
  { icon: '🔒', title: '내 데이터는 나만', desc: '본인 계정으로만 읽고 쓸 수 있어요.' },
];

export const ProfileModal: React.FC<Props> = ({ isOpen, onClose, user, stats, level, achievementCount, onLogin, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setError(null);
    setLoading(true);
    const res = await onLogin();
    setLoading(false);
    if (!res.success) setError(res.error || 'Google 로그인 중 문제가 발생했어요.');
  };

  const close = () => {
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? undefined : close}
      title={user ? '내 프로필' : '로그인'}
      subtitle={user ? '기록이 클라우드에 저장되고 있어요' : 'Google 계정으로 기록을 안전하게 보관하세요'}
      icon={user ? '😎' : '👋'}
      tone="melon"
    >
      {error && (
        <div role="alert" className="mb-3 flex items-start gap-2.5 rounded-2xl border-2 border-line bg-berry-soft p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-berry-ink" strokeWidth={2.5} />
          <div>
            <p className="font-bold text-berry-ink">로그인하지 못했어요</p>
            <p className="text-xs text-ink-2">{error}</p>
          </div>
        </div>
      )}

      {user ? (
        <div className="space-y-3">
          <div className="well flex items-center gap-3 p-3.5">
            <Avatar user={user} emoji={level.emoji} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-display text-xl">{user.displayName || '게이머'}</p>
              <p className="truncate text-xs text-ink-3">{user.email}</p>
            </div>
          </div>

          <div className="well p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="chip bg-mango-soft">
                {level.emoji} Lv.{level.level} {level.title}
              </span>
              <span className="text-xs font-bold tabular-nums text-ink-2">
                {level.xp - level.floor} / {level.next - level.floor} XP
              </span>
            </div>
            <Meter value={level.xp - level.floor} max={level.next - level.floor} label="경험치" />
          </div>

          <dl className="grid grid-cols-2 gap-2">
            {[
              ['총 플레이', `${stats.totalPlayCount}판`],
              ['플레이 시간', formatTime(stats.totalPlayTime)],
              ['업적', `${achievementCount}/${ACHIEVEMENT_COUNT}`],
              ['미션 도장', `${stats.missionStamps}개`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border-2 border-line bg-surface-2 px-3 py-2">
                <dt className="text-[11px] font-bold text-ink-3">{k}</dt>
                <dd className="font-display text-lg tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-3 gap-2">
            {GAME_ORDER.map((g) => (
              <div key={g} className={`rounded-xl border-2 border-line px-2 py-2 text-center ${TONE[GAMES[g].tone].soft}`}>
                <p className="text-lg" aria-hidden="true">
                  {GAMES[g].emoji}
                </p>
                <p className="text-[11px] font-bold text-ink-2">{GAMES[g].short} 최고</p>
                <p className="font-display text-base tabular-nums">{stats[bestKey(g)] > 0 ? formatNumber(stats[bestKey(g)]) : '–'}</p>
              </div>
            ))}
          </div>

          <ConfirmButton
            className="btn w-full"
            question="로그아웃하면 이 기기의 기록이 비워져요. 다시 로그인하면 복원돼요."
            confirmLabel="로그아웃"
            onConfirm={onLogout}
          >
            <LogOut className="h-4 w-4" strokeWidth={2.5} /> 로그아웃
          </ConfirmButton>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={signIn}
            disabled={loading}
            className="btn btn-lg w-full bg-white text-[#1f1f1f] [--btn-bg:#fff] [--btn-fg:#1f1f1f]"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> 연결하는 중...
              </>
            ) : (
              <>
                <GoogleIcon /> Google로 계속하기
              </>
            )}
          </button>

          <ul className="space-y-2">
            {PERKS.map((p) => (
              <li key={p.title} className="well flex items-start gap-3 p-3">
                <span className="text-2xl" aria-hidden="true">
                  {p.icon}
                </span>
                <div>
                  <p className="text-sm font-bold">{p.title}</p>
                  <p className="text-xs text-ink-3">{p.desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-center text-xs text-ink-3">로그인하지 않아도 이 기기에 기록이 저장돼요.</p>
        </div>
      )}
    </Modal>
  );
};
