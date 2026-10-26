import React, { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { AVATARS, PlayerProfile } from '../../utils/profile';
import { ShopItem, shopItem } from '../../utils/shop';
import { WEEKLY_CHAMPION, type TitleDef } from '../../utils/titles';
import { Avatar, Framed, PlayerView } from '../ui/Avatar';
import { Emoji } from '../ui/Emoji';

// 내 프로필 → 아바타 · 테두리 · 칭호: what the player has, ready to put on

/** Where a title comes from, for its badge and the filters */
type Source = 'achievement' | 'shop' | 'level' | 'rgb' | 'staff' | 'champion';

const SOURCE: Record<Source, { label: string; chip: string }> = {
  achievement: { label: '업적', chip: 'bg-mango-soft' },
  shop: { label: '상점', chip: 'bg-soda-soft' },
  level: { label: '레벨', chip: 'bg-grape-soft' },
  rgb: { label: 'RGB', chip: 'bg-[#1b1430] text-white' },
  staff: { label: '운영진', chip: 'bg-[#1e3a8a] text-white' },
  champion: { label: '챔피언', chip: 'bg-mango text-on-bright' },
};

function sourceOf(t: TitleDef): Source {
  if (t.staff) return 'staff';
  if (t.id === WEEKLY_CHAMPION) return 'champion';
  const item = shopItem(t.id);
  if (item?.rgb) return 'rgb';
  if (item?.level) return 'level';
  return item ? 'shop' : 'achievement';
}

/** A ticked corner on whatever is worn */
const Worn = () => (
  <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 border-line bg-melon text-white">
    <Check className="h-3 w-3" strokeWidth={4} />
  </span>
);

const cell = (on: boolean) =>
  `relative flex flex-col items-center gap-1 rounded-2xl border-2 border-line p-2 text-center transition-all hover:-translate-y-0.5 ${
    on ? 'bg-melon-soft shadow-hard-sm' : 'bg-surface'
  }`;

const EmptyNote: React.FC<{ text: string; onOpenShop: () => void }> = ({ text, onOpenShop }) => (
  <p className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-xs text-ink-3">
    {text}
    <button type="button" className="font-bold text-grape-ink underline-offset-2 hover:underline" onClick={onOpenShop}>
      🛍️ 상점 가기
    </button>
  </p>
);

interface Props {
  tab: 'avatar' | 'frame' | 'title';
  player: PlayerView;
  /** The look with the default avatar (Google photo or the level fruit) */
  defaultLook: PlayerView;
  profile: PlayerProfile;
  onUpdateProfile: (p: PlayerProfile) => void;
  titles: TitleDef[];
  /** Avatars and frames the player has (bought, level rewards, gifts, 운영진) */
  avatarItems: ShopItem[];
  frameItems: ShopItem[];
  onOpenShop: () => void;
}

export const ProfileEquip: React.FC<Props> = ({ tab, player, defaultLook, profile, onUpdateProfile, titles, avatarItems, frameItems, onOpenShop }) => {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<Source | 'all'>('all');

  const sources = useMemo(() => {
    const count = new Map<Source, number>();
    for (const t of titles) count.set(sourceOf(t), (count.get(sourceOf(t)) ?? 0) + 1);
    return (Object.keys(SOURCE) as Source[]).filter((s) => count.has(s)).map((s) => [s, count.get(s)!] as const);
  }, [titles]);

  if (tab === 'avatar') {
    const extra = avatarItems.filter((i) => i.icon && !AVATARS.includes(i.icon));
    return (
      <div className="space-y-3">
        <section>
          <p className="mb-1.5 text-[11px] font-bold text-ink-3">기본 · 무료 과일</p>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-7" role="group" aria-label="무료 아바타">
            <button type="button" aria-pressed={!profile.avatar} aria-label="기본 아바타" onClick={() => onUpdateProfile({ ...profile, avatar: '' })} className={cell(!profile.avatar)}>
              <Avatar player={defaultLook} size="sm" />
              <span className="text-[10px] font-bold text-ink-2">기본</span>
              {!profile.avatar && <Worn />}
            </button>
            {AVATARS.map((a) => (
              <button key={a} type="button" aria-pressed={profile.avatar === a} aria-label={`아바타 ${a}`} onClick={() => onUpdateProfile({ ...profile, avatar: a })} className={cell(profile.avatar === a)}>
                <span className="text-2xl leading-8">{a}</span>
                {profile.avatar === a && <Worn />}
              </button>
            ))}
          </div>
        </section>
        <section>
          <p className="mb-1.5 text-[11px] font-bold text-ink-3">내 아바타 {extra.length > 0 && `(${extra.length})`}</p>
          {extra.length ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="group" aria-label="내 아바타">
              {extra.map((i) => {
                const on = profile.avatar === i.icon;
                return (
                  <button key={i.id} type="button" aria-pressed={on} onClick={() => onUpdateProfile({ ...profile, avatar: i.icon! })} className={cell(on)}>
                    <span className="text-3xl leading-9">
                      <Emoji e={i.icon!} />
                    </span>
                    <span className="w-full truncate text-[10px] font-bold text-ink-2">{i.name}</span>
                    {on && <Worn />}
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyNote text="아직 산 아바타가 없어요." onOpenShop={onOpenShop} />
          )}
        </section>
      </div>
    );
  }

  if (tab === 'frame') {
    const face = (frame: string) => (
      <Framed frame={frame}>
        <Avatar player={{ ...player, frame: '' }} size="md" />
      </Framed>
    );
    return (
      <div className="space-y-3">
        <p className="text-[11px] font-bold text-ink-3">프로필 · 랭킹 · 친구 목록에서 아바타를 둘러싸요</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label="테두리">
          <button type="button" aria-pressed={!profile.frame} onClick={() => onUpdateProfile({ ...profile, frame: '' })} className={cell(!profile.frame)}>
            {face('')}
            <span className="text-[11px] font-bold">테두리 없음</span>
            {!profile.frame && <Worn />}
          </button>
          {frameItems.map((i) => {
            const on = profile.frame === i.id;
            return (
              <button key={i.id} type="button" aria-pressed={on} onClick={() => onUpdateProfile({ ...profile, frame: i.id })} className={cell(on)}>
                {face(i.id)}
                <span className={`w-full truncate text-[11px] font-bold ${i.rgb ? 'rgb-text' : ''}`}>{i.name}</span>
                {on && <Worn />}
              </button>
            );
          })}
        </div>
        {frameItems.length === 0 && <EmptyNote text="아직 가진 테두리가 없어요." onOpenShop={onOpenShop} />}
      </div>
    );
  }

  // Titles: search and filter by where they come from
  const q = query.trim().toLowerCase();
  const list = titles.filter((t) => (source === 'all' || sourceOf(t) === source) && (!q || t.label.toLowerCase().includes(q)));
  return (
    <div className="space-y-2.5">
      <label className="relative block">
        <span className="sr-only">칭호 찾기</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" strokeWidth={2.5} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`칭호 ${titles.length}개 중에서 찾기`}
          className="h-10 w-full select-text rounded-xl border-2 border-line bg-surface pl-9 pr-9 text-sm outline-none focus:border-grape"
        />
        {query && (
          <button type="button" className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:bg-surface-3" onClick={() => setQuery('')} aria-label="지우기">
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </label>
      <div role="group" aria-label="칭호 종류" className="flex gap-1.5 overflow-x-auto pb-0.5">
        {[['all', titles.length] as const, ...sources].map(([s, n]) => (
          <button
            key={s}
            type="button"
            aria-pressed={source === s}
            onClick={() => setSource(s)}
            className={`chip h-8 shrink-0 px-3 text-xs ${source === s ? 'bg-grape text-white shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'}`}
          >
            {s === 'all' ? '전체' : SOURCE[s].label} <span className="opacity-70">{n}</span>
          </button>
        ))}
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        <li>
          <button
            type="button"
            aria-pressed={!profile.title}
            onClick={() => onUpdateProfile({ ...profile, title: '' })}
            className={`flex w-full items-center gap-2.5 rounded-xl border-2 border-line px-3 py-2 text-left text-sm font-bold ${!profile.title ? 'bg-melon-soft shadow-hard-sm' : 'bg-surface hover:bg-surface-3'}`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-3">–</span>
            <span className="flex-1">칭호 없음</span>
            {!profile.title && <Check className="h-4 w-4 text-melon-ink" strokeWidth={3.5} />}
          </button>
        </li>
        {list.map((t) => {
          const on = profile.title === t.id;
          const src = SOURCE[sourceOf(t)];
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onUpdateProfile({ ...profile, title: t.id })}
                className={`flex w-full items-center gap-2.5 rounded-xl border-2 border-line px-3 py-2 text-left ${on ? 'bg-melon-soft shadow-hard-sm' : 'bg-surface hover:bg-surface-3'}`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-lg">
                  <Emoji e={t.icon} />
                </span>
                <span className={`min-w-0 flex-1 truncate text-sm font-bold ${t.rgb ? 'rgb-text' : ''}`}>{t.label}</span>
                <span className={`chip h-5 shrink-0 px-1.5 text-[10px] ${src.chip}`}>{src.label}</span>
                {on && <Check className="h-4 w-4 shrink-0 text-melon-ink" strokeWidth={3.5} />}
              </button>
            </li>
          );
        })}
      </ul>
      {list.length === 0 && <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-center text-xs text-ink-3">맞는 칭호가 없어요.</p>}
    </div>
  );
};
