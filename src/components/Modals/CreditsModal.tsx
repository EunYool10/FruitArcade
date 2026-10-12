import React from 'react';
import { Modal } from '../ui/Modal';
import { APP_VERSION } from '../../constants';

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

    <h3 className="mb-2 mt-4 font-display text-lg">💡 아이디어</h3>
    <ul className="grid grid-cols-3 gap-2">
      {IDEAS.map((m) => (
        <li key={m.name} className="well flex flex-col items-center gap-0.5 p-3 text-center">
          <span className="text-2xl" aria-hidden="true">
            {m.emoji}
          </span>
          <span className="font-display leading-tight">{m.name}</span>
          <span className="text-[11px] text-ink-3">아이디어</span>
        </li>
      ))}
    </ul>
    <p className="mt-4 text-center text-sm text-ink-2">플레이해 주셔서 고마워요! 💖</p>
  </Modal>
);
