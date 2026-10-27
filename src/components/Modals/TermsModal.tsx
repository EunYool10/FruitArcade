import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/** Shown in the window; bump it (and CHANGES) when the text below changes */
export const TERMS_DATE = '2026년 10월 26일';

/** What changed in this version, shown at the top */
const CHANGES = [
  '운영진이 부적절한 닉네임 · 아바타 · 칭호 · 테두리를 바꾸거나 뗄 수 있다는 내용을 넣었어요.',
  '코인 선물 한도(하루 5번, 한 번에 300코인)와 레벨 · 레벨 보상 · RGB 시리즈 내용을 넣었어요.',
  '운영진이 선물로 주는 아이템(RGB 테두리)과 그 기록을 모으는 정보에 넣었어요.',
  '이용약관과 개인정보 처리방침을 나눠서 정리했어요.',
];

// Plain-language terms and privacy notice. Keep it in step with what the app really does
// (firestore.rules, server/, scripts/reminders) whenever data handling changes.
interface Section {
  title: string;
  items: string[];
}

const TERMS: Section[] = [
  {
    title: '1. 어떤 서비스인가요',
    items: [
      'FRUIT ARCADE(이하 "서비스")는 은율이 만들어 무료로 운영하는 과일 미니게임 모음이에요.',
      '로그인하지 않아도 모든 게임을 할 수 있어요. Google로 로그인하면 기록이 클라우드에 저장되고 랭킹 · 친구 기능을 쓸 수 있어요.',
      '광고와 결제는 없어요. 코인과 상점 아이템은 게임 안에서만 쓰이고 돈으로 바꿀 수 없어요.',
    ],
  },
  {
    title: '2. 계정',
    items: [
      '로그인은 Google 계정으로만 해요. 비밀번호는 Google이 처리하고, 서비스는 받지도 저장하지도 않아요.',
      '내 계정을 남과 같이 쓰거나 남의 계정으로 로그인하면 안 돼요.',
      '만 14세 미만이라면 보호자의 동의를 받은 뒤 로그인해 주세요.',
    ],
  },
  {
    title: '3. 코인 · 아이템 · 레벨',
    items: [
      '코인은 판을 끝내거나, 미션 도장을 받거나, 레벨이 오를 때 받아요. 한 사람이 가질 수 있는 코인은 최대 999억 9,999만 9,999개예요.',
      '상점 아이템은 코인으로 사요. RGB 시리즈의 아바타 · 칭호 · 카드 뒷면은 각 777억 코인이에요. 산 아이템은 되돌려 코인으로 받을 수 없어요.',
      '레벨 보상 아이템은 정해진 레벨에 오르면 저절로 생겨요. 일반 플레이어의 최고 레벨은 Lv.100이에요.',
      'RGB 테두리처럼 운영진이 선물로만 주는 아이템이 있어요. 선물한 아이템은 운영진이 다시 거둘 수 있어요.',
      '코인은 친구에게 하루 5번, 한 번에 300코인까지 선물할 수 있어요. 받은 선물은 되돌릴 수 없어요.',
    ],
  },
  {
    title: '4. 공정한 플레이',
    items: [
      '점수 조작, 매크로 · 자동 플레이 프로그램, 버그 악용, 서버나 데이터베이스를 직접 건드리는 행동은 하면 안 돼요.',
      '욕설, 성적인 말, 남을 괴롭히는 말, 운영진처럼 보이는 이름(관리자, 운영자, QA 등)은 닉네임으로 쓸 수 없어요. 이미 쓰던 이름에 욕설이나 성적인 말이 있으면 다른 사람에게는 *로 가려져 보여요.',
      '코인을 돈이나 물건과 바꾸는 거래, 여러 계정을 만들어 코인을 몰아주는 행동, 선물을 대가로 무언가를 요구하는 행동은 하면 안 돼요.',
      '이상한 기록은 운영진이 지울 수 있고, 반복되면 랭킹 참여가 막힐 수 있어요.',
      '다른 사람의 이상한 기록이나 이름은 랭킹의 깃발 버튼으로 신고해 주세요.',
    ],
  },
  {
    title: '5. 운영진',
    items: [
      '운영진은 신고 처리, 기록 삭제, 랭킹 차단 같은 관리 기능을 써요.',
      '운영진은 부적절한 닉네임 · 아바타 · 칭호 · 테두리를 바꾸거나 뗄 수 있어요. 바뀌면 다음에 앱을 열 때 알려 드려요.',
      '운영진은 전용 칭호 · 아이템을 가지고, 이름 옆에 파란 체크가 붙고, 레벨 자리에는 숫자 대신 🛡️가 보여요. 운영진 칭호는 운영진만 달 수 있어요.',
      '운영진은 이벤트로 한도 없이 코인을 선물할 수 있어요.',
    ],
  },
  {
    title: '6. 서비스 변경과 책임',
    items: [
      '배우면서 만드는 무료 서비스라서 내용이 바뀌거나 잠시 멈출 수 있어요.',
      '무료 서버는 한동안 쓰지 않으면 잠들어서 처음 열 때 느릴 수 있어요.',
      '기록이 사라지지 않게 노력하지만, 데이터가 사라져도 보상해 드리기는 어려워요.',
    ],
  },
  {
    title: '7. 문의와 약관 변경',
    items: [
      '궁금한 점, 기록 삭제 요청, 신고는 설정 → 도움 · 데이터 → "의견 · 버그 보내기"로 보내 주세요.',
      '약관이 바뀌면 패치노트와 이 창의 "바뀐 점"으로 알려 드려요. 바뀐 뒤에도 계속 이용하면 바뀐 약관에 동의한 것으로 봐요.',
    ],
  },
];

