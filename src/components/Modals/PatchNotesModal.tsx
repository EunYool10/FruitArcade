import React from 'react';
import { Modal } from '../ui/Modal';
import { APP_VERSION } from '../../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PATCH_NOTES: { version: string; title: string; items: [string, string][] }[] = [
  {
    version: '3.0.0',
    title: '새 단장',
    items: [
      ['완전히 새로운 디자인', '밝은 과일 테마, 다크 모드, 새 로비, 모바일에서는 아래에서 올라오는 창.'],
      ['레벨 & 경험치', '플레이 · 업적 · 미션으로 경험치를 모아 새싹에서 수박 마스터까지.'],
      ['오늘의 미션', '매일 바뀌는 미션 3개, 모두 깨면 도장 +100 XP.'],
      ['기록', '게임별 최고 기록과 최근 플레이를 한눈에, 결과 공유도 가능.'],
      ['조작 개선', '수박 게임 키보드 조작, 메모리 H · C 힌트 단축키, 일시정지에서 처음부터 하기.'],
      ['정리', '주식 트레이딩 종료, 모든 게임 기록 저장, 수박 업적 · 로그인 업적 유실 버그 수정.'],
    ],
  },
  {
    version: '2.1.0',
    title: '구글 연동 & FRUIT DASH',
    items: [
      ['Google 계정 연동', '진행 상황, 업적, 최고 점수를 클라우드에 보관.'],
      ['신규 게임 FRUIT DASH', '쏟아지는 과일을 피하며 황금 별을 모으는 회피 아케이드.'],
      ['업적 확장', 'FRUIT DASH 도전과제 4종 추가.'],
    ],
  },
  {
    version: '2.0.0',
    title: 'React 전면 개편',
    items: [
      ['React + Tailwind CSS', '새 비주얼과 애니메이션 적용.'],
      ['수박 게임 물리 엔진', '과일 회전, 탄성 충돌, 조준 가이드, 터치 드롭.'],
      ['접근성 설정', '고대비 카드, 카드 크기, 볼륨 조절.'],
    ],
  },
  {
    version: '1.1.15',
    title: '버그 수정',
    items: [
      ['[수박] 벽 뚫기 방지', '쌓인 과일이 벽 밖으로 밀려나는 현상 차단.'],
      ['[수박] 위험 데드라인', '카운트다운 로직 정밀화.'],
    ],
  },
];

export const PatchNotesModal: React.FC<Props> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="패치노트" subtitle="새로 바뀐 것들" icon="📝" tone="soda" size="lg">
    <ol className="relative space-y-4 border-l-2 border-dashed border-line/40 pl-5">
      {PATCH_NOTES.map((note) => {
        const latest = note.version === APP_VERSION;
        return (
          <li key={note.version} className="relative">
            <span
              className={`absolute -left-[29px] top-1 h-4 w-4 rounded-full border-2 border-line ${latest ? 'bg-berry' : 'bg-surface-3'}`}
              aria-hidden="true"
            />
            <div className={`rounded-2xl border-2 border-line p-4 ${latest ? 'bg-mango-soft shadow-hard-sm' : 'bg-surface-2'}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`chip font-display ${latest ? 'bg-berry-deep text-white' : 'bg-surface'}`}>v{note.version}</span>
                <h3 className="font-display text-lg">{note.title}</h3>
              </div>
              <ul className="space-y-1.5 text-sm">
                {note.items.map(([head, body]) => (
                  <li key={head} className="flex gap-2">
                    <span aria-hidden="true">•</span>
                    <span>
                      <b>{head}</b> <span className="text-ink-2">— {body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        );
      })}
    </ol>
  </Modal>
);
