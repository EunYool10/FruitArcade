import React from 'react';
import { Modal } from '../ui/Modal';
import { APP_VERSION } from '../../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PATCH_NOTES: { version: string; title: string; items: [string, string][] }[] = [
  {
    version: '3.1.0',
    title: '랭킹 · 과일 퍼즐 · 친구 대결',
    items: [
      ['🏆 랭킹', '게임별 오늘 · 이번 주 · 전체 순위. 로그인하면 최고 점수가 자동으로 올라가고 결과 화면에 내 순위가 보여요.'],
      ['🧩 새 게임 과일 퍼즐', '같은 과일 3개를 맞추는 매치-3. 줄 폭탄 · 큰 폭탄 · 연쇄 보너스, 이동 30번.'],
      ['🥊 친구 대결', '결과를 공유하면 같은 판으로 도전하는 링크가 생겨요. 친구 점수를 넘으면 도전 성공!'],
      ['🔥 연속 출석', '매일 한 판씩 하면 연속 일수가 쌓여요. 3 · 7 · 30일 업적.'],
      ['🎵 배경음악', '게임마다 다른 배경음악과 새 효과음. 배경음악 · 효과음 볼륨을 따로 조절해요.'],
      ['📲 앱 설치 · 오프라인', '홈 화면에 설치하고, 인터넷 없이도 플레이할 수 있어요.'],
      ['그 밖에', '첫 방문 안내, 결과 이미지 저장 · 공유, 대시 난이도 3단계, 게스트 닉네임 · 아바타, 휴대폰 진동, 새 업적 13개.'],
    ],
  },
  {
    version: '3.0.1',
    title: '버그 수정 & 밸런스 조정',
    items: [
      ['[수박] 넘침 경고', '과일이 떨어지는 동안 "넘치기 직전" 경고가 뜨던 버그 수정. 실제로 쌓였을 때만 경고해요.'],
      ['[수박] 다음 과일', '작은 과일이 더 자주 나오도록 조정, 다시 시작할 때 첫 과일이 바뀌던 버그 수정.'],
      ['[대시] 착지', '과일이 땅을 뚫고 지나가지 않고 풀밭에 떨어지면 사라져요.'],
      ['[대시] 밸런스', '부딪힘 판정을 실제 모양에 맞게 줄이고, 시작 후 1초 유예, 후반 난이도 완화, 별 +50 표시.'],
      ['[메모리] 콤보 보너스', '연속으로 맞히면 +2점씩, 최대 +10점 추가.'],
      ['[메모리] 기억 시간', '남은 시간이 보이고, 일시정지하면 함께 멈춰요. Perfect 100 업적 오류 수정.'],
      ['미션 · 화면', '수박 점수 미션 목표 상향(2,000 · 5,000점), 가로 모드 휴대폰 레이아웃, 좁은 화면 상단 바 정리.'],
    ],
  },
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
