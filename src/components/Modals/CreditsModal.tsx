import React from 'react';
import { Modal } from '../ui/Modal';
import { APP_VERSION } from '../../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// 은율 made the whole game; friends chipped in with ideas
const MAKER = { emoji: '🍓', name: '은율', role: '기획 · 디자인 · 개발 · 운영' };
const IDEAS = [
  { emoji: '🍊', name: '예찬' },
  { emoji: '🍇', name: '윤성' },
  { emoji: '🍉', name: '진' },
];

export const CreditsModal: React.FC<Props> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="크레딧" subtitle={`상큼 과일 아케이드 존 v${APP_VERSION}`} icon="🎬" tone="berry" size="sm">
    <div className="well flex items-center gap-3 bg-mango-soft p-4">
      <span className="sticker h-14 w-14 shrink-0 -rotate-6 bg-surface text-3xl" aria-hidden="true">
        {MAKER.emoji}
      </span>
      <div className="min-w-0">
        <p className="font-display text-2xl leading-tight">{MAKER.name}</p>
        <p className="text-sm text-ink-2">{MAKER.role}</p>
        <span className="chip mt-1.5 bg-berry-deep text-white">전부 다 만들었어요</span>
      </div>
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
