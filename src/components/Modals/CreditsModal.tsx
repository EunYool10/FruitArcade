import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { APP_VERSION, GAME_ORDER, GAMES } from '../../constants';
import { ACHIEVEMENT_COUNT } from '../../utils/achievements';
import { SHOP_ITEMS, forSale } from '../../utils/shop';
import { LEVEL_MAX } from '../../utils/progress';
import { STAGE_COUNT } from '../PuzzleGame/stages';
import { SONGS } from '../PianoGame/songs';
import { TRACK_COUNT } from '../../utils/music';
import { Emoji } from '../ui/Emoji';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// What 은율 worked on, grouped; friends chipped in with ideas and testing
const MAKER = { emoji: '🍓', name: '은율' };
const ROLES: [string, string, string[]][] = [
  ['🎨', '기획 · 디자인', ['기획', 'UI/UX 디자인']],
  ['🛠️', '개발', ['프론트엔드 개발', '게임 개발', '서버 · 데이터베이스', '보안']],
  ['🎵', '사운드', ['효과음', '배경음악', '피아노 편곡']],
  ['🚀', '운영', ['QA · 테스트', '배포 · 운영']],
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

const NUMBERS: [string, number, string][] = [
  ['🎮', GAME_ORDER.length, '게임'],
  ['🏆', ACHIEVEMENT_COUNT, '업적'],
  ['🛍️', SHOP_ITEMS.filter(forSale).length, '상점 아이템'],
  ['🎨', SHOP_ITEMS.filter((i) => i.kind === 'suikaSkin' && forSale(i)).length, '과일 스킨'],
  ['🧩', STAGE_COUNT, '퍼즐 스테이지'],
  ['🎹', SONGS.length, '피아노 곡'],
  ['🎵', TRACK_COUNT, '배경음악'],
  ['📈', LEVEL_MAX, '최고 레벨'],
];

const Person: React.FC<{ emoji: string; name: string; role: string }> = ({ emoji, name, role }) => (
  <li className="flex flex-col items-center gap-1 text-center">
    <span className="sticker h-12 w-12 bg-surface text-2xl" aria-hidden="true">
      <Emoji e={emoji} />
    </span>
    <span className="font-display leading-tight">{name}</span>
    <span className="text-[10px] font-bold text-ink-3">{role}</span>
  </li>
);

/** Movie-style credits rolling up the window */
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
        {ROLES.map(([icon, group, items]) => block(`${icon} ${group}`, items.map((i) => `${i} · ${MAKER.name}`)))}
        {block('💡 아이디어', IDEAS.map((m) => m.name))}
        {block('🧪 테스트 · QA', TESTERS.map((m) => m.name))}
        {block('🎮 게임', GAME_ORDER.map((g) => GAMES[g].name))}
        {block('🎹 과일 피아노 곡', SONGS.map((s) => `${s.name} — ${s.by}`))}
        <p className="font-display text-2xl">플레이해 주셔서 고마워요! 💖</p>
      </div>
      <button type="button" className="btn btn-sm absolute bottom-3 right-3" onClick={onDone}>
        건너뛰기
      </button>
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

          {/* Who made it */}
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
            <ul className="grid gap-2 sm:grid-cols-2" aria-label={`${MAKER.name}이 맡은 분야`}>
              {ROLES.map(([icon, group, items]) => (
                <li key={group} className="rounded-xl border-2 border-line bg-surface p-2.5">
                  <p className="text-xs font-bold">
                    {icon} {group}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    {items.map((i) => (
                      <span key={i} className="chip h-6 bg-surface-2 px-2 text-[11px]">
                        {i}
                      </span>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* In numbers */}
          <section>
            <h3 className="mb-2 font-display text-lg">📊 숫자로 보면</h3>
            <ul className="grid grid-cols-4 gap-2">
              {NUMBERS.map(([icon, n, label]) => (
                <li key={label} className="flex flex-col items-center rounded-2xl border-2 border-line bg-surface-2 px-1 py-2 text-center">
                  <span className="text-lg leading-none" aria-hidden="true">
                    {icon}
                  </span>
                  <span className="mt-1 font-display text-xl leading-none tabular-nums">{n}</span>
                  <span className="mt-0.5 text-[10px] font-bold leading-tight text-ink-3">{label}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Friends who helped */}
          <section>
            <h3 className="mb-2 font-display text-lg">🤝 함께 만든 사람들</h3>
            <div className="space-y-3 rounded-2xl border-2 border-line bg-surface-2 p-3">
              <div>
                <p className="mb-2 text-xs font-bold text-ink-3">💡 아이디어</p>
                <ul className="grid grid-cols-4 gap-2">
                  {IDEAS.map((m) => (
                    <Person key={m.name} emoji={m.emoji} name={m.name} role="아이디어" />
                  ))}
                </ul>
              </div>
              <div className="border-t-2 border-dashed border-line pt-3">
                <p className="mb-2 text-xs font-bold text-ink-3">🧪 테스트 · QA</p>
                <ul className="grid grid-cols-4 gap-2">
                  {TESTERS.map((m) => (
                    <Person key={m.name} emoji={m.emoji} name={m.name} role="테스트 · QA" />
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* The piano's songs and who wrote them */}
          <section>
            <h3 className="mb-1 font-display text-lg">🎹 과일 피아노 곡</h3>
            <p className="mb-2 text-xs text-ink-3">모두 저작권이 끝난 동요 · 캐럴 · 클래식이에요. 지은 분들께 감사해요.</p>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-1.5">
              {SONGS.map((s) => (
                <li key={s.id} className="min-w-0 rounded-xl border-2 border-line bg-surface px-2.5 py-1.5">
                  <span className="block text-xs font-bold leading-tight">{s.name}</span>
                  <span className="mt-0.5 block text-[10px] font-bold text-ink-3">{s.by}</span>
                </li>
              ))}
            </ul>
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
