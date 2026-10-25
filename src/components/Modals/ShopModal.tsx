import React, { useState } from 'react';
import { Check, Gift } from 'lucide-react';
import { ItemKind, Inventory, SHOP_ITEMS, ShopItem, bladeStyle, cardBackStyle, forSale, runnerStyle } from '../../utils/shop';
import { SUIKA_DEFAULT, SUIKA_SKINS } from '../../utils/skins';
import { titleDef } from '../../utils/titles';
import { formatCompact, formatNumber, josa } from '../../utils/format';
import { Modal } from '../ui/Modal';
import { ConfirmButton } from '../ui/ConfirmButton';
import { Framed, PlayerView } from '../ui/Avatar';
import { TitleTag } from '../ui/TitleTag';
import { Emoji } from '../ui/Emoji';

type Tab = ItemKind | 'staff';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Infinity for admins */
  balance: number;
  isAdmin: boolean;
  /** Items the player can use (bought, plus the 운영진 series for admins) */
  owned: Inventory;
  /** The player's look, used to preview frames */
  player: PlayerView;
  /** What is in use now, per kind (item ids, '' = the free default) */
  equipped: Record<ItemKind, string>;
  onBuy: (item: ShopItem) => void;
  /** Admins: take every item at once */
  onTakeAll: () => void;
  /** null puts the free default back on */
  onEquip: (kind: ItemKind, item: ShopItem | null) => void;
}

const TABS: [Tab, string][] = [
  ['frame', '🖼️ 테두리'],
  ['avatar', '🐱 아바타'],
  ['title', '🏷️ 칭호'],
  ['cardBack', '🃏 카드 뒷면'],
  ['blade', '🔪 칼날'],
  ['runner', '🏃 러너'],
  ['suikaSkin', '🎨 과일 스킨'],
];

/** The free choice at the start of each tab */
const DEFAULT_LABEL: Record<ItemKind, string> = {
  frame: '테두리 없음',
  avatar: '기본 아바타',
  title: '칭호 없음',
  cardBack: '기본 딸기',
  blade: '기본 칼날',
  runner: '기본 오렌지',
  suikaSkin: '기본 과일',
};

const TAB_HINT: Record<Tab, string> = {
  frame: '프로필과 랭킹에서 아바타를 둘러싸요',
  avatar: '프로필과 랭킹에 보이는 얼굴이에요 (과일 아바타는 프로필에서 무료)',
  title: '이름 옆에 붙고 랭킹에도 보여요 (업적을 깨면 더 생겨요)',
  cardBack: '과일 메모리 카드의 뒷면이에요',
  blade: '과일 자르기에서 긋는 칼날 자국 색이에요',
  runner: 'FRUIT DASH에서 달리는 캐릭터예요',
  suikaSkin: '수박 게임 · 과일 자르기 · FRUIT DASH · 과일 퍼즐의 과일이 다른 모양으로 바뀌어요 (크기와 점수는 그대로)',
  staff: '운영진만 쓸 수 있는 전용 시리즈예요. 칭호와 테두리는 다른 사람은 랭킹에 달 수 없어요',
};

const BladePreview: React.FC<{ id: string }> = ({ id }) => {
  const b = bladeStyle(id);
  const glow = b.glow || '46, 169, 255';
  const background = b.rainbow
    ? 'linear-gradient(90deg, transparent, #ff4778, #ffb627, #2ec27e, #2ea9ff, #7a5cff)'
    : `linear-gradient(90deg, transparent, rgba(${glow}, 0.85) 45%, rgb(${b.core}))`;
  return (
    <span className="grid h-14 w-16 place-items-center rounded-xl border-2 border-line bg-[#ffdca6]">
      <span className="block h-2 w-14 -rotate-[24deg] rounded-full" style={{ background, boxShadow: `0 0 8px 2px rgba(${glow}, 0.7)` }} />
    </span>
  );
};

