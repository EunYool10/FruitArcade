import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// 은율's other apps. FRUIT ARCADE itself is listed too, marked as the one being used.
const APPS = [
  {
    emoji: '🍓',
    name: 'FRUIT ARCADE',
    about: '과일 미니게임 다섯 가지에 미션 · 업적 · 랭킹 · 친구 대결까지',
    url: 'https://eunyool10.github.io/FruitArcade/',
    here: true,
    tone: 'bg-berry-soft',
  },
  {
    emoji: '🥚',
    name: '계란이의 모험',
    about: '현대 · 고대 · 미래, 세 시대의 계란이가 엄마 품을 찾아 떠나는 선택형 텍스트 어드벤처',
    url: 'https://egggame.onrender.com/',
    tone: 'bg-mango-soft',
  },
  {
    emoji: '🗝️',
    name: '논리 미궁: 대우의 열쇠',
    about: '원래 명제의 대우를 골라 다섯 개의 방을 탈출하는 논리 퀴즈 게임',
    url: 'https://eunyool10.github.io/LogicMaze/',
    tone: 'bg-grape-soft',
  },
  {
    emoji: '🏫',
    name: 'SchoolFix',
    about: '학교의 불편한 점과 시설 안전 위험을 신고하고 처리 과정을 함께 보는 학교 시설 관리 서비스',
    url: 'https://schoolfix.onrender.com/',
    tone: 'bg-soda-soft',
  },
];

export const AppsModal: React.FC<Props> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="은율이의 다른 앱" subtitle="은율이 만든 앱들이에요" icon="✨" tone="soda">
    <ul className="space-y-2.5">
      {APPS.map((app) => (
        <li key={app.url}>
          {app.here ? (
            <div className={`flex items-center gap-3 rounded-2xl border-2 border-line p-3 ${app.tone}`}>
              <AppBody app={app} />
              <span className="chip h-7 shrink-0 bg-surface text-[11px]">지금 여기</span>
            </div>
          ) : (
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 rounded-2xl border-2 border-line p-3 transition-transform hover:-translate-y-0.5 ${app.tone}`}
            >
              <AppBody app={app} />
              <ExternalLink className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={2.5} aria-label="새 창에서 열기" />
            </a>
          )}
        </li>
      ))}
    </ul>
  </Modal>
);

const AppBody: React.FC<{ app: (typeof APPS)[number] }> = ({ app }) => (
  <>
    <span className="sticker h-12 w-12 shrink-0 bg-surface text-2xl shadow-none" aria-hidden="true">
      {app.emoji}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-display text-lg leading-tight">{app.name}</span>
      <span className="mt-0.5 block text-xs text-ink-2">{app.about}</span>
    </span>
  </>
);
