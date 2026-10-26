import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { APP_VERSION, GAME_ORDER, GAMES, TONE, Tone } from '../../constants';
import { Emoji } from '../ui/Emoji';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// What 은율 did, in six roles (no technology names: the stack is private); friends chipped in with ideas and testing
const MAKER = { emoji: '🍓', name: '은율' };
const ROLES: { icon: string; title: string; detail: string; tone: Tone }[] = [
  { icon: '🎨', title: '기획 · 디자인', detail: '게임 · 화면 디자인', tone: 'berry' },
  { icon: '🎮', title: '게임 개발', detail: `게임 ${GAME_ORDER.length}종 · 밸런스`, tone: 'mango' },
  { icon: '💻', title: '앱 개발', detail: '화면 · 서버 · 데이터', tone: 'soda' },
  { icon: '🔒', title: '보안', detail: '계정 · 기록 보호', tone: 'grape' },
  { icon: '🎵', title: '사운드', detail: '효과음 · 배경음악 · 편곡', tone: 'peach' },
  { icon: '🚀', title: '테스트 · 운영', detail: 'QA · 배포 · 업데이트', tone: 'melon' },
];
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

/** One group of friends: a centred heading over a centred row, so 3 and 4 people line up alike */
const Group: React.FC<{ label: string; people: { emoji: string; name: string }[] }> = ({ label, people }) => (
  <div>
    <p className="mb-2.5 text-center text-xs font-bold text-ink-3">{label}</p>
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-3" aria-label={label}>
      {people.map((m) => (
        <li key={m.name} className="flex w-14 flex-col items-center gap-1 text-center">
          <span className="sticker h-12 w-12 bg-surface text-2xl" aria-hidden="true">
            <Emoji e={m.emoji} />
          </span>
          <span className="font-display leading-tight">{m.name}</span>
        </li>
      ))}
    </ul>
  </div>
);

/** Movie-style credits rolling up the window; back to the credits when they end (or close the window) */
const Rolling: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 32000);
    return () => clearTimeout(t);
  }, [onDone]);
  const block = (title: string, lines: string[]) => (
    <div key={title} className="mb-10">
      <p className="mb-2 text-xs font-bold tracking-[0.2em] text-mango">{title}</p>
      {lines.map((l) => (
        <p key={l} className="font-display text-xl leading-snug">
          {l}
        </p>
      ))}
    </div>
  );
  return (
    <div className="credits-roll-box relative h-[60dvh] overflow-hidden rounded-2xl border-2 border-line bg-[#140f24] text-center text-white">
      <div className="credits-roll absolute inset-x-0 top-full px-4">
        <p className="mb-10 font-display text-3xl">🍓 FRUIT ARCADE</p>
        {block('만든 사람', [MAKER.name])}
        {block('맡은 일', ROLES.map((r) => `${r.icon} ${r.title}`))}
        {block('💡 아이디어', IDEAS.map((m) => m.name))}
        {block('🧪 테스트 · QA', TESTERS.map((m) => m.name))}
        {block('🎮 게임', GAME_ORDER.map((g) => GAMES[g].name))}
        <p className="font-display text-2xl">플레이해 주셔서 고마워요! 💖</p>
      </div>
    </div>
  );
};

export const CreditsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    if (!isOpen) setRolling(false);
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="크레딧" subtitle={`상큼 과일 아케이드 존 v${APP_VERSION}`} icon="🎬" tone="berry" size="md">
      {rolling ? (
        <Rolling onDone={() => setRolling(false)} />
      ) : (
        <div className="space-y-4">
          {/* The app */}
          <section className="dots flex items-center gap-3 rounded-2xl border-2 border-line bg-berry p-4 text-white">
            <span className="sticker h-14 w-14 shrink-0 -rotate-6 bg-surface text-3xl" aria-hidden="true">
              🍓
            </span>
            <div className="min-w-0">
              <p className="font-display text-2xl leading-tight">FRUIT ARCADE</p>
              <p className="text-xs font-bold opacity-90">과일 게임 {GAME_ORDER.length}종을 담은 작은 아케이드 · v{APP_VERSION}</p>
            </div>
          </section>

          {/* Who made it, and what they did */}
          <section className="well p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="sticker h-12 w-12 shrink-0 -rotate-6 bg-mango text-2xl" aria-hidden="true">
                {MAKER.emoji}
              </span>
              <div>
                <p className="text-[11px] font-bold text-ink-3">만든 사람</p>
                <p className="font-display text-2xl leading-tight">{MAKER.name}</p>
              </div>
            </div>
            <ul className="divide-y-2 divide-dashed divide-line rounded-2xl border-2 border-line bg-surface px-3" aria-label={`${MAKER.name}이 맡은 일`}>
              {ROLES.map((r) => (
                <li key={r.title} className="flex items-center gap-2.5 py-2">
                  <span className={`sticker h-8 w-8 shrink-0 text-base shadow-none ${TONE[r.tone].soft}`} aria-hidden="true">
                    {r.icon}
                  </span>
                  <span className="shrink-0 text-sm font-bold">{r.title}</span>
                  <span className="ml-auto min-w-0 text-right text-[11px] font-bold leading-snug text-ink-3">{r.detail}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Friends who helped */}
          <section>
            <h3 className="mb-2 font-display text-lg">🤝 함께 만든 사람들</h3>
            <div className="space-y-3 rounded-2xl border-2 border-line bg-surface-2 p-3">
              <Group label="💡 아이디어" people={IDEAS} />
              <div className="border-t-2 border-dashed border-line pt-3">
                <Group label="🧪 테스트 · QA" people={TESTERS} />
              </div>
            </div>
          </section>

          <div className="flex flex-col items-center gap-2 pt-1">
            <button type="button" className="btn btn-primary" onClick={() => setRolling(true)}>
              🎬 엔딩 크레딧 보기
            </button>
            <p className="text-center text-sm text-ink-2">플레이해 주셔서 고마워요! 💖</p>
          </div>
        </div>
      )}
    </Modal>
  );
};
