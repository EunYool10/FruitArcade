import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, LogOut, Pencil } from 'lucide-react';
import { User } from 'firebase/auth';
import { UserStatistics } from '../../types';
import { GAMES, GAME_ORDER, TONE } from '../../constants';
import { LevelInfo, bestKey } from '../../utils/progress';
import { ACHIEVEMENT_COUNT } from '../../utils/achievements';
import { formatNumber, formatPlayTime } from '../../utils/format';
import { Modal } from '../ui/Modal';
import { Avatar, PlayerView } from '../ui/Avatar';
import { NICKNAME_MAX, PlayerProfile, cleanNickname, isReservedNickname } from '../../utils/profile';
import { hasBadWords } from '../../utils/badWords';
import { googlePhotoOf } from '../../utils/ranking';
import { Meter } from '../ui/Meter';
import { ConfirmButton } from '../ui/ConfirmButton';
import type { TitleDef } from '../../utils/titles';
import { Emoji } from '../ui/Emoji';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import { TitleTag } from '../ui/TitleTag';
import type { ShopItem } from '../../utils/shop';
import { ProfileEquip } from './ProfileEquip';

type Tab = 'avatar' | 'frame' | 'title' | 'stats';

/** Total play time: "1시간 48분", "35분" */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  /** Admins may use staff-like nicknames and get a badge */
  isAdmin?: boolean;
  player: PlayerView;
  profile: PlayerProfile;
  onUpdateProfile: (p: PlayerProfile) => void;
  stats: UserStatistics;
  level: LevelInfo;
  achievementCount: number;
  /** Titles the player has earned */
  titles: TitleDef[];
  /** Avatars and frames the player has (bought, level rewards, gifts, 운영진) */
  avatarItems: ShopItem[];
  frameItems: ShopItem[];
  onLogin: () => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
  onOpenAdmin?: () => void;
  onOpenShop: () => void;
  onOpenTerms: () => void;
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