const PRIVACY: Section[] = [
  {
    title: '1. 모으는 정보',
    items: [
      '로그인하면: Google 계정의 이메일, 이름, 프로필 사진 주소, 가입 · 마지막 로그인 시각.',
      '게임 기록: 점수, 판 수와 플레이 시간, 업적, 레벨, 코인과 산 아이템, 설정, 미션 · 퍼즐 스테이지 진행.',
      '점수 확인: 로그인한 상태로 판이 끝나면 게임 · 점수 · 걸린 시간(과일 퍼즐은 둔 수)을 점수 서버에 보내 조작이 없는지 확인해요. 서버는 결과만 돌려주고 판 내용을 따로 모아 두지 않아요(오류 확인용 서버 기록에 사용자 번호 일부와 점수가 남을 수 있어요).',
      '운영 통계: 날마다 몇 판, 몇 분 했는지.',
      '신고 · 의견: 보낸 내용과 기기 정보(브라우저 · 운영체제 종류, 화면 크기).',
      '친구: 공개 프로필(이름, 아바타 또는 Google 프로필 사진, 칭호, 테두리, 레벨, 업적 수, 게임별 최고 점수), 친구 코드, 친구 관계 · 요청, 코인 선물 기록.',
      '접속 상태: 로그인해서 앱을 켜 두는 동안 1분쯤마다 마지막 접속 시간.',
      '운영 기록: 운영진이 프로필을 바꾼 시각, 운영진에게서 받은 선물 아이템, 차단 기록.',
      '연속 출석 알림을 켜면: 이 브라우저의 푸시 알림 주소, 마지막으로 한 날, 연속 일수(알림 발송기만 열 수 있게 암호화해서 저장해요).',
      '로그인하지 않으면 모든 기록은 이 기기의 브라우저 저장소에만 있어요. 광고 추적 쿠키는 쓰지 않아요.',
    ],
  },
  {
    title: '2. 쓰는 곳',
    items: [
      '계정 정보는 계정 확인과 내 프로필 표시에만 써요.',
      '게임 기록은 기기 사이 이어하기, 랭킹, 업적 · 미션, 친구 기능에 써요.',
      '통계 · 신고 · 의견 · 운영 기록은 서비스를 고치고 공정하게 운영하는 데에만 써요.',
      '개인정보를 팔거나 광고에 쓰지 않아요.',
    ],
  },
  {
    title: '3. 다른 사람에게 보이는 정보',
    items: [
      '랭킹에는 닉네임, 아바타, 칭호, 테두리, 점수가 공개돼요.',
      '로그인한 상태에서 기본 아바타를 쓰면 Google 프로필 사진이 랭킹과 공개 프로필에 보여요. 보이기 싫다면 내 프로필에서 과일 아바타를 고르세요.',
      '이메일과 Google 이름은 공개되지 않아요. 닉네임을 정하지 않으면 "과일러 1234" 같은 이름으로 보여요.',
      '로그인한 플레이어는 친구 코드나 랭킹으로 내 공개 프로필을 볼 수 있어요.',
      '친구 대결 링크를 공유하면 그 링크에 닉네임과 점수가 들어가요.',
      '친구에게는 내가 지금 온라인인지, 마지막으로 언제 접속했는지 보여요. 설정 → 알림 · 친구에서 끌 수 있고, 끄면 남아 있던 기록도 지워요. 운영진은 운영을 위해 볼 수 있어요.',
    ],
  },
  {
    title: '4. 저장하는 곳과 함께 쓰는 서비스',
    items: [
      '계정과 클라우드 데이터: Google Firebase(Authentication, Cloud Firestore).',
      '점수 확인 서버와 게임 화면: Render. 게임 화면은 GitHub Pages에서도 열려요.',
      '연속 출석 알림 발송: GitHub Actions와 각 브라우저의 푸시 서비스.',
      '글꼴: Google Fonts, jsDelivr. 이모지 그림은 앱 안에 들어 있어서 따로 불러오지 않아요.',
    ],
  },
  {
    title: '5. 보관 기간과 지우기',
    items: [
      '클라우드 기록은 계정을 쓰는 동안 보관해요.',
      '설정 → 도움 · 데이터에서 기록과 업적을 직접 초기화할 수 있어요.',
      '계정 정보, 공개 프로필, 랭킹 기록까지 모두 지우고 싶다면 "의견 · 버그 보내기"로 요청해 주세요. 확인한 뒤 지워 드려요.',
      '친구를 끊으면 친구 관계가 바로 지워져요.',
      '알림을 끄거나 로그아웃하면 알림 정보는 바로 지워지고, 40일 동안 쓰지 않은 알림 정보는 자동으로 지워져요.',
      '오늘 · 이번 주 랭킹은 기간이 끝나면 새로 시작하고, 지난 기록은 명예의 전당에 1등만 보여요.',
    ],
  },
  {
    title: '6. 만 14세 미만 이용자',
    items: ['만 14세 미만은 보호자의 동의를 받은 뒤 로그인해 주세요. 보호자가 기록 삭제를 원하면 "의견 · 버그 보내기"로 알려 주세요.'],
  },
];

