import React from 'react';
import { Modal } from '../ui/Modal';
import { APP_VERSION } from '../../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const TEAM = [
  { emoji: '🍓', name: '은율', role: '메인 개발 · 전체 아키텍처와 게임플레이' },
  { emoji: '🍊', name: '예찬', role: 'QA · 밸런스 검증' },
  { emoji: '🍇', name: '윤성', role: '아이디어 기획 · 시스템 디자인' },
  { emoji: '🍉', name: '진', role: '미니게임 모듈 제작 지원' },
];

export const CreditsModal: React.FC<Props> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="크레딧" subtitle={`상큼 과일 아케이드 존 v${APP_VERSION}`} icon="🎬" tone="berry" size="sm">
    <ul className="space-y-2">
      {TEAM.map((m) => (
        <li key={m.name} className="well flex items-center gap-3 p-3">
          <span className="sticker h-11 w-11 shrink-0 bg-surface text-2xl shadow-none" aria-hidden="true">
            {m.emoji}
          </span>
          <div>
            <p className="font-display text-lg leading-tight">{m.name}</p>
            <p className="text-xs text-ink-2">{m.role}</p>
          </div>
        </li>
      ))}
    </ul>
    <p className="mt-4 text-center text-sm text-ink-2">플레이해 주셔서 고마워요! 💖</p>
  </Modal>
);