export const ProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  isAdmin = false,
  player,
  profile,
  onUpdateProfile,
  stats,
  level,
  achievementCount,
  titles,
  avatarItems,
  frameItems,
  onLogin,
  onLogout,
  onOpenAdmin,
  onOpenShop,
  onOpenTerms,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nickDraft, setNickDraft] = useState(profile.nickname);
  const [nickError, setNickError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('avatar');

  useEffect(() => {
    if (isOpen) {
      setNickDraft(profile.nickname);
      setNickError(null);
    }
  }, [isOpen, profile.nickname]);

  const commitNickname = () => {
    const nickname = cleanNickname(nickDraft);
    // Names like "Tester", "QA", "관리자" would look like staff, so only admins may use them
    if (nickname && !isAdmin && isReservedNickname(nickname)) {
      setNickError('Tester, QA, 관리자처럼 운영진으로 보이는 이름은 쓸 수 없어요.');
      setNickDraft(profile.nickname);
      return;
    }
    if (nickname && hasBadWords(nickname)) {
      setNickError('욕설이나 성적인 말이 들어간 닉네임은 쓸 수 없어요.');
      setNickDraft(profile.nickname);
      return;
    }
    setNickError(null);
    setNickDraft(nickname);
    if (nickname !== profile.nickname) onUpdateProfile({ ...profile, nickname });
  };
  // The default avatar: Google photo when signed in, otherwise the level fruit
  const defaultLook: PlayerView = { ...player, emoji: level.emoji, photo: googlePhotoOf(user) };

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

  // Email is only shown to its owner, and even then half hidden (screens get shared)
  const email = user?.email ? user.email.replace(/^(.{3}).*(@.*)$/, '$1***$2') : '';
  const tabs: [Tab, string][] = [
    ['avatar', '😀 아바타'],
    ['frame', '🖼️ 테두리'],
    ['title', '🏷️ 칭호'],
    ...(user ? ([['stats', '📊 기록']] as [Tab, string][]) : []),
  ];
  const shown = !user && tab === 'stats' ? 'avatar' : tab;

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? undefined : close}
      title="내 프로필"
      subtitle={user ? '기록이 클라우드에 저장되고 있어요' : '로그인하지 않아도 꾸밀 수 있어요'}
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

      {/* Who I am: avatar, name (edit in place), badges, level */}
      <section className="well mb-3 p-3.5" aria-label="내 정보">
        <div className="flex items-center gap-3">
          <Avatar player={player} size="lg" />
          <div className="min-w-0 flex-1">
            <label htmlFor="nickname" className="flex items-center gap-1 text-[11px] font-bold text-ink-3">
              <Pencil className="h-3 w-3" strokeWidth={2.5} /> 닉네임 (최대 {NICKNAME_MAX}자)
            </label>
            <div className="mt-0.5 flex items-center gap-1.5">
              <input
                id="nickname"
                value={nickDraft}
                maxLength={NICKNAME_MAX}
                placeholder={user?.displayName || '게스트'}
                onChange={(e) => setNickDraft(e.target.value)}
                onBlur={commitNickname}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="h-10 min-w-0 flex-1 select-text rounded-xl border-2 border-line bg-surface px-3 font-display text-lg outline-none focus:border-soda"
              />
              {player.verified && <VerifiedBadge className="h-6 w-6" />}
            </div>
            {nickError && (
              <p role="alert" className="mt-1 text-xs font-bold text-berry-ink">
                {nickError}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="chip h-6 bg-mango-soft px-2 text-[11px]">
                <Emoji e={level.emoji} /> Lv.{level.level} {level.title}
              </span>
              {player.title && <TitleTag title={player.title} />}
              {isAdmin && (
                <button type="button" className="chip h-6 bg-grape-deep px-2 text-[11px] text-white hover:bg-grape" onClick={onOpenAdmin} aria-label="관리자 화면 열기">
                  🛡️ 관리자
                </button>
              )}
              {email && (
                <span className="truncate text-[11px] text-ink-3" title="나에게만 보여요">
                  🔒 {email}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] font-bold text-ink-3">
            <span>경험치</span>
            <span className="tabular-nums">
              {level.max ? 'MAX' : `${level.xp - level.floor} / ${level.next - level.floor} XP`}
            </span>
          </div>
          <Meter value={level.max ? 1 : level.xp - level.floor} max={level.max ? 1 : level.next - level.floor} label="경험치" className="h-3" />
        </div>
        {user && <p className="mt-2 text-[11px] text-ink-3">🏆 랭킹 · 친구에게는 닉네임 · 아바타 · 칭호 · 테두리가 보여요. 기본 아바타는 Google 사진이에요.</p>}
      </section>

      <div role="tablist" aria-label="프로필 메뉴" className={`mb-3 grid gap-1.5 ${tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={shown === id}
            onClick={() => setTab(id)}
            className={`rounded-2xl border-2 border-line px-2 py-2 text-sm font-bold transition-all ${
              shown === id ? '-translate-y-0.5 bg-melon text-on-bright shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {shown !== 'stats' && (
        <ProfileEquip
          tab={shown}
          player={player}
          defaultLook={defaultLook}
          profile={profile}
          onUpdateProfile={onUpdateProfile}
          titles={titles}
          avatarItems={avatarItems}
          frameItems={frameItems}
          onOpenShop={onOpenShop}
        />
      )}

      {shown === 'stats' && user && (
        <div className="space-y-3">
          <dl className="grid grid-cols-2 gap-2">
            {[
              ['🎮 총 플레이', `${formatNumber(stats.totalPlayCount)}판`],
              ['⏱️ 플레이 시간', formatPlayTime(stats.totalPlayTime)],
              ['🏆 업적', `${achievementCount}/${ACHIEVEMENT_COUNT}`],
              ['🏅 미션 도장', `${stats.missionStamps}개`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border-2 border-line bg-surface-2 px-3 py-2">
                <dt className="text-[11px] font-bold text-ink-3">{k}</dt>
                <dd className="font-display text-lg">{v}</dd>
              </div>
            ))}
          </dl>
          <section>
            <p className="mb-1.5 text-[11px] font-bold text-ink-3">게임별 최고 기록</p>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {GAME_ORDER.map((g) => (
                <div key={g} className={`min-w-0 rounded-xl border-2 border-line px-1 py-2 text-center ${TONE[GAMES[g].tone].soft}`}>
                  <p className="text-lg" aria-hidden="true">
                    <Emoji e={GAMES[g].emoji} />
                  </p>
                  <p className="truncate text-[11px] font-bold text-ink-2">{GAMES[g].short}</p>
                  <p className="truncate font-display text-sm tabular-nums">{stats[bestKey(g)] > 0 ? formatNumber(stats[bestKey(g)]) : '–'}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {user ? (
        <ConfirmButton
          className="btn mt-4 w-full"
          question="로그아웃하면 이 기기의 기록이 비워져요. 다시 로그인하면 복원돼요."
          confirmLabel="로그아웃"
          onConfirm={onLogout}
        >
          <LogOut className="h-4 w-4" strokeWidth={2.5} /> 로그아웃
        </ConfirmButton>
      ) : (
        <div className="mt-4 space-y-3">
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
          <p className="text-center text-xs text-ink-3">
            로그인하면{' '}
            <button type="button" className="font-bold text-grape-ink underline underline-offset-2" onClick={onOpenTerms}>
              이용약관 · 개인정보 처리방침
            </button>
            에 동의하는 것으로 봐요.
          </p>
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
