import React, { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { AVATARS, PlayerProfile } from '../../utils/profile';
import { ShopItem, shopItem } from '../../utils/shop';
import { WEEKLY_CHAMPION, type TitleDef } from '../../utils/titles';
import { Avatar, Framed, PlayerView } from '../ui/Avatar';
import { Emoji } from '../ui/Emoji';

// 내 프로필 → 아바타 · 테두리 · 칭호: what the player has, ready to put on.
// Grids size their columns to the window (not the screen), so cells never get squeezed.

/** Where an item or title comes from, for its badge and the filters */
type Source = 'achievement' | 'shop' | 'level' | 'rgb' | 'staff' | 'champion';

const SOURCE: Record<Source, { label: string; chip: string }> = {
  achievement: { label: '업적', chip: 'bg-mango-soft' },
  shop: { label: '상점', chip: 'bg-soda-soft' },
  level: { label: '레벨', chip: 'bg-grape-soft' },
  rgb: { label: 'RGB', chip: 'bg-[#1b1430] text-white' },
  staff: { label: '운영진', chip: 'bg-[#1e3a8a] text-white' },
  champion: { label: '챔피언', chip: 'bg-mango text-on-bright' },
};

function titleSource(t: TitleDef): Source {
  if (t.staff) return 'staff';
  if (t.id === WEEKLY_CHAMPION) return 'champion';
  const item = shopItem(t.id);
  if (item?.rgb) return 'rgb';
  if (item?.level) return 'level';
  return item ? 'shop' : 'achievement';
}

const itemSource = (i: ShopItem): Source => (i.staff ? 'staff' : i.rgb ? 'rgb' : i.level ? 'level' : 'shop');

/** Special ones first: RGB, level rewards, 운영진, then the shop */
const ORDER: Source[] = ['rgb', 'level', 'staff', 'shop'];

/** The free fruit's names, in AVATARS order */
const FRUIT_NAMES = ['딸기', '수박', '귤', '레몬', '포도', '복숭아', '체리', '파인애플', '키위', '사과', '블루베리', '코코넛'];

/** A ticked corner on whatever is worn */
const Worn = () => (
  <span className="absolute -right-1.5 -top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full border-2 border-line bg-melon text-white">
    <Check className="h-3 w-3" strokeWidth={4} />
  </span>
);

/** One choice in a grid: a picture on top, its name underneath, a badge in the corner */
const Cell: React.FC<{ on: boolean; label: string; badge?: string; badgeClass?: string; ariaLabel?: string; onClick: () => void; children: React.ReactNode }> = ({
  on,
  label,
  badge,
  badgeClass = '',
  ariaLabel,
  onClick,
  children,
}) => (
  <button
    type="button"
    aria-pressed={on}
    aria-label={ariaLabel ?? label}
    onClick={onClick}
    className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 border-line px-1 pb-1.5 pt-2 transition-all hover:-translate-y-0.5 ${
      on ? 'bg-melon-soft shadow-hard-sm' : 'bg-surface hover:bg-surface-2'
    }`}
  >
    <span className="grid h-12 w-12 place-items-center text-[32px] leading-none">{children}</span>
    <span className="w-full truncate px-0.5 text-center text-[11px] font-bold leading-tight text-ink-2">{label}</span>
    {badge && <span className={`chip absolute left-1 top-1 h-4 px-1 text-[9px] leading-none ${badgeClass}`}>{badge}</span>}
    {on && <Worn />}
  </button>
);

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-2';

const Filters: React.FC<{ counts: (readonly [Source, number])[]; total: number; value: Source | 'all'; onChange: (v: Source | 'all') => void }> = ({
  counts,
  total,
  value,
  onChange,
}) =>
  counts.length > 1 ? (
    <div role="group" aria-label="종류" className="flex gap-1.5 overflow-x-auto pb-0.5">
      {[['all', total] as const, ...counts].map(([s, n]) => (
        <button
          key={s}
          type="button"
          aria-pressed={value === s}
          onClick={() => onChange(s)}
          className={`chip h-8 shrink-0 px-3 text-xs ${value === s ? 'bg-grape text-white shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'}`}
        >
          {s === 'all' ? '전체' : SOURCE[s].label} <span className="opacity-70">{n}</span>
        </button>
      ))}
    </div>
  ) : null;

const count = <T,>(list: T[], of: (x: T) => Source) => {
  const m = new Map<Source, number>();
  for (const x of list) m.set(of(x), (m.get(of(x)) ?? 0) + 1);
  return [...ORDER, 'achievement', 'champion'].filter((s) => m.has(s as Source)).map((s) => [s as Source, m.get(s as Source)!] as const);
};

const EmptyNote: React.FC<{ text: string; onOpenShop: () => void }> = ({ text, onOpenShop }) => (
  <p className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-xs text-ink-3">
    {text}
    <button type="button" className="font-bold text-grape-ink underline-offset-2 hover:underline" onClick={onOpenShop}>
      🛍️ 상점 가기
    </button>
  </p>
);

const ShopLink: React.FC<{ onOpenShop: () => void }> = ({ onOpenShop }) => (
  <button type="button" className="shrink-0 text-[11px] font-bold text-grape-ink underline-offset-2 hover:underline" onClick={onOpenShop}>
    🛍️ 상점에서 더 보기
  </button>
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
  const [avatarSource, setAvatarSource] = useState<Source | 'all'>('all');
  const [frameSource, setFrameSource] = useState<Source | 'all'>('all');

  const titleCounts = useMemo(() => count(titles, titleSource), [titles]);

  if (tab === 'avatar') {
    const mine = avatarItems
      .filter((i) => i.icon && !AVATARS.includes(i.icon))
      .sort((a, b) => ORDER.indexOf(itemSource(a)) - ORDER.indexOf(itemSource(b)));
    const shown = mine.filter((i) => avatarSource === 'all' || itemSource(i) === avatarSource);
    const usesPhoto = !!defaultLook.photo;
    return (
      <div className="space-y-4">
        <section>
          <p className="mb-2 text-[11px] font-bold text-ink-3">기본 · 무료 과일</p>
          <div className={GRID} role="group" aria-label="무료 아바타">
            <Cell on={!profile.avatar} label={usesPhoto ? 'Google 사진' : '레벨 과일'} ariaLabel="기본 아바타" onClick={() => onUpdateProfile({ ...profile, avatar: '' })}>
              <Avatar player={{ ...defaultLook, frame: '' }} size="md" />
            </Cell>
            {AVATARS.map((a, i) => (
              <Cell key={a} on={profile.avatar === a} label={FRUIT_NAMES[i] ?? ''} onClick={() => onUpdateProfile({ ...profile, avatar: a })}>
                {a}
              </Cell>
            ))}
          </div>
        </section>
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold text-ink-3">내 아바타 {mine.length > 0 && `(${mine.length})`}</p>
            <ShopLink onOpenShop={onOpenShop} />
          </div>
          {mine.length ? (
            <>
              <Filters counts={count(mine, itemSource)} total={mine.length} value={avatarSource} onChange={setAvatarSource} />
              <div className={GRID} role="group" aria-label="내 아바타">
                {shown.map((i) => {
                  const src = itemSource(i);
                  return (
                    <Cell
                      key={i.id}
                      on={profile.avatar === i.icon}
                      label={i.name}
                      badge={src === 'shop' ? undefined : src === 'level' ? `Lv.${i.level}` : SOURCE[src].label}
                      badgeClass={SOURCE[src].chip}
                      onClick={() => onUpdateProfile({ ...profile, avatar: i.icon! })}
                    >
                      <Emoji e={i.icon!} />
                    </Cell>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyNote text="아직 산 아바타가 없어요." onOpenShop={onOpenShop} />
          )}
        </section>
      </div>
    );
  }

  if (tab === 'frame') {
    const mine = [...frameItems].sort((a, b) => ORDER.indexOf(itemSource(a)) - ORDER.indexOf(itemSource(b)));
    const shown = mine.filter((i) => frameSource === 'all' || itemSource(i) === frameSource);
    const face = (frame: string) => (
      <Framed frame={frame}>
        <Avatar player={{ ...player, frame: '' }} size="sm" />
      </Framed>
    );
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-ink-3">프로필 · 랭킹 · 친구 목록에서 아바타를 둘러싸요</p>
          <ShopLink onOpenShop={onOpenShop} />
        </div>
        <Filters counts={count(mine, itemSource)} total={mine.length} value={frameSource} onChange={setFrameSource} />
        <div className={GRID} role="group" aria-label="테두리">
          <Cell on={!profile.frame} label="테두리 없음" onClick={() => onUpdateProfile({ ...profile, frame: '' })}>
            {face('')}
          </Cell>
          {shown.map((i) => {
            const src = itemSource(i);
            return (
              <Cell
                key={i.id}
                on={profile.frame === i.id}
                label={i.name.replace(/ 테두리$/, '')}
                ariaLabel={i.name}
                badge={src === 'shop' ? undefined : src === 'level' ? `Lv.${i.level}` : SOURCE[src].label}
                badgeClass={SOURCE[src].chip}
                onClick={() => onUpdateProfile({ ...profile, frame: i.id })}
              >
                {face(i.id)}
              </Cell>
            );
          })}
        </div>
        {mine.length === 0 && <EmptyNote text="아직 가진 테두리가 없어요." onOpenShop={onOpenShop} />}
      </div>
    );
  }

  // Titles: search and filter by where they come from
  const q = query.trim().toLowerCase();
  const list = titles.filter((t) => (source === 'all' || titleSource(t) === source) && (!q || t.label.toLowerCase().includes(q)));
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
      <Filters counts={titleCounts} total={titles.length} value={source} onChange={setSource} />
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-1.5">
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
          const src = SOURCE[titleSource(t)];
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