/** The short version, as cards */
const SUMMARY: [string, string, string][] = [
  ['🆓', '무료 · 광고 없음', '모든 게임이 무료이고 광고와 결제가 없어요. 로그인 없이도 다 할 수 있어요.'],
  ['🔑', 'Google 로그인', '비밀번호는 Google이 처리해요. 이메일과 Google 이름은 아무에게도 공개되지 않아요.'],
  ['👀', '공개되는 것', '랭킹 · 친구에게는 닉네임 · 아바타 · 칭호 · 테두리 · 점수 · 레벨만 보여요.'],
  ['🪙', '코인은 게임 안에서만', '돈으로 바꿀 수 없고, 사고팔면 안 돼요. 선물은 하루 5번 · 300코인까지예요.'],
  ['⚖️', '공정하게', '조작 · 매크로 · 욕설 이름은 안 돼요. 운영진이 기록을 지우거나 프로필을 바꿀 수 있어요.'],
  ['🗑️', '지울 수 있어요', '설정에서 기록을 직접 지우고, 계정 삭제는 의견 보내기로 요청해요.'],
];

type Tab = 'summary' | 'terms' | 'privacy';

const Sections: React.FC<{ list: Section[] }> = ({ list }) => (
  <div className="space-y-2">
    {list.map((s, i) => (
      <details key={s.title} open={i === 0} className="group rounded-2xl border-2 border-line bg-surface-2 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-3 font-display text-base">
          {s.title}
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180" strokeWidth={2.5} />
        </summary>
        <ul className="list-disc space-y-1.5 px-3.5 pb-3.5 pl-8 text-sm leading-relaxed text-ink-2 marker:text-ink-3">
          {s.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    ))}
  </div>
);

export const TermsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<Tab>('summary');
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="이용약관 · 개인정보" subtitle={`시행일 ${TERMS_DATE}`} icon="📜" tone="grape" size="lg">
      <div role="tablist" aria-label="문서" className="mb-3 grid grid-cols-3 gap-1.5">
        {(
          [
            ['summary', '✨ 핵심 요약'],
            ['terms', '📜 이용약관'],
            ['privacy', '🔒 개인정보'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-2xl border-2 border-line px-2 py-2 text-sm font-bold transition-all ${
              tab === id ? '-translate-y-0.5 bg-grape text-white shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="space-y-3">
          <p className="well p-3.5 text-sm text-ink-2">로그인하면 이용약관과 개인정보 처리방침에 동의하는 것으로 봐요. 로그인하지 않아도 모든 게임을 할 수 있어요.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {SUMMARY.map(([icon, title, text]) => (
              <li key={title} className="flex items-start gap-3 rounded-2xl border-2 border-line bg-surface-2 p-3">
                <span className="w-8 shrink-0 text-center text-2xl leading-none" aria-hidden="true">
                  {icon}
                </span>
                <div>
                  <p className="text-sm font-bold">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{text}</p>
                </div>
              </li>
            ))}
          </ul>
          <section className="rounded-2xl border-2 border-dashed border-line bg-mango-soft p-3.5">
            <p className="text-sm font-bold">🆕 바뀐 점 ({TERMS_DATE})</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-relaxed text-ink-2">
              {CHANGES.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-sm" onClick={() => setTab('terms')}>
              📜 이용약관 전체
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setTab('privacy')}>
              🔒 개인정보 전체
            </button>
          </div>
        </div>
      )}
      {tab === 'terms' && <Sections list={TERMS} />}
      {tab === 'privacy' && <Sections list={PRIVACY} />}
    </Modal>
  );
};
