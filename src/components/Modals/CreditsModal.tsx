import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FastForward, Pause } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Avatar, PlayerView } from '../ui/Avatar';
import { APP_VERSION, GAME_ORDER, GAMES, TONE, Tone } from '../../constants';
import { music } from '../../utils/music';
import { formatNumber, formatPlayTime } from '../../utils/format';
import { Emoji } from '../ui/Emoji';

/** The player, for the last card of the ending credits */
export interface CreditsPlayer {
  player: PlayerView;
  level: number;
  plays: number;
  /** Total play time in seconds */
  seconds: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  me: CreditsPlayer;
  /** Watched the ending credits to the end (a hidden achievement) */
  onFinished: () => void;
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

// The big steps so far, oldest first (version, when, what came)
const HISTORY: [string, string, string][] = [
  ['v2.0', '2026. 6.', '과일 메모리 · 수박 게임'],
  ['v2.1', '2026. 8.', 'FRUIT DASH · 구글 연동'],
  ['v3.0', '2026. 10. 12.', '새 단장 · 레벨 · 오늘의 미션'],
  ['v3.1', '2026. 10. 12.', '랭킹 · 과일 퍼즐 · 친구 대결'],
  ['v3.5', '2026. 10. 13.', '코인 · 상점'],
  ['v3.7', '2026. 10. 13.', '과일 자르기'],
  ['v3.12', '2026. 10. 14.', '친구 · 코인 선물'],
  ['v3.23', '2026. 10. 25.', '모든 게임에 과일 스킨'],
  ['v3.26', '2026. 10. 26.', '과일 피아노'],
  ['v3.32', '2026. 10. 26.', '과일 자르기 난이도'],
];

// Fruit and sparkles drifting down behind the names (fixed spots, so it looks the same every time)
const FALLERS = ['🍓', '✨', '🍊', '🍇', '✨', '🍉', '🍋', '✨', '🍑', '🍒', '✨', '🍎'].map((e, i) => ({
  e,
  left: (i * 37 + 9) % 94,
  size: e === '✨' ? 14 : 20 + ((i * 7) % 3) * 6,
  seconds: 10 + ((i * 5) % 7),
  delay: -((i * 13) % 14),
}));

/** px a second, and how much faster while held */
const SPEED = 55;
const FAST = 5;
/** A press this long (ms) is a hold, not a tap */
const HOLD_MS = 220;
/** The last card stays this long (ms) before going back to the credits */
const END_MS = 7000;

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

/**
 * Movie-style credits rolling up the window, over their own music: tap to pause, hold to fast-forward.
 * They stop on the player's own card, then go back to the credits. With "reduce motion" on they
 * stay put and scroll by hand.
 */
const Rolling: React.FC<{ me: CreditsPlayer; onFinished: () => void; onDone: () => void }> = ({ me, onFinished, onDone }) => {
  const [calm] = useState(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const boxRef = useRef<HTMLDivElement>(null);
  const rollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const [ended, setEnded] = useState(false);
  const [hint, setHint] = useState(true);
  const live = useRef({ paused, fast });
  live.current = { paused, fast };
  // Latest callbacks, so a parent re-render doesn't restart the timers
  const cb = useRef({ onFinished, onDone });
  cb.current = { onFinished, onDone };
  const finishedRef = useRef(false);
  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    cb.current.onFinished();
    setEnded(true);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  // The credits' own music while they roll; the screen's music comes back after
  useEffect(() => {
    music.playOver('credits');
    return () => music.playOver(null);
  }, []);

  useEffect(() => {
    boxRef.current?.focus({ preventScroll: true });
    const t = setTimeout(() => setHint(false), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ended || calm) return;
    const t = setTimeout(() => cb.current.onDone(), END_MS);
    return () => clearTimeout(t);
  }, [ended, calm]);

  // Roll from below the window until the last card sits in its middle
  useLayoutEffect(() => {
    const box = boxRef.current;
    const roll = rollRef.current;
    const end = endRef.current;
    if (calm || !box || !roll || !end) return;
    let y = box.clientHeight;
    let last = performance.now();
    let raf = 0;
    const place = () => {
      roll.style.transform = `translate3d(0, ${y}px, 0)`;
    };
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!live.current.paused) y -= SPEED * (live.current.fast ? FAST : 1) * dt;
      const stopAt = box.clientHeight / 2 - (end.offsetTop + end.offsetHeight / 2);
      if (y <= stopAt) {
        y = stopAt;
        place();
        finishRef.current();
        return;
      }
      place();
      raf = requestAnimationFrame(step);
    };
    place();
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [calm]);

  // Reduce motion: reaching the last card by hand counts as watching to the end
  useEffect(() => {
    const box = boxRef.current;
    const end = endRef.current;
    if (!calm || !box || !end || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && finishRef.current(), { root: box, threshold: 0.6 });
    io.observe(end);
    return () => io.disconnect();
  }, [calm]);

  // Tap: pause / play. Hold: fast-forward while held
  const hold = useRef<{ timer: number; held: boolean } | null>(null);
  const press = () => {
    if (calm || ended) return;
    const h = { held: false, timer: 0 };
    h.timer = window.setTimeout(() => {
      h.held = true;
      setFast(true);
    }, HOLD_MS);
    hold.current = h;
  };
  const release = (tap: boolean) => {
    const h = hold.current;
    hold.current = null;
    if (!h) return;
    clearTimeout(h.timer);
    if (h.held) setFast(false);
    else if (tap) setPaused((p) => !p);
  };
  const onKey = (e: React.KeyboardEvent, down: boolean) => {
    if (calm || ended) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (down && !e.repeat) setPaused((p) => !p);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      setFast(down);
    }
  };

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
  // A guest who never picked a nickname is just "you"
  const who = me.player.isGuest && me.player.name === '게스트' ? '당신' : me.player.name;
  const stats: [string, string, string][] = [
    ['🎮', `${formatNumber(me.plays)}판`, '플레이'],
    ['⏱️', formatPlayTime(me.seconds), '플레이 시간'],
    ['⭐', `Lv.${me.level}`, '레벨'],
  ];

