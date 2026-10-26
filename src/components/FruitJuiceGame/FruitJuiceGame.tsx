import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, RotateCcw, Trash2 } from 'lucide-react';
import { GameResult, GameReward, GameSettings } from '../../types';
import { GAMES } from '../../constants';
import { playSound } from '../../utils/audio';
import { HAPTIC, vibrate } from '../../utils/haptics';
import { celebrate } from '../../utils/fx';
import { Rng, randomSeed, seededRandom } from '../../utils/rng';
import { formatNumber, formatTime } from '../../utils/format';
import { BoardOverlay, GameFrame, Hud, HudStat, ScreenOverlay } from '../game/GameFrame';
import { StartCard } from '../game/StartCard';
import { ResultCard } from '../game/ResultCard';
import { skinPiece } from '../../utils/skins';
import { Emoji } from '../ui/Emoji';

/** The fruit bins, in the order they open up */
const FRUITS = ['🍓', '🍌', '🍊', '🍇', '🍋', '🍉', '🥝', '🍍'];
const NAMES: Record<string, string> = { '🍓': '딸기', '🍌': '바나나', '🍊': '오렌지', '🍇': '포도', '🍋': '레몬', '🍉': '수박', '🥝': '키위', '🍍': '파인애플' };
const GUESTS = ['🐻', '🐰', '🐱', '🐶', '🐼', '🦊', '🐸', '🐷', '🐯', '🐨', '🐵', '🦁'];
const HEARTS = 3;
const SLOTS = 3;
const BLENDER_MAX = 4;
/** Juices to the next level */
const PER_LEVEL = 5;
/** Points per fruit in the order, plus up to SPEED_BONUS for a quick serve; a streak multiplies (up to ×2) */
const FRUIT_POINTS = 10;
const SPEED_BONUS = 10;

/** What a level asks for: open bins, order sizes, repeats, patience (s), time between guests (s), guests at once */
function levelRules(level: number) {
  return {
    fruits: Math.min(FRUITS.length, 3 + level),
    minSize: level >= 4 ? 2 : 1,
    maxSize: Math.min(BLENDER_MAX, 1 + Math.ceil(level / 2)),
    repeats: level >= 3,
    patience: Math.max(9, 20 - level * 1.2),
    gap: Math.max(2.6, 6.5 - level * 0.45),
    slots: level >= 3 ? SLOTS : 2,
  };
}

/** Same fruits, any order */
const sameJuice = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** For each fruit of the order: is it in the jar already? (each fruit in the jar counts once) */
function ticks(order: string[], jar: string[]): boolean[] {
  const left = [...jar];
  return order.map((f) => {
    const i = left.indexOf(f);
    if (i < 0) return false;
    left.splice(i, 1);
    return true;
  });
}

/** Everything in the jar belongs to this order: the juice is on its way to this guest */
function fits(order: string[], jar: string[]): boolean {
  const left = [...order];
  return jar.every((f) => {
    const i = left.indexOf(f);
    if (i < 0) return false;
    left.splice(i, 1);
    return true;
  });
}

/** Juice colours, mixed in the jar */
const JUICE: Record<string, [number, number, number]> = {
  '🍓': [255, 77, 109],
  '🍌': [255, 224, 102],
  '🍊': [255, 159, 28],
  '🍇': [155, 89, 182],
  '🍋': [255, 241, 118],
  '🍉': [255, 107, 129],
  '🥝': [139, 195, 74],
  '🍍': [255, 197, 61],
};
const mixed = (jar: string[]) => {
  const c = [0, 1, 2].map((k) => Math.round(jar.reduce((n, f) => n + JUICE[f][k], 0) / jar.length));
  return `rgb(${c.join(', ')})`;
};

interface Guest {
  id: number;
  face: string;
  order: string[];
  /** Game clock (s) when they came in, and how long they wait */
  arrive: number;
  patience: number;
  mood: 'wait' | 'happy' | 'angry';
  /** Game clock when a leaving guest disappears */
  gone: number;
  /** Their seat at the counter (guests don't shuffle when someone leaves) */
  slot: number;
}

