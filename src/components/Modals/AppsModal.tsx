import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// 은율's other apps. FRUIT ARCADE itself is listed too, marked as the one being used.
// icon: a copy of each app's favicon in public/apps, color: taken from that favicon,
// slow: free server that takes a while to wake up on the first visit.
const APPS = [
  {
    icon: 'icons/apple-touch-icon.png',
    color: '#f2456f',
    name: 'FRUIT ARCADE',
    about: '과일 미니게임 아홉 가지에 미션 · 업적 · 랭킹 · 친구 대결까지',
    url: 'https://eunyool10.github.io/FruitArcade/',
    here: true,
  },
  {
    icon: 'apps/egggame.png',
    color: '#f0a830',
    slow: true,
    name: '계란이의 모험',
    about: '현대 · 고대 · 미래, 세 시대의 계란이가 엄마 품을 찾아 떠나는 선택형 텍스트 어드벤처',
    url: 'https://egggame.onrender.com/',
  },
  {
    icon: 'apps/logicmaze.svg',
    color: '#b8924a',
    name: '논리 미궁: 대우의 열쇠',
    about: '원래 명제의 대우를 골라 다섯 개의 방을 탈출하는 논리 퀴즈 게임',
    url: 'https://eunyool10.github.io/LogicMaze/',
  },
  {
    icon: 'apps/schoolfix.png',
    color: '#1d4ed8',
    slow: true,
    name: 'SchoolFix',
    about: '학교의 불편한 점과 시설 안전 위험을 신고하고 처리 과정을 함께 보는 학교 시설 관리 서비스',
    url: 'https://schoolfix.onrender.com/',
  },
] as { icon: string; color: string; name: string; about: string; url: string; here?: boolean; slow?: boolean }[];

// Card in the favicon's color: a thick left stripe and a light tint of it.
const cardStyle = (color: string): React.CSSProperties => ({
  borderLeftColor: color,
  borderLeftWidth: 6,
  background: `color-mix(in srgb, ${color} 10%, var(--surface))`,
});

export const AppsModal: React.FC<Props> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="은율이의 다른 앱" subtitle="은율이 만든 앱들이에요" icon="✨" tone="soda">
    <ul className="space-y-2.5">
      {APPS.map((app) => (
        <li key={app.url}>
          {app.here ? (
            <div className="flex items-center gap-3 rounded-2xl border-2 border-line p-3" style={cardStyle(app.color)}>
              <AppBody app={app} />
              <span className="chip h-7 shrink-0 bg-surface text-[11px]">지금 여기</span>
            </div>
          ) : (
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border-2 border-line p-3 transition-transform hover:-translate-y-0.5"
              style={cardStyle(app.color)}
            >
              <AppBody app={app} />
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white" style={{ background: app.color }}>
                <ExternalLink className="h-4 w-4" strokeWidth={2.5} aria-label="새 창에서 열기" />
              </span>
            </a>
          )}
        </li>
      ))}
    </ul>
  </Modal>
);

const AppBody: React.FC<{ app: (typeof APPS)[number] }> = ({ app }) => (
  <>
    <img
      src={`${import.meta.env.BASE_URL}${app.icon}`}
      alt=""
      width={48}
      height={48}
      className="h-12 w-12 shrink-0 rounded-xl border-2 border-line"
    />
    <span className="min-w-0 flex-1">
      <span className="block font-display text-lg leading-tight">{app.name}</span>
      <span className="mt-0.5 block text-xs text-ink-2">{app.about}</span>
      {app.slow && (
        <span className="mt-1 block text-[11px] font-bold" style={{ color: app.color }}>
          무료 서버라 처음 열 때 30초쯤 걸릴 수 있어요
        </span>
      )}
    </span>
  </>
);