  return (
    <div
      ref={boxRef}
      tabIndex={0}
      role="region"
      aria-label="엔딩 크레딧. 탭이나 스페이스로 일시정지, 길게 누르거나 아래 화살표로 빨리 감기"
      onPointerDown={press}
      onPointerUp={() => release(true)}
      onPointerCancel={() => release(false)}
      onPointerLeave={() => release(false)}
      onKeyDown={(e) => onKey(e, true)}
      onKeyUp={(e) => onKey(e, false)}
      onContextMenu={(e) => e.preventDefault()}
      style={{ WebkitTouchCallout: 'none' }}
      className={`credits-roll-box relative h-[60dvh] select-none rounded-2xl border-2 border-line bg-[#140f24] text-center text-white outline-none ${
        calm ? 'overflow-y-auto' : 'cursor-pointer touch-none overflow-hidden'
      } ${paused ? 'is-paused' : ''}`}
    >
      {!calm && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {FALLERS.map((f, i) => (
            <span key={i} className="credits-fall absolute inset-x-0 top-0 h-full" style={{ animationDuration: `${f.seconds}s`, animationDelay: `${f.delay}s` }}>
              <span
                className="credits-spin absolute top-0 inline-block leading-none opacity-25"
                style={{ left: `${f.left}%`, fontSize: f.size, animationDuration: `${f.seconds * 0.6}s` }}
              >
                <Emoji e={f.e} />
              </span>
            </span>
          ))}
        </div>
      )}

      <div ref={rollRef} className={`${calm ? 'relative py-10' : 'absolute inset-x-0 top-0 will-change-transform'} px-4`}>
        <p className="mb-10 font-display text-3xl">🍓 FRUIT ARCADE</p>
        {block('만든 사람', [MAKER.name])}
        {block('맡은 일', ROLES.map((r) => `${r.icon} ${r.title}`))}
        {block('💡 아이디어', IDEAS.map((m) => m.name))}
        {block('🧪 테스트 · QA', TESTERS.map((m) => m.name))}
        {block('🎮 게임', GAME_ORDER.map((g) => GAMES[g].name))}
        <div className="mb-10">
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-mango">📜 업데이트 발자취</p>
          <ol className="space-y-3">
            {HISTORY.map(([v, when, what]) => (
              <li key={v}>
                <p className="text-[11px] font-bold tracking-wider text-white/55">
                  {v} · {when}
                </p>
                <p className="font-display text-lg leading-snug">{what}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* The last card: the player */}
        <div ref={endRef} className="pt-4">
          <p className="text-xs font-bold tracking-[0.2em] text-mango">그리고,</p>
          <div className="mt-4 flex justify-center">
            <Avatar player={me.player} size="xl" />
          </div>
          <p className="mt-3 font-display text-3xl leading-tight">{who}</p>
          <p className="mt-1 text-sm text-white/75">플레이해 주셔서 고마워요! 💖</p>
          <ul className="mx-auto mt-5 grid max-w-[300px] grid-cols-3 gap-2">
            {stats.map(([icon, value, label]) => (
              <li key={label} className="rounded-2xl bg-white/10 px-1 py-2">
                <span className="block text-lg leading-none">{icon}</span>
                <span className="mt-1 block font-display text-base leading-tight tabular-nums">{value}</span>
                <span className="block text-[10px] font-bold text-white/60">{label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 font-display text-4xl tracking-[0.25em]">THE END</p>
          {/* Space kept for the badge, so the card doesn't move when it shows */}
          <p
            className={`mt-4 inline-flex items-center gap-1.5 rounded-full bg-mango px-3 py-1 text-xs font-bold text-on-bright ${ended ? 'animate-pop-in' : 'invisible'}`}
          >
            🎬 숨은 업적 · 끝까지 본 사람
          </p>
        </div>
      </div>

      {!calm && !ended && (
        <>
          {paused && (
            <span className="pointer-events-none absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-black/65 px-4 py-2 text-sm font-bold">
              <Pause className="h-4 w-4 fill-current" /> 일시정지
            </span>
          )}
          {fast && !paused && (
            <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-3 py-1 text-xs font-bold">
              <FastForward className="h-3.5 w-3.5 fill-current" /> 빨리 감기
            </span>
          )}
          <span
            className={`pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/65 px-3 py-1 text-[11px] font-bold text-white/85 transition-opacity duration-500 ${
              hint || paused ? 'opacity-100' : 'opacity-0'
            }`}
          >
            탭하면 일시정지 · 길게 누르면 빨리 감기
          </span>
        </>
      )}
    </div>
  );
};

export const CreditsModal: React.FC<Props> = ({ isOpen, onClose, me, onFinished }) => {
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    if (!isOpen) setRolling(false);
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="크레딧" subtitle={`상큼 과일 아케이드 존 v${APP_VERSION}`} icon="🎬" tone="berry" size="md">
      {rolling ? (
        <Rolling me={me} onFinished={onFinished} onDone={() => setRolling(false)} />
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
