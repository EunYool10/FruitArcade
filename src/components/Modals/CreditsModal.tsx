import React from 'react';
import { Modal } from '../ui/Modal';
import { APP_VERSION, GAME_ORDER } from '../../constants';
import { ACHIEVEMENT_COUNT } from '../../utils/achievements';
import { SHOP_ITEMS, forSale } from '../../utils/shop';
import { STAGE_COUNT } from '../PuzzleGame/stages';
import { TRACK_COUNT } from '../../utils/music';
import { Emoji } from '../ui/Emoji';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// What 은율 worked on, shown as tags; friends chipped in with ideas
const MAKER = {
  emoji: '🍓',
  name: '은율',
  skills: ['기획', 'UI/UX 디자인', '프론트엔드 개발', '게임 개발', '사운드', '서버 · 데이터베이스', '보안', 'QA · 테스트', '배포 · 운영'],
};
const IDEAS = [
  { emoji: '🍊', name: '예찬' },
  { emoji: '🍇', name: '윤성' },
  { emoji: '🍉', name: '진' },
];
// Played the new builds first and reported what broke
const TESTERS = [
  { emoji: '🍑', name: '윤아' },
  { emoji: '🍋', name: '지우' },
  { emoji: '🍇', name: '수빈' },
  { emoji: '🍓', name: '하윤' },
];

const NUMBERS: [string, string][] = [
  ['🎮', `게임 ${GAME_ORDER.length}종`],
  ['🏆', `업적 ${ACHIEVEMENT_COUNT}개`],
  ['🛍️', `상점 아이템 ${SHOP_ITEMS.filter(forSale).length}개`],
  ['🧩', `퍼즐 스테이지 ${STAGE_COUNT}개`],
  ['🎵', `배경음악 ${TRACK_COUNT}곡`],
];

export const CreditsModal: React.FC<Props> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="크레딧" subtitle={`상큼 과일 아케이드 존 v${APP_VERSION}`} icon="🎬" tone="berry" size="sm">
    <div className="well bg-mango-soft p-4">
      <div className="flex items-center gap-3">
        <span className="sticker h-14 w-14 shrink-0 -rotate-6 bg-surface text-3xl" aria-hidden="true">
          {MAKER.emoji}
        </span>
        <p className="font-display text-2xl leading-tight">{MAKER.name}</p>
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`${MAKER.name}이 맡은 분야`}>
        {MAKER.skills.map((s) => (
          <li key={s} className="chip bg-surface text-xs">
            {s}
          </li>
        ))}
      </ul>
    </div>

    <h3 className="mb-2 mt-4 font-display text-lg">📊 숫자로 보면</h3>
    <ul className="flex flex-wrap gap-1.5">
      {NUMBERS.map(([icon, text]) => (
        <li key={text} className="chip bg-surface-2 text-xs">
          <span aria-hidden="true">{icon}</span> {text}
        </li>
      ))}
    </ul>

    <h3 className="mb-2 mt-4 font-display text-lg">💡 아이디어</h3>
    <ul className="grid grid-cols-3 gap-2">
      {IDEAS.map((m) => (
        <li key={m.name} className="well flex flex-col items-center gap-0.5 p-3 text-center">
          <span className="text-2xl" aria-hidden="true">
            <Emoji e={m.emoji} />
          </span>
          <span className="font-display leading-tight">{m.name}</span>
          <span className="text-[11px] text-ink-3">아이디어</span>
        </li>
      ))}
    </ul>

    <h3 className="mb-2 mt-4 font-display text-lg">🧪 테스트 · QA</h3>
    <ul className="grid grid-cols-3 gap-2">
      {TESTERS.map((m) => (
        <li key={m.name} className="well flex flex-col items-center gap-0.5 p-3 text-center">
          <span className="text-2xl" aria-hidden="true">
            <Emoji e={m.emoji} />
          </span>
          <span className="font-display leading-tight">{m.name}</span>
          <span className="text-[11px] text-ink-3">테스트 · QA</span>
        </li>
      ))}
    </ul>
    <p className="mt-4 text-center text-sm text-ink-2">플레이해 주셔서 고마워요! 💖</p>
  </Modal>
);
