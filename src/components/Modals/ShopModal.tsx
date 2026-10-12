import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { ItemKind, Inventory, SHOP_ITEMS, ShopItem, cardBackStyle } from '../../utils/shop';
import { formatNumber, josa } from '../../utils/format';
import { Modal } from '../ui/Modal';
import { ConfirmButton } from '../ui/ConfirmButton';
import { Framed, PlayerView } from '../ui/Avatar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  inventory: Inventory;
  /** The player's look, used to preview frames */
  player: PlayerView;
  equippedFrame: string;
  equippedBack: string;
  onBuy: (item: ShopItem) => void;
  /** null puts the default back on */
  onEquip: (kind: ItemKind, item: ShopItem | null) => void;
}

const TABS: [ItemKind, string][] = [
  ['frame', '🖼️ 프로필 테두리'],
  ['cardBack', '🃏 메모리 카드 뒷면'],
];

/** Small preview of the player's avatar or a card back */
const Preview: React.FC<{ kind: ItemKind; id: string; player: PlayerView }> = ({ kind, id, player }) => {
  if (kind === 'frame') {
    return (
      <Framed frame={id}>
        {player.photo ? (
          <img src={player.photo} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full border-2 border-line object-cover" />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-line bg-mango-soft text-3xl">{player.emoji}</span>
        )}
      </Framed>
    );
  }
  const back = cardBackStyle(id);
  return (
    <span className={`grid h-16 w-14 place-items-center rounded-xl border-2 border-line shadow-hard-sm ${back.className}`}>
      <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-line bg-surface font-display text-sm leading-none text-ink">{back.mark}</span>
    </span>
  );
};

export const ShopModal: React.FC<Props> = ({ isOpen, onClose, balance, inventory, player, equippedFrame, equippedBack, onBuy, onEquip }) => {
  const [tab, setTab] = useState<ItemKind>('frame');
  const equipped = tab === 'frame' ? equippedFrame : equippedBack;
  const items = SHOP_ITEMS.filter((i) => i.kind === tab);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="상점" subtitle={`🪙 ${formatNumber(balance)} 코인 · 게임을 하면 코인이 쌓여요`} icon="🛍️" tone="mango" size="lg">
      <div role="tablist" aria-label="상품 종류" className="mb-4 grid grid-cols-2 gap-1.5">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-2xl border-2 border-line px-2 py-2 text-sm font-bold transition-all ${
              tab === id ? '-translate-y-0.5 bg-mango text-on-bright shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {/* The free default */}
        <li className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-line p-3 text-center ${!equipped ? 'bg-mango-soft' : 'bg-surface-2'}`}>
          <Preview kind={tab} id="" player={player} />
          <p className="text-sm font-bold">{tab === 'frame' ? '테두리 없음' : '기본 딸기'}</p>
          {!equipped ? (
            <span className="chip h-8 bg-melon-soft text-xs">
              <Check className="h-3.5 w-3.5" strokeWidth={3} /> 사용 중
            </span>
          ) : (
            <button type="button" className="btn btn-sm w-full" onClick={() => onEquip(tab, null)}>
              사용하기
            </button>
          )}
        </li>
        {items.map((item) => {
          const owned = !!inventory[item.id];
          const isOn = equipped === item.id;
          return (
            <li key={item.id} className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-line p-3 text-center ${isOn ? 'bg-mango-soft' : 'bg-surface-2'}`}>
              <Preview kind={tab} id={item.id} player={player} />
              <p className="text-sm font-bold">{item.name}</p>
              {isOn ? (
                <span className="chip h-8 bg-melon-soft text-xs">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} /> 사용 중
                </span>
              ) : owned ? (
                <button type="button" className="btn btn-sm w-full" onClick={() => onEquip(tab, item)}>
                  사용하기
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