/** The FRUIT DASH runner in the shop: a small fruit with a leaf, eyes and feet */
const RunnerPreview: React.FC<{ id: string }> = ({ id }) => {
  const r = runnerStyle(id);
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14" aria-hidden="true">
      <ellipse cx="20" cy="47" rx="7" ry="4.5" fill={r.feet} stroke="#2b2140" strokeWidth="2.5" />
      <ellipse cx="36" cy="47" rx="7" ry="4.5" fill={r.feet} stroke="#2b2140" strokeWidth="2.5" />
      <circle cx="28" cy="28" r="18" fill={r.body} stroke="#2b2140" strokeWidth="3" />
      <ellipse cx="21" cy="19" rx="5.5" ry="3" fill="rgba(255,255,255,0.45)" transform="rotate(-35 21 19)" />
      <ellipse cx="32" cy="9.5" rx="7" ry="3.5" fill={r.leaf} stroke="#2b2140" strokeWidth="2" transform="rotate(-28 32 9.5)" />
      <ellipse cx="23" cy="26" rx="2.3" ry="3.2" fill={r.face} />
      <ellipse cx="34" cy="26" rx="2.3" ry="3.2" fill={r.face} />
      <path d="M24.5 32.5 Q28.5 36.5 32.5 32.5" fill="none" stroke={r.face} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

/** Small preview of an item (or of the free default when id is '') */
const Preview: React.FC<{ kind: ItemKind; id: string; player: PlayerView }> = ({ kind, id, player }) => {
  switch (kind) {
    case 'frame':
      return (
        <Framed frame={id}>
          {player.photo ? (
            <img src={player.photo} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full border-2 border-line object-cover" />
          ) : (
            <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-line bg-mango-soft text-3xl"><Emoji e={player.emoji} /></span>
          )}
        </Framed>
      );
    case 'avatar': {
      const emoji = id ? SHOP_ITEMS.find((i) => i.id === id)?.icon : '🍓';
      return <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-line bg-mango-soft text-3xl"><Emoji e={emoji ?? ''} /></span>;
    }
    case 'title': {
      const t = titleDef(id);
      return (
        <span className="grid h-14 w-full place-items-center">
          {t ? <TitleTag title={t} /> : <span className="chip bg-surface text-ink-3">이름만</span>}
        </span>
      );
    }
    case 'cardBack': {
      const back = cardBackStyle(id);
      return (
        <span className={`grid h-16 w-14 place-items-center rounded-xl border-2 border-line shadow-hard-sm ${back.className}`}>
          <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-line bg-surface font-display text-sm leading-none text-ink">{back.mark}</span>
        </span>
      );
    }
    case 'blade':
      return <BladePreview id={id} />;
    case 'runner':
      return <RunnerPreview id={id} />;
    case 'suikaSkin': {
      // Smallest, middle and biggest of the 11 sizes
      const set = (SUIKA_SKINS[id] ?? SUIKA_DEFAULT).emojis;
      return (
        <span className="flex h-14 items-end justify-center gap-0.5" aria-hidden="true">
          {[0, 3, 6, 8, 10].map((lv, i) => (
            <span key={lv} style={{ fontSize: 13 + i * 5 }} className="leading-none">
              <Emoji e={set[lv]} />
            </span>
          ))}
        </span>
      );
    }
  }
};

const InUse = () => (
  <span className="chip h-8 bg-melon-soft text-xs">
    <Check className="h-3.5 w-3.5" strokeWidth={3} /> 사용 중
  </span>
);

export const ShopModal: React.FC<Props> = ({ isOpen, onClose, balance, isAdmin, owned, player, equipped, onBuy, onTakeAll, onEquip }) => {
  const [tab, setTab] = useState<Tab>('frame');
  const tabs: [Tab, string][] = isAdmin ? [...TABS, ['staff', '🛡️ 운영진']] : TABS;
  // The owner's gifts show only to whoever has one
  const items = SHOP_ITEMS.filter((i) => (tab === 'staff' ? i.staff : i.kind === tab && !i.staff && (!i.gift || owned[i.id])));
  const missing = SHOP_ITEMS.filter((i) => forSale(i) && !owned[i.id]).length;
  const unlimited = !Number.isFinite(balance);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="상점"
      subtitle={unlimited ? '🪙 ∞ 코인 · 운영자는 무엇이든 무료로 받아요' : `🪙 ${formatCompact(balance)} 코인 · 게임을 하면 코인이 쌓여요`}
      icon="🛍️"
      tone="mango"
      size="lg"
    >
      {isAdmin && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border-2 border-line bg-[linear-gradient(135deg,#1e3a8a,#3b82f6)] p-3 text-white">
          <span className="text-2xl" aria-hidden="true">
            🛡️
          </span>
          <p className="min-w-0 flex-1 text-xs font-bold">
            운영자 계정이에요. 코인이 무한이고, 운영진 전용 시리즈는 처음부터 다 갖고 있어요.
          </p>
          <button type="button" className="btn btn-sm shrink-0" onClick={onTakeAll} disabled={missing === 0}>
            <Gift className="h-4 w-4" strokeWidth={2.5} /> {missing === 0 ? '다 받았어요' : `전부 받기 (${missing})`}
          </button>
        </div>
      )}

      <div role="tablist" aria-label="상품 종류" className="mb-2 flex flex-wrap gap-1.5">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-2xl border-2 border-line px-3 py-1.5 text-sm font-bold transition-all ${
              tab === id
                ? id === 'staff'
                  ? '-translate-y-0.5 bg-[#1e3a8a] text-white shadow-hard-sm'
                  : '-translate-y-0.5 bg-mango text-on-bright shadow-hard-sm'
                : 'bg-surface-2 hover:bg-surface-3'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mb-3 text-xs text-ink-3">{TAB_HINT[tab]}</p>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {/* The free default */}
        {tab !== 'staff' && (
          <li className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-line p-3 text-center ${!equipped[tab] ? 'bg-mango-soft' : 'bg-surface-2'}`}>
            <Preview kind={tab} id="" player={player} />
            <p className="text-sm font-bold">{DEFAULT_LABEL[tab]}</p>
            {!equipped[tab] ? (
              <InUse />
            ) : (
              <button type="button" className="btn btn-sm w-full" onClick={() => onEquip(tab, null)}>
                사용하기
              </button>
            )}
          </li>
        )}
        {items.map((item) => {
          const has = !!owned[item.id];
          const isOn = equipped[item.kind] === item.id;
          return (
            <li
              key={item.id}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-line p-3 text-center ${isOn ? 'bg-mango-soft' : 'bg-surface-2'}`}
            >
              <Preview kind={item.kind} id={item.id} player={player} />
              <p className="text-sm font-bold">{item.name}</p>
              {item.gift && <span className="chip h-5 bg-mango px-1.5 text-[10px] text-on-bright">👑 소유자 선물</span>}
              {isOn ? (
                <InUse />
              ) : has ? (
                <button type="button" className="btn btn-sm w-full" onClick={() => onEquip(item.kind, item)}>
                  사용하기
                </button>
              ) : unlimited ? (
                <button type="button" className="btn btn-sm btn-mango w-full" onClick={() => onBuy(item)}>
                  <Gift className="h-4 w-4" strokeWidth={2.5} /> 받기
                </button>
              ) : balance < item.price ? (
                <button type="button" className="btn btn-sm w-full" disabled>
                  🪙 {formatNumber(item.price)} · 부족
                </button>
              ) : (
                <ConfirmButton
                  className="btn btn-sm btn-mango w-full"
                  question={`${item.name}${josa(item.name, '을', '를')} 🪙 ${formatNumber(item.price)}에 살까요?`}
                  confirmLabel="살게요"
                  onConfirm={() => onBuy(item)}
                >
                  🪙 {formatNumber(item.price)}
                </ConfirmButton>
              )}
            </li>
          );
        })}
      </ul>

      <div className="well mt-4 p-3.5 text-xs text-ink-2">
        <p className="mb-1 font-bold text-ink">🪙 코인 모으는 법</p>
        <p>한 판마다 10 + 점수 보너스(최대 40) · 이기면 +5 · 신기록 +20 · 오늘 첫 판 +10 · 미션 도장 +50</p>
        {player.isGuest && <p className="mt-1">로그인하면 산 물건과 코인이 다른 기기에서도 그대로예요.</p>}
      </div>
    </Modal>
  );
};