interface Props {
  settings: GameSettings;
  dark: boolean;
  best: number;
  /** Start the round right away instead of showing the start card */
  autoStart?: boolean;
  isPaused: boolean;
  onUnlockAchieve: (id: string) => void;
  onGameComplete: (result: GameResult) => GameReward;
  onRoundChange: (active: boolean) => void;
  onExit: () => void;
  onHelp?: () => void;
  /** Same seed → the same guests and orders (friend challenges) */
  seed?: string;
  onRoundSeed?: (seed: string) => void;
}

export const FruitJuiceGame: React.FC<Props> = ({
  settings,
  best,
  autoStart = false,
  isPaused,
  onUnlockAchieve,
  onGameComplete,
  onRoundChange,
  onExit,
  onHelp,
  seed,
  onRoundSeed,
}) => {
  const rngRef = useRef<Rng>(Math.random);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'OVER'>('IDLE');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [blender, setBlender] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(HEARTS);
  const [served, setServed] = useState(0);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [news, setNews] = useState<{ text: string; key: number } | null>(null);
  const [shake, setShake] = useState(0);
  const [reward, setReward] = useState<GameReward | null>(null);
  const [ending, setEnding] = useState<{ served: number; maxCombo: number; level: number } | null>(null);
  // Re-renders the patience bars a few times a second
  const [, setTick] = useState(0);

  // Round state for the clock loop and the taps
  const clockRef = useRef(0);
  const guestsRef = useRef<Guest[]>([]);
  const blenderRef = useRef<string[]>([]);
  const nextGuestRef = useRef(0);
  /** When the wait for the next guest began (for the "다음 손님" bar) */
  const lastGuestRef = useRef(0);
  const idRef = useRef(0);
  const levelRef = useRef(1);
  const servedRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const heartsRef = useRef(HEARTS);
  const scoreRef = useRef(0);
  const endAtRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const floatsRef = useRef<{ id: number; slot: number; text: string; good: boolean }[]>([]);
  const [floats, setFloats] = useState<{ id: number; slot: number; text: string; good: boolean }[]>([]);

  const live = useRef({ onUnlockAchieve, onGameComplete, settings });
  live.current = { onUnlockAchieve, onGameComplete, settings };
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const show = (f: string) => skinPiece(settings.suikaSkin, FRUITS, f);

  const sync = () => {
    setGuests([...guestsRef.current]);
    setBlender([...blenderRef.current]);
  };

  // Dev server only (compiled out of real builds): lets browser tests read the orders
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__juiceTest = {
      state: () => ({
        guests: guestsRef.current.map((g) => ({ order: g.order, mood: g.mood, left: g.patience - (clockRef.current - g.arrive) })),
        blender: blenderRef.current,
        level: levelRef.current,
        hearts: heartsRef.current,
        score: scoreRef.current,
      }),
    };
  }, []);

  useEffect(() => {
    onRoundChange(gameState === 'PLAYING');
  }, [gameState, onRoundChange]);

  useEffect(
    () => () => {
      isPlayingRef.current = false;
    },
    []
  );

  const handleStartGame = () => {
    const roundSeed = seed ?? randomSeed();
    rngRef.current = seededRandom(roundSeed);
    onRoundSeed?.(roundSeed);
    clockRef.current = 0;
    guestsRef.current = [];
    blenderRef.current = [];
    nextGuestRef.current = 0.6;
    lastGuestRef.current = 0;
    idRef.current = 0;
    levelRef.current = 1;
    servedRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    heartsRef.current = HEARTS;
    scoreRef.current = 0;
    endAtRef.current = null;
    floatsRef.current = [];
    setFloats([]);
    setGuests([]);
    setBlender([]);
    setScore(0);
    setHearts(HEARTS);
    setServed(0);
    setLevel(1);
    setCombo(0);
    setElapsed(0);
    setNews(null);
    setReward(null);
    setEnding(null);
    setGameState('PLAYING');
    isPlayingRef.current = true;
    playSound('click', settings);
  };

  // "한 판 더" and "처음부터" skip the start card
  useEffect(() => {
    if (autoStart) handleStartGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const float = (slot: number, text: string, good: boolean) => {
    const f = { id: ++idRef.current, slot, text, good };
    floatsRef.current = [...floatsRef.current, f];
    setFloats(floatsRef.current);
    setTimeout(() => {
      floatsRef.current = floatsRef.current.filter((x) => x.id !== f.id);
      setFloats(floatsRef.current);
    }, 900);
  };

  const finishRound = useCallback(() => {
    const { settings: s, onUnlockAchieve: unlock, onGameComplete: complete } = live.current;
    setEnding({ served: servedRef.current, maxCombo: maxComboRef.current, level: levelRef.current });
    setGameState('OVER');
    playSound('over', s);
    vibrate(HAPTIC.over, s);
    if (scoreRef.current >= 1000) unlock('juice_1000');
    const r = complete({ game: 'juice', score: scoreRef.current, seconds: Math.round(clockRef.current) });
    setReward(r);
    if (r.newBest && s.celebrateEffect) celebrate();
  }, []);

  /** A new guest in the first free seat, with an order from the open bins (seeded dice); false when every seat is taken */
  const spawnGuest = () => {
    const rand = rngRef.current;
    const rules = levelRules(levelRef.current);
    const taken = guestsRef.current.map((g) => g.slot);
    const slot = Array.from({ length: rules.slots }, (_, i) => i).find((i) => !taken.includes(i));
    if (slot === undefined) return false;
    const open = FRUITS.slice(0, rules.fruits);
    const size = rules.minSize + Math.floor(rand() * (rules.maxSize - rules.minSize + 1));
    const order: string[] = [];
    while (order.length < size) {
      const f = open[Math.floor(rand() * open.length)];
      if (rules.repeats || !order.includes(f)) order.push(f);
    }
    const used = guestsRef.current.map((g) => g.face);
    let face = GUESTS[Math.floor(rand() * GUESTS.length)];
    if (used.includes(face)) face = GUESTS.find((g) => !used.includes(g)) ?? face;
    guestsRef.current = [...guestsRef.current, { id: ++idRef.current, face, order, arrive: clockRef.current, patience: rules.patience, mood: 'wait', gone: 0, slot }];
    return true;
  };

  const loseHeart = () => {
    heartsRef.current -= 1;
    setHearts(heartsRef.current);
    comboRef.current = 0;
    setCombo(0);
    if (heartsRef.current <= 0 && endAtRef.current === null) {
      isPlayingRef.current = false;
      endAtRef.current = clockRef.current + 1.1;
    }
  };

  // The shop clock: guests come in, run out of patience and leave
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastTick = 0;
    const loop = (time: number) => {
      const dt = Math.min((time - last) / 1000, 0.1);
      last = time;
      if (!isPaused && (isPlayingRef.current || endAtRef.current !== null)) {
        clockRef.current += dt;
        const now = clockRef.current;
        let changed = false;
        if (isPlayingRef.current) {
          const rules = levelRules(levelRef.current);
          if (now >= nextGuestRef.current) {
            if (spawnGuest()) {
              lastGuestRef.current = now;
              nextGuestRef.current = now + rules.gap;
              changed = true;
            } else nextGuestRef.current = now + 0.4;
          }
          for (const g of guestsRef.current) {
            if (g.mood === 'wait' && now - g.arrive >= g.patience) {
              g.mood = 'angry';
              g.gone = now + 0.9;
              changed = true;
              float(g.slot, '너무 늦어요!', false);
              playSound('wrong', live.current.settings);
              vibrate(HAPTIC.wrong, live.current.settings);
              loseHeart();
            }
          }
        }
        const before = guestsRef.current.length;
        guestsRef.current = guestsRef.current.filter((g) => g.mood === 'wait' || now < g.gone);
        if (guestsRef.current.length !== before) changed = true;
        if (changed) sync();
        if (endAtRef.current !== null && now >= endAtRef.current) {
          endAtRef.current = null;
          finishRound();
        }
        if (time - lastTick > 100) {
          lastTick = time;
          setTick((t) => t + 1);
          setElapsed(Math.floor(now));
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, finishRound]);

  const addFruit = (f: string) => {
    if (!isPlayingRef.current || isPausedRef.current) return;
    if (FRUITS.indexOf(f) >= levelRules(levelRef.current).fruits) return;
    if (blenderRef.current.length >= BLENDER_MAX) {
      setShake((n) => n + 1);
      playSound('wrong', settings);
      return;
    }
    blenderRef.current = [...blenderRef.current, f];
    setBlender(blenderRef.current);
    playSound('flip', settings);
    vibrate(HAPTIC.tap, settings);
  };

  const emptyBlender = () => {
    if (!blenderRef.current.length) return;
    blenderRef.current = [];
    setBlender([]);
    playSound('drop', settings);
  };

  /** Hand the juice to a guest: the right one pays (faster = more), the wrong one loses patience */
  const serve = (id: number) => {
    if (!isPlayingRef.current || isPausedRef.current) return;
    const g = guestsRef.current.find((x) => x.id === id);
    if (!g || g.mood !== 'wait') return;
    const slot = g.slot;
    if (!blenderRef.current.length) {
      float(slot, '과일을 먼저 넣어요', false);
      return;
    }
    const now = clockRef.current;
    if (sameJuice(blenderRef.current, g.order)) {
      const left = Math.max(0, 1 - (now - g.arrive) / g.patience);
      comboRef.current += 1;
      maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
      const points = Math.round((FRUIT_POINTS * g.order.length + Math.round(SPEED_BONUS * left)) * (1 + 0.1 * Math.min(10, comboRef.current - 1)));
      scoreRef.current += points;
      servedRef.current += 1;
      g.mood = 'happy';
      g.gone = now + 0.7;
      blenderRef.current = [];
      setScore(scoreRef.current);
      setServed(servedRef.current);
      setCombo(comboRef.current);
      float(slot, comboRef.current >= 3 ? `+${points} · ${comboRef.current}연속!` : `+${points}`, true);
      playSound(comboRef.current >= 3 ? 'combo' : 'match', settings);
      vibrate(HAPTIC.match, settings);
      if (servedRef.current >= 20) live.current.onUnlockAchieve('juice_20');
      if (comboRef.current >= 10) live.current.onUnlockAchieve('juice_combo_10');
      // Level up: a new fruit bin, bigger orders, less patience
      if (servedRef.current % PER_LEVEL === 0) {
        const before = levelRules(levelRef.current).fruits;
        levelRef.current += 1;
        setLevel(levelRef.current);
        const fresh = FRUITS.slice(before, levelRules(levelRef.current).fruits);
        setNews({ text: `LV.${levelRef.current}${fresh.length ? ` · ${fresh.map((f) => NAMES[f]).join(' · ')} 들어왔어요!` : ' · 손님이 더 바빠져요!'}`, key: Date.now() });
        playSound('levelup', settings);
      }
    } else {
      // The wrong juice: poured away, and the guest waits less patiently
      g.arrive -= g.patience * 0.3;
      comboRef.current = 0;
      setCombo(0);
      blenderRef.current = [];
      float(slot, '이게 아니에요!', false);
      setShake((n) => n + 1);
      playSound('wrong', settings);
      vibrate(HAPTIC.wrong, settings);
    }
    sync();
  };

  // Keys: 1–8 add fruit, Enter serves the guest the juice is for, Backspace empties; Space/Enter starts
  // No guest ordered what's in the jar: a shake, never a wrong juice handed out by key
  const nudge = () => {
    setShake((n) => n + 1);
    playSound('wrong', settings);
  };
  const keyRef = useRef({ addFruit, serve, emptyBlender, nudge, start: handleStartGame });
  keyRef.current = { addFruit, serve, emptyBlender, nudge, start: handleStartGame };
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (isPausedRef.current || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = keyRef.current;
      if (gameStateRef.current === 'IDLE') {
        if ((e.code === 'Space' || e.code === 'Enter') && !(e.target as HTMLElement | null)?.closest?.('button')) {
          e.preventDefault();
          k.start();
        }
        return;
      }
      if (gameStateRef.current !== 'PLAYING') return;
      const n = Number(e.key);
      if (n >= 1 && n <= FRUITS.length) {
        e.preventDefault();
        k.addFruit(FRUITS[n - 1]);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        k.emptyBlender();
      } else if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        const g = guestsRef.current.find((x) => x.mood === 'wait' && sameJuice(blenderRef.current, x.order));
        if (g) k.serve(g.id);
        else if (blenderRef.current.length) k.nudge();
      }
    };
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
  }, []);

  const rules = levelRules(level);
  const now = clockRef.current;
  const seats = Math.max(rules.slots, ...guests.map((g) => g.slot + 1));
  const waiting = guests.filter((g) => g.mood === 'wait');
  // A jar nobody ordered: say so, so it gets emptied
  const unwanted = blender.length > 0 && !waiting.some((g) => fits(g.order, blender));
  const nextIn = Math.max(0, Math.min(1, (now - lastGuestRef.current) / Math.max(0.1, nextGuestRef.current - lastGuestRef.current)));
  const firstFree = Array.from({ length: seats }, (_, i) => i).find((i) => !guests.some((g) => g.slot === i));
  const levelCups = served % PER_LEVEL;

  return (
    <>
      <GameFrame
        hud={
          <Hud>
            <HudStat label="점수" value={formatNumber(score)} />
            <HudStat label="최고" value={formatNumber(Math.max(best, score))} tone={best > 0 && score > best ? 'hot' : 'default'} />
            <HudStat
              label="목숨"
              value={
                <span className="text-[0.7em] tracking-[-0.12em]" aria-label={`${hearts}개 남음`}>
                  {'❤️'.repeat(Math.max(0, hearts)) + '🤍'.repeat(Math.max(0, HEARTS - hearts))}
                </span>
              }
              tone={hearts === 1 && gameState === 'PLAYING' ? 'warn' : 'default'}
            />
            <HudStat label="주스" value={`🧃${served}`} />
          </Hud>
        }
        board={
          <div className="board-fit w-full" style={{ maxWidth: 'calc((100dvh - var(--board-offset)) * 0.7333)' }}>
            <div className="@container relative aspect-[440/600] w-full select-none overflow-clip rounded-[28px] border-2 border-line bg-[#ffe9d6] shadow-pop dark:bg-[#3a2a3f]">
              {/* Awning with a scalloped edge, and the shop's wall */}
              <div
                className="absolute inset-x-0 top-0 h-[6%] border-b-2 border-line"
                style={{ background: 'repeating-linear-gradient(90deg, #ff6b8b 0 12.5%, #fff4e8 12.5% 25%)' }}
                aria-hidden="true"
              />
              <div
                className="absolute inset-x-0 top-[6%] h-[2.2%]"
                style={{ background: 'radial-gradient(circle at 50% 0, #ff6b8b 0 56%, transparent 60%) 0 0 / 12.5% 100% repeat-x' }}
                aria-hidden="true"
              />
              <div className="dots absolute inset-x-0 top-[8.2%] h-[41.8%] opacity-40" aria-hidden="true" />

              {/* Level, streak and how many juices to the next level */}
              {gameState !== 'IDLE' && (
                <div className="absolute inset-x-[3%] top-[9.5%] z-10 flex items-center justify-between gap-[2cqw]">
                  <span className="flex items-center gap-[1.5cqw]">
                    <span className="chip h-[7cqw] bg-surface px-[2.5cqw] font-display text-[3.8cqw]">LV.{level}</span>
                    {combo >= 2 && (
                      <span key={combo} className="chip h-[7cqw] bg-berry px-[2.5cqw] font-display text-[3.6cqw] text-white animate-pop-in">
                        🔥 {combo}연속
                      </span>
                    )}
                  </span>
                  <span className="chip h-[7cqw] gap-[1.2cqw] bg-surface px-[2.5cqw] text-[3cqw] font-bold" aria-label={`다음 레벨까지 주스 ${PER_LEVEL - levelCups}잔`}>
                    <span className="text-ink-3">다음 레벨</span>
                    <span className="flex gap-[0.4cqw] text-[3.8cqw] leading-none" aria-hidden="true">
                      {Array.from({ length: PER_LEVEL }, (_, i) => (
                        <span key={i} className={i < levelCups ? '' : 'opacity-25 grayscale'}>
                          <Emoji e="🧃" />
                        </span>
                      ))}
                    </span>
                  </span>
                </div>
              )}

              {/* Seats: a guest keeps theirs until they leave; an empty one shows the next guest coming */}
              <ul className="absolute inset-x-[2%] top-[17%] grid h-[32%] gap-[2%]" style={{ gridTemplateColumns: `repeat(${seats}, minmax(0, 1fr))` }}>
                {Array.from({ length: seats }, (_, slot) => {
                  const g = guests.find((x) => x.slot === slot);
                  if (!g) {
                    const next = gameState === 'PLAYING' && slot === firstFree;
                    return (
                      <li key={`seat-${slot}`} className="flex flex-col items-center justify-end pb-[3cqw]" aria-hidden="true">
                        <span className="grid aspect-square w-[62%] max-w-[17cqw] place-items-center rounded-full border-2 border-dashed border-ink-3/40 text-center text-[2.8cqw] font-bold leading-tight text-ink-3">
                          {next ? (
                            <>
                              다음
                              <br />
                              손님
                            </>
                          ) : (
                            '빈 자리'
                          )}
                        </span>
                        {next && (
                          <span className="mt-[1.5cqw] h-[1.6cqw] w-[55%] overflow-hidden rounded-full bg-surface/80">
                            <span className="block h-full rounded-full bg-ink-3/50" style={{ width: `${nextIn * 100}%` }} />
                          </span>
                        )}
                      </li>
                    );
                  }
                  const left = g.mood === 'wait' ? Math.max(0, 1 - (now - g.arrive) / g.patience) : 0;
                  const ready = g.mood === 'wait' && blender.length > 0 && sameJuice(blender, g.order);
                  const making = g.mood === 'wait' && blender.length > 0 && !ready && fits(g.order, blender);
                  const marks = ticks(g.order, blender);
                  return (
                    <li key={g.id} className="relative flex min-w-0 flex-col items-center justify-end animate-pop-in">
                      <button
                        type="button"
                        onClick={() => serve(g.id)}
                        disabled={g.mood !== 'wait' || gameState !== 'PLAYING'}
                        aria-label={`손님 주문: ${g.order.map((f) => NAMES[f]).join(', ')}. 눌러서 주스 주기`}
                        className={`flex w-full flex-col items-center gap-[1.2cqw] rounded-[4cqw] p-[1cqw] transition-transform ${
                          g.mood === 'happy' ? 'animate-pop-in' : g.mood === 'angry' ? 'opacity-60' : left < 0.3 ? 'animate-wiggle' : ''
                        } ${ready ? '-translate-y-[1.5cqw]' : ''}`}
                      >
                        {/* Order bubble: fruit already in the jar get a tick */}
                        <span
                          className={`relative flex min-h-[10cqw] flex-wrap items-center justify-center gap-[0.8cqw] rounded-[3cqw] border-2 border-line px-[1.8cqw] py-[1.2cqw] text-[6.2cqw] leading-none ${
                            ready ? 'bg-melon-soft ring-4 ring-melon' : making ? 'bg-mango-soft' : 'bg-surface'
                          }`}
                        >
                          {g.mood === 'happy' ? (
                            <span className="text-[3.8cqw] font-bold">맛있어요! 😋</span>
                          ) : g.mood === 'angry' ? (
                            <span className="text-[3.8cqw] font-bold">흥! 😠</span>
                          ) : (
                            g.order.map((f, i) => (
                              <span key={i} className="relative">
                                <Emoji e={show(f)} />
                                {marks[i] && (
                                  <span className="absolute -bottom-[0.8cqw] -right-[0.8cqw] grid h-[3.4cqw] w-[3.4cqw] place-items-center rounded-full border border-line bg-melon text-white">
                                    <Check className="h-[2.4cqw] w-[2.4cqw]" strokeWidth={4} />
                                  </span>
                                )}
                              </span>
                            ))
                          )}
                          <span className="absolute -bottom-[1.5cqw] left-1/2 h-[2.6cqw] w-[2.6cqw] -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-line bg-inherit" aria-hidden="true" />
                        </span>
                        <span className="mt-[0.5cqw] text-[14cqw] leading-none">
                          <Emoji e={g.face} />
                        </span>
                        {/* Patience */}
                        <span className="h-[2.2cqw] w-[78%] overflow-hidden rounded-full border-2 border-line bg-surface">
                          <span className={`block h-full ${left > 0.5 ? 'bg-melon' : left > 0.25 ? 'bg-mango' : 'bg-berry'}`} style={{ width: `${left * 100}%` }} />
                        </span>
                        <span className={`h-[3.6cqw] text-[3.1cqw] font-bold leading-none ${ready ? 'text-melon-ink' : 'text-ink-3'}`}>
                          {ready ? '👆 눌러서 주기!' : making ? `${marks.filter(Boolean).length} / ${g.order.length}` : ''}
                        </span>
                      </button>
                      {floats
                        .filter((f) => f.slot === slot)
                        .map((f) => (
                          <span
                            key={f.id}
                            className={`pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-[2cqw] py-[0.5cqw] font-display text-[4cqw] animate-pop-in ${
                              f.good ? 'bg-mango text-on-bright' : 'bg-berry text-white'
                            }`}
                          >
                            {f.text}
                          </span>
                        ))}
                    </li>
                  );
                })}
              </ul>

              {/* Counter */}
              <div className="absolute inset-x-0 top-[50%] h-[4%] border-y-2 border-line" style={{ background: 'linear-gradient(#e2ab78, #c98b55 45%, #b2733d)' }} aria-hidden="true" />

              {/* The jar: the juice colour mixes as fruit goes in */}
              <div className="absolute inset-x-0 top-[56.5%] flex h-[16%] justify-center">
                <div
                  key={shake}
                  className={`relative h-full w-[30%] ${shake ? 'animate-shake' : ''}`}
                  aria-label={`믹서: ${blender.length ? blender.map((f) => NAMES[f]).join(', ') : '비어 있음'}`}
                  role="status"
                >
                  <span className="absolute -top-[1.4cqw] left-[10%] right-[10%] z-10 h-[2.6cqw] rounded-full border-2 border-line bg-surface-3" aria-hidden="true" />
                  <div className="absolute inset-0 overflow-hidden rounded-b-[7cqw] rounded-t-[2.5cqw] border-2 border-line bg-white/75 dark:bg-white/10">
                    {blender.length > 0 && (
                      <div
                        className="absolute inset-x-0 bottom-0 transition-[height,background-color] duration-300"
                        style={{ height: `${18 + (blender.length / BLENDER_MAX) * 72}%`, backgroundColor: mixed(blender), opacity: 0.55 }}
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative grid h-full place-items-center">
                      {blender.length ? (
                        <span className="grid grid-cols-2 gap-[0.6cqw] text-[6.6cqw] leading-none">
                          {blender.map((f, i) => (
                            <span key={i} className="animate-pop-in">
                              <Emoji e={show(f)} />
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="px-[2cqw] text-center text-[3cqw] font-bold leading-tight text-ink-3">
                          과일을
                          <br />
                          눌러 넣어요
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {blender.length > 0 && gameState === 'PLAYING' && (
                  <button
                    type="button"
                    onClick={emptyBlender}
                    aria-label="믹서 비우기"
                    className={`btn btn-icon absolute left-[67%] top-[30%] h-[10cqw] w-[10cqw] ${unwanted ? 'btn-primary animate-wiggle' : ''}`}
                  >
                    <Trash2 className="h-[4.4cqw] w-[4.4cqw]" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <p className="absolute inset-x-0 top-[73.2%] text-center text-[3.1cqw] font-bold leading-none" aria-live="polite">
                {unwanted ? (
                  <span className="text-berry-ink">이 주스를 원하는 손님이 없어요 · 비워요</span>
                ) : blender.length ? (
                  <span className="text-ink-3">
                    믹서 {blender.length} / {BLENDER_MAX}
                  </span>
                ) : null}
              </p>

              {/* Fruit bins: number keys in the corner; closed ones say when they open */}
              <div className="absolute inset-x-[3%] bottom-[2.5%] grid h-[20.5%] grid-cols-4 gap-[2cqw]">
                {FRUITS.map((f, i) => {
                  const open = i < rules.fruits;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => addFruit(f)}
                      disabled={!open || gameState !== 'PLAYING'}
                      aria-label={open ? `${NAMES[f]} 넣기 (${i + 1})` : `${NAMES[f]}: LV.${i - 2}에 열려요`}
                      className={`relative flex flex-col items-center justify-center rounded-[3cqw] border-2 transition-transform active:scale-95 ${
                        open ? 'border-line bg-surface shadow-hard-sm hover:-translate-y-0.5' : 'border-dashed border-ink-3/40 bg-transparent'
                      }`}
                    >
                      {open && <span className="absolute left-[1.4cqw] top-[0.8cqw] text-[2.6cqw] font-bold text-ink-3">{i + 1}</span>}
                      <span className={`text-[8.4cqw] leading-none ${open ? '' : 'opacity-35 grayscale'}`}>
                        <Emoji e={show(f)} />
                      </span>
                      <span className={`mt-[0.6cqw] text-[2.8cqw] font-bold ${open ? 'text-ink-2' : 'text-ink-3'}`}>{open ? NAMES[f] : `🔒 LV.${i - 2}`}</span>
                    </button>
                  );
                })}
              </div>

              {news && gameState === 'PLAYING' && (
                <span
                  key={news.key}
                  className="pointer-events-none absolute left-1/2 top-[49.5%] z-20 whitespace-nowrap rounded-full border-2 border-line bg-mango px-[3cqw] py-[1cqw] font-display text-[4cqw] text-on-bright animate-notice"
                  onAnimationEnd={() => setNews(null)}
                >
                  {news.text}
                </span>
              )}

              {gameState === 'IDLE' && (
                <BoardOverlay>
                  <StartCard meta={GAMES.juice} best={best} onStart={handleStartGame} onHelp={onHelp} />
                </BoardOverlay>
              )}
            </div>
          </div>
        }
        panel={
          <div className="panel space-y-3 p-4">
            <h3 className="font-display text-lg">플레이 방법</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-berry-soft text-base shadow-none" aria-hidden="true">
                  🍓
                </span>
                <span>
                  주문한 과일을 눌러 <b>믹서</b>에 넣어요 (순서는 상관없어요)
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-melon-soft text-base shadow-none" aria-hidden="true">
                  🐻
                </span>
                <span>
                  초록으로 빛나는 <b>손님을 눌러</b> 주스를 줘요
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-mango-soft text-base shadow-none" aria-hidden="true">
                  ⏱️
                </span>
                <span>
                  빨리 줄수록, <b>연속</b>으로 성공할수록 점수가 커져요
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-soda-soft text-base shadow-none" aria-hidden="true">
                  ❤️
                </span>
                <span>
                  손님이 지쳐서 가 버리면 목숨 −1, <b>3번</b>이면 가게 마감
                </span>
              </li>
            </ul>
            <div className="flex items-center justify-between gap-2">
              <p className="hidden text-xs text-ink-3 sm:block short:hidden">숫자 1–8 과일 · Enter 주기 · ⌫ 비우기</p>
              <button
                type="button"
                className="btn btn-sm ml-auto"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleStartGame();
                }}
                disabled={gameState === 'IDLE'}
              >
                <RotateCcw className="h-4 w-4" strokeWidth={2.5} /> 다시 시작
              </button>
            </div>
          </div>
        }
      />

      {gameState === 'OVER' && ending && (
        <ScreenOverlay>
          <ResultCard
            game="juice"
            emoji="🧃"
            title="가게 마감!"
            subtitle={`주스 ${ending.served}잔을 팔았어요`}
            tone="mango"
            score={score}
            stats={[
              { label: '만든 주스', value: `${ending.served}잔` },
              { label: '최고 연속', value: ending.maxCombo >= 2 ? `${ending.maxCombo}연속` : '없음' },
              { label: '레벨', value: `LV.${ending.level}` },
              { label: '영업 시간', value: formatTime(elapsed) },
            ]}
            reward={reward}
            shareText={`🧃 과일 주스 가게 ${formatNumber(score)}점! 주스 ${ending.served}잔을 팔았어요`}
            onRetry={handleStartGame}
            onExit={onExit}
          />
        </ScreenOverlay>
      )}
    </>
  );
};
