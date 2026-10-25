import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
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
import { bladeStyle } from '../../utils/shop';
import { drawEmoji, preloadEmoji } from '../../utils/emoji';
import { skinPiece } from '../../utils/skins';

const CW = 440;
const CH = 600;
/** px per frame², 60 frames a second */
const GRAVITY = 0.25;
const LIVES = 3;
const FRUIT_POINTS = 10;
const STAR_POINTS = 50;
/** Combo bonus per fruit when one stroke cuts 3 or more */
const COMBO_BONUS = 10;
/** Cuts this close together (ms) in one stroke make one combo */
const COMBO_MS = 260;
/** The blade only cuts when it moves at least this fast (canvas px per ms) */
const MIN_SPEED = 0.22;
const TRAIL_MS = 140;
/** Frames of slow motion after cutting ice */
const ICE_FRAMES = 300;
const ICE_PACE = 0.45;
/** Frames before the first wave */
const START_DELAY = 50;

type Kind = 'fruit' | 'bomb' | 'star' | 'ice';

const FRUITS = [
  { emoji: '🍎', juice: '#ff4d4f', r: 27 },
  { emoji: '🍊', juice: '#ff9c2a', r: 27 },
  { emoji: '🍋', juice: '#ffd43b', r: 25 },
  { emoji: '🍉', juice: '#ff4d6d', r: 34 },
  { emoji: '🍍', juice: '#ffc53d', r: 31 },
  { emoji: '🥝', juice: '#8bc34a', r: 24 },
  { emoji: '🍑', juice: '#ff9c8a', r: 26 },
  { emoji: '🍇', juice: '#9254de', r: 27 },
  { emoji: '🍓', juice: '#ff3b5c', r: 23 },
  { emoji: '🥭', juice: '#ffa940', r: 28 },
];

const SPECIAL: Record<Exclude<Kind, 'fruit'>, { emoji: string; juice: string; r: number }> = {
  bomb: { emoji: '💣', juice: '#3a3150', r: 26 },
  star: { emoji: '⭐', juice: '#ffd23f', r: 24 },
  ice: { emoji: '❄️', juice: '#8fd8ff', r: 25 },
};

preloadEmoji([...FRUITS.map((f) => f.emoji), ...Object.values(SPECIAL).map((s) => s.emoji)]);
/** The fruit in order, for the shop's fruit skins */
const SLICE_FRUITS = FRUITS.map((f) => f.emoji);

interface Flyer {
  kind: Kind;
  emoji: string;
  juice: string;
  r: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
}

/** One half of a cut fruit: the emoji clipped along the cut */
interface Half {
  emoji: string;
  juice: string;
  r: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  /** Cut direction in the fruit's own frame */
  cut: number;
  side: 1 | -1;
  life: number;
}

interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  life: number;
  max: number;
}

interface Splat {
  x: number;
  y: number;
  color: string;
  life: number;
  blobs: { dx: number; dy: number; r: number }[];
}

interface Launch {
  delay: number;
  flyer: Flyer;
}

const BOARD = {
  light: {
    wood: '#ffdca6',
    plank: '#f8cf91',
    seam: 'rgba(122, 72, 24, 0.3)',
    grain: 'rgba(122, 72, 24, 0.1)',
    knot: 'rgba(122, 72, 24, 0.16)',
    outline: '#2b2140',
    blade: '46, 169, 255',
    glow: 0.65,
    ice: 'rgba(143, 216, 255, 0.16)',
  },
  dark: {
    wood: '#2c2350',
    plank: '#261e47',
    seam: 'rgba(0, 0, 0, 0.45)',
    grain: 'rgba(255, 244, 228, 0.05)',
    knot: 'rgba(255, 244, 228, 0.07)',
    outline: '#07050c',
    blade: '143, 216, 255',
    glow: 0.5,
    ice: 'rgba(143, 216, 255, 0.12)',
  },
};


/** A cutting board of five planks, painted once per theme */
function paintBoard(c: CanvasRenderingContext2D, P: (typeof BOARD)['light']) {
  c.fillStyle = P.wood;
  c.fillRect(0, 0, CW, CH);
  const W = CW / 5;
  for (let i = 0; i < 5; i++) {
    if (i % 2) {
      c.fillStyle = P.plank;
      c.fillRect(i * W, 0, W, CH);
    }
    c.strokeStyle = P.grain;
    c.lineWidth = 1.5;
    for (let g = 0; g < 4; g++) {
      const gx = i * W + 12 + g * 19 + ((i * 7 + g * 3) % 5);
      c.beginPath();
      for (let y = 0; y <= CH; y += 20) {
        const x = gx + Math.sin((y + i * 60 + g * 25) / 70) * 3;
        if (y === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    c.fillStyle = P.knot;
    c.beginPath();
    c.ellipse(i * W + W / 2 + ((i * 13) % 20) - 10, 80 + ((i * 137) % 440), 6, 11, 0, 0, Math.PI * 2);
    c.fill();
    if (i > 0) {
      c.fillStyle = P.seam;
      c.fillRect(i * W - 1, 0, 2, CH);
    }
  }
}

/** Thrown from below the board in an arc that peaks inside it. Always draws 5 numbers so challenge seeds replay the same. */
function launch(rand: Rng, kind: Kind): Flyer {
  const pick = rand();
  const def = kind === 'fruit' ? FRUITS[Math.floor(pick * FRUITS.length)] : SPECIAL[kind];
  const x0 = 50 + rand() * (CW - 100);
  const x1 = Math.max(40, Math.min(CW - 40, x0 + (rand() - 0.5) * 260));
  const apex = 60 + rand() * 180;
  const y0 = CH + def.r + 4;
  const vy = -Math.sqrt(2 * GRAVITY * (y0 - apex));
  const air = (-2 * vy) / GRAVITY;
  return { kind, emoji: def.emoji, juice: def.juice, r: def.r, x: x0, y: y0, vx: (x1 - x0) / air, vy, rot: 0, spin: (rand() - 0.5) * 0.12 };
}

/** Wave n: more fruit, more bombs, sometimes all thrown at once */
function makeWave(rand: Rng, n: number): Launch[] {
  const count = 1 + Math.floor(rand() * (1.5 + Math.min(3.5, n / 12)));
  const together = rand() < 0.35;
  const bombChance = n < 4 ? 0 : Math.min(0.2, 0.08 + n * 0.003);
  const out: Launch[] = [];
  let delay = 0;
  for (let i = 0; i < count; i++) {
    const roll = rand();
    const kind: Kind = roll < bombChance ? 'bomb' : roll > 0.965 ? 'star' : n >= 8 && roll > 0.94 ? 'ice' : 'fruit';
    out.push({ delay, flyer: launch(rand, kind) });
    delay += together ? 0 : 8 + rand() * 10;
  }
  return out;
}

/** Frames until the next wave: from ~1.6 s down to ~0.8 s */
const waveGap = (n: number) => Math.max(50, 95 - n);

function segmentHitsCircle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, r: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / len2)) : 0;
  const px = ax + t * dx - cx;
  const py = ay + t * dy - cy;
  return px * px + py * py <= r * r;
}

const hearts = (n: number) => '❤️'.repeat(Math.max(0, n)) + '🤍'.repeat(Math.max(0, LIVES - n));

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
  /** Same seed → same fruit thrown in the same order (friend challenges) */
  seed?: string;
  onRoundSeed?: (seed: string) => void;
}

export const FruitSliceGame: React.FC<Props> = ({
  settings,
  dark,
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'OVER'>('IDLE');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [cutCount, setCutCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState<{ cause: 'bomb' | 'lives'; missed: number } | null>(null);
  const [reward, setReward] = useState<GameReward | null>(null);

  // Mutable round state for the animation loop and the blade
  const flyersRef = useRef<Flyer[]>([]);
  const queueRef = useRef<Launch[]>([]);
  const halvesRef = useRef<Half[]>([]);
  const dropsRef = useRef<Drop[]>([]);
  const splatsRef = useRef<Splat[]>([]);
  const floatsRef = useRef<{ x: number; y: number; text: string; big: boolean; life: number }[]>([]);
  const missesRef = useRef<{ x: number; life: number }[]>([]);
  const trailRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const bladeRef = useRef({ down: false, x: 0, y: 0, t: 0 });
  const comboRef = useRef({ count: 0, at: 0, x: 0, y: 0 });
  const waveRef = useRef({ timer: START_DELAY, n: 0 });
  const iceRef = useRef(0);
  const flashRef = useRef(0);
  const shakeRef = useRef(0);
  const endRef = useRef<{ cause: 'bomb' | 'lives'; frames: number } | null>(null);
  const isPlayingRef = useRef(false);
  const scoreRef = useRef(0);
  const livesRef = useRef(LIVES);
  const cutRef = useRef(0);
  const missedRef = useRef(0);
  const maxComboRef = useRef(0);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animFrameRef = useRef<number | null>(null);
  const boardCacheRef = useRef<{ dark: boolean; ratio: number; canvas: HTMLCanvasElement } | null>(null);

  // Latest callbacks/values for code running inside the animation loop
  const live = useRef({ onUnlockAchieve, onGameComplete, settings });
  live.current = { onUnlockAchieve, onGameComplete, settings };
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  // Dev server only (compiled out of real builds): lets browser tests see where things fly
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__sliceTest = {
      flyers: () => flyersRef.current.map((f) => ({ kind: f.kind, x: f.x / CW, y: f.y / CH, r: f.r / CW, vx: f.vx / CW, vy: f.vy / CH })),
      lives: () => livesRef.current,
      ice: () => iceRef.current,
      // A row of fruit (or one kind) at mid height, so a test can cut them in one stroke
      lineup: (n: number, kind: Kind = 'fruit') => {
        for (let i = 0; i < n; i++) {
          const f = launch(Math.random, kind);
          flyersRef.current.push({ ...f, x: 70 + (i * (CW - 140)) / Math.max(1, n - 1), y: CH * 0.45, vx: 0, vy: -1 });
        }
      },
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

  // A pause lifts the blade, so the next touch starts a fresh stroke
  useEffect(() => {
    if (isPaused) bladeRef.current.down = false;
  }, [isPaused]);

  // Play time; 60 seconds without a miss is an achievement
  useEffect(() => {
    if (gameState !== 'PLAYING' || isPaused) return;
    const id = setInterval(() => {
      if (!isPlayingRef.current) return;
      timeRef.current += 1;
      setElapsed(timeRef.current);
      if (timeRef.current >= 60 && missedRef.current === 0) live.current.onUnlockAchieve('slice_perfect_60');
    }, 1000);
    return () => clearInterval(id);
  }, [gameState, isPaused]);

  const handleStartGame = () => {
    const roundSeed = seed ?? randomSeed();
    rngRef.current = seededRandom(roundSeed);
    onRoundSeed?.(roundSeed);
    flyersRef.current = [];
    queueRef.current = [];
    halvesRef.current = [];
    dropsRef.current = [];
    splatsRef.current = [];
    floatsRef.current = [];
    missesRef.current = [];
    trailRef.current = [];
    bladeRef.current = { down: false, x: 0, y: 0, t: 0 };
    comboRef.current = { count: 0, at: 0, x: 0, y: 0 };
    waveRef.current = { timer: START_DELAY, n: 0 };
    iceRef.current = 0;
    flashRef.current = 0;
    shakeRef.current = 0;
    endRef.current = null;
    scoreRef.current = 0;
    livesRef.current = LIVES;
    cutRef.current = 0;
    missedRef.current = 0;
    maxComboRef.current = 0;
    timeRef.current = 0;

    setScore(0);
    setLives(LIVES);
    setCutCount(0);
    setMaxCombo(0);
    setElapsed(0);
    setEnding(null);
    setReward(null);
    setGameState('PLAYING');
    isPlayingRef.current = true;
    lastTimeRef.current = performance.now();
    playSound('click', settings);
  };

  // "한 판 더" and "처음부터" skip the start card
  useEffect(() => {
    if (autoStart) handleStartGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Space / Enter starts from the start card
  const startRef = useRef(handleStartGame);
  startRef.current = handleStartGame;
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (isPausedRef.current || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (gameStateRef.current === 'PLAYING') {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur?.();
      } else if (gameStateRef.current === 'IDLE' && !(e.target as HTMLElement | null)?.closest?.('button')) {
        e.preventDefault();
        startRef.current();
      }
    };
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
  }, []);

  const addScore = (points: number) => {
    scoreRef.current += points;
    setScore(scoreRef.current);
  };

  /** Close the current combo: 3 or more cuts in one stroke earn a bonus */
  const settleCombo = useCallback(() => {
    const c = comboRef.current;
    if (c.count >= 3) {
      const bonus = c.count * COMBO_BONUS;
      scoreRef.current += bonus;
      setScore(scoreRef.current);
      floatsRef.current.push({ x: Math.max(70, Math.min(CW - 70, c.x)), y: Math.max(60, c.y - 30), text: `${c.count}콤보! +${bonus}`, big: true, life: 0 });
      playSound('combo', live.current.settings);
      vibrate(HAPTIC.merge, live.current.settings);
      if (c.count >= 5) live.current.onUnlockAchieve('slice_combo_5');
      if (c.count > maxComboRef.current) {
        maxComboRef.current = c.count;
        setMaxCombo(c.count);
      }
    }
    comboRef.current = { count: 0, at: 0, x: 0, y: 0 };
  }, []);

  /** Round over: a short pause to see what happened, then the result */
  const endRound = (cause: 'bomb' | 'lives') => {
    if (!isPlayingRef.current) return;
    settleCombo();
    isPlayingRef.current = false;
    bladeRef.current.down = false;
    endRef.current = { cause, frames: cause === 'bomb' ? 60 : 40 };
  };

  const finishRound = useCallback((cause: 'bomb' | 'lives') => {
    const { settings: s, onUnlockAchieve: unlock, onGameComplete: complete } = live.current;
    setEnding({ cause, missed: missedRef.current });
    setElapsed(timeRef.current);
    setGameState('OVER');
    playSound('over', s);
    vibrate(HAPTIC.over, s);
    if (scoreRef.current >= 500) unlock('slice_500');
    const r = complete({ game: 'slice', score: scoreRef.current, seconds: timeRef.current });
    setReward(r);
    if (r.newBest && s.celebrateEffect) celebrate();
  }, []);

  const burst = (x: number, y: number, color: string, count: number, speed: number) => {
    for (let p = 0; p < count; p++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      dropsRef.current.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 1,
        r: 2 + Math.random() * 3,
        color,
        life: 0,
        max: 24 + Math.random() * 16,
      });
    }
  };

  /** A flyer was cut along `angle` (radians, board space) */
  const cutFlyer = (f: Flyer, angle: number, now: number) => {
    const s = live.current.settings;
    // Two halves fly apart across the cut line
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    for (const side of [1, -1] as const) {
      halvesRef.current.push({
        emoji: f.emoji,
        juice: f.juice,
        r: f.r,
        x: f.x,
        y: f.y,
        vx: f.vx * 0.6 + nx * side * 1.8,
        vy: Math.min(f.vy, 0) * 0.4 + ny * side * 1.8 - 1,
        rot: f.rot,
        spin: f.spin + side * 0.05,
        cut: angle - f.rot,
        side,
        life: 0,
      });
    }

    if (f.kind === 'bomb') {
      flashRef.current = 1;
      shakeRef.current = 18;
      burst(f.x, f.y, '#ff9f1c', 18, 7);
      burst(f.x, f.y, '#ffd23f', 12, 5);
      burst(f.x, f.y, '#5a4b70', 14, 3.5);
      floatsRef.current.push({ x: f.x, y: f.y - 20, text: '펑!', big: true, life: 0 });
      playSound('bomb', s);
      vibrate(HAPTIC.crash, s);
      endRound('bomb');
      return;
    }

    burst(f.x, f.y, f.juice, 12, 5);
    splatsRef.current.push({
      x: f.x,
      y: f.y,
      color: f.juice,
      life: 0,
      blobs: Array.from({ length: 6 }, () => ({
        dx: (Math.random() - 0.5) * f.r * 1.6,
        dy: (Math.random() - 0.5) * f.r * 1.6,
        r: f.r * (0.22 + Math.random() * 0.35),
      })),
    });
    if (splatsRef.current.length > 14) splatsRef.current.shift();

    // Cuts close together in one stroke build a combo
    const c = comboRef.current;
    if (c.count > 0 && now - c.at > COMBO_MS) settleCombo();
    comboRef.current = { count: comboRef.current.count + 1, at: now, x: f.x, y: f.y };
    cutRef.current += 1;
    setCutCount(cutRef.current);

    if (f.kind === 'star') {
      addScore(STAR_POINTS);
      floatsRef.current.push({ x: f.x, y: f.y - 16, text: `+${STAR_POINTS}`, big: false, life: 0 });
      playSound('star', s);
      vibrate(HAPTIC.match, s);
    } else if (f.kind === 'ice') {
      addScore(FRUIT_POINTS);
      iceRef.current = ICE_FRAMES;
      floatsRef.current.push({ x: f.x, y: f.y - 16, text: '느려져라!', big: false, life: 0 });
      playSound('freeze', s);
      vibrate(HAPTIC.match, s);
    } else {
      addScore(FRUIT_POINTS);
      playSound('slice', s, { level: Math.min(6, comboRef.current.count) });
      vibrate(HAPTIC.tap, s);
    }
  };

  /** The blade moved from a to b: cut whatever it crossed */
  const slash = (ax: number, ay: number, bx: number, by: number) => {
    const now = performance.now();
    const angle = Math.atan2(by - ay, bx - ax);
    const flyers = flyersRef.current;
    for (let i = flyers.length - 1; i >= 0; i--) {
      const f = flyers[i];
      if (f.y - f.r > CH) continue; // still below the board
      const hitR = f.kind === 'bomb' ? f.r * 0.78 : f.r;
      if (!segmentHitsCircle(ax, ay, bx, by, f.x, f.y, hitR)) continue;
      flyers.splice(i, 1);
      cutFlyer(f, angle, now);
      if (!isPlayingRef.current) return; // a bomb ended the round
    }
  };

  /** A fruit fell off the board uncut */
  const missFruit = (x: number) => {
    livesRef.current -= 1;
    missedRef.current += 1;
    setLives(livesRef.current);
    missesRef.current.push({ x: Math.max(24, Math.min(CW - 24, x)), life: 0 });
    playSound('wrong', live.current.settings);
    vibrate(HAPTIC.wrong, live.current.settings);
    if (livesRef.current <= 0) endRound('lives');
  };

  // Main loop: physics while playing, effects always, drawing every frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixelRatio = Math.min(3, Math.max(1, window.devicePixelRatio || 1) * 1.25);
    canvas.width = Math.round(CW * pixelRatio);
    canvas.height = Math.round(CH * pixelRatio);
    const P = dark ? BOARD.dark : BOARD.light;

    // The wooden board only changes with the theme
    let board = boardCacheRef.current;
    if (!board || board.dark !== dark || board.ratio !== pixelRatio) {
      const off = document.createElement('canvas');
      off.width = canvas.width;
      off.height = canvas.height;
      const octx = off.getContext('2d');
      if (octx) {
        octx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        paintBoard(octx, P);
      }
      board = { dark, ratio: pixelRatio, canvas: off };
      boardCacheRef.current = board;
    }
    const boardCanvas = board.canvas;

    const loop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 16.666, 2.0);
      lastTimeRef.current = time;

      if (!isPaused) {
        const pace = iceRef.current > 0 ? ICE_PACE : 1;
        const step = dt * pace;

        if (isPlayingRef.current) {
          // Waves on a timer (slow motion slows it too)
          const w = waveRef.current;
          w.timer -= step;
          if (w.timer <= 0) {
            queueRef.current.push(...makeWave(rngRef.current, w.n));
            w.timer += waveGap(w.n);
            w.n += 1;
          }
          const queue = queueRef.current;
          for (let i = queue.length - 1; i >= 0; i--) {
            queue[i].delay -= step;
            if (queue[i].delay <= 0) {
              flyersRef.current.push(queue[i].flyer);
              queue.splice(i, 1);
            }
          }

          const flyers = flyersRef.current;
          for (let i = flyers.length - 1; i >= 0; i--) {
            const f = flyers[i];
            f.vy += GRAVITY * step;
            f.x += f.vx * step;
            f.y += f.vy * step;
            f.rot += f.spin * step;
            if (f.vy > 0 && f.y - f.r > CH + 2) {
              flyers.splice(i, 1);
              if (f.kind === 'fruit') {
                missFruit(f.x);
                if (!isPlayingRef.current) break;
              }
            }
          }

          if (iceRef.current > 0) iceRef.current = Math.max(0, iceRef.current - dt);
          const c = comboRef.current;
          if (c.count > 0 && performance.now() - c.at > COMBO_MS) settleCombo();
        }

        // Halves, juice and stains keep moving after the round ends
        const halves = halvesRef.current;
        for (let i = halves.length - 1; i >= 0; i--) {
          const h = halves[i];
          h.vy += GRAVITY * step;
          h.x += h.vx * step;
          h.y += h.vy * step;
          h.rot += h.spin * step;
          h.life += dt;
          if (h.y - h.r > CH + 20 || h.life > 160) halves.splice(i, 1);
        }
        const drops = dropsRef.current;
        for (let i = drops.length - 1; i >= 0; i--) {
          const p = drops[i];
          p.x += p.vx * step;
          p.y += p.vy * step;
          p.vy += 0.2 * step;
          p.life += dt;
          if (p.life >= p.max) drops.splice(i, 1);
        }
        const splats = splatsRef.current;
        for (let i = splats.length - 1; i >= 0; i--) {
          splats[i].life += dt;
          if (splats[i].life > 240) splats.splice(i, 1);
        }
        const floats = floatsRef.current;
        for (let i = floats.length - 1; i >= 0; i--) {
          floats[i].y -= 1.1 * dt;
          floats[i].life += dt;
          if (floats[i].life > 50) floats.splice(i, 1);
        }
        const misses = missesRef.current;
        for (let i = misses.length - 1; i >= 0; i--) {
          misses[i].life += dt;
          if (misses[i].life > 70) misses.splice(i, 1);
        }
        flashRef.current = Math.max(0, flashRef.current - 0.035 * dt);
        shakeRef.current = Math.max(0, shakeRef.current - 0.9 * dt);

        const end = endRef.current;
        if (end) {
          end.frames -= dt;
          if (end.frames <= 0) {
            endRef.current = null;
            finishRound(end.cause);
          }
        }
      }

      // ───────── drawing ─────────
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const shake = live.current.settings.shakeEffect ? shakeRef.current : 0;
      if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      ctx.drawImage(boardCanvas, -10, -10, CW + 20, CH + 20);

      // Juice stains
      for (const sp of splatsRef.current) {
        ctx.save();
        ctx.globalAlpha = 0.3 * Math.max(0, 1 - sp.life / 240);
        ctx.fillStyle = sp.color;
        for (const b of sp.blobs) {
          ctx.beginPath();
          ctx.arc(sp.x + b.dx, sp.y + b.dy, b.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (iceRef.current > 0) {
        ctx.fillStyle = P.ice;
        ctx.fillRect(-10, -10, CW + 20, CH + 20);
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Cut halves
      for (const h of halvesRef.current) {
        const R = h.r * 1.3;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, 1 - (h.life - 70) / 40));
        ctx.translate(h.x, h.y);
        ctx.rotate(h.rot + h.cut);
        ctx.beginPath();
        ctx.rect(-R, h.side > 0 ? 0 : -R, R * 2, R);
        ctx.clip();
        ctx.rotate(-h.cut);
        drawEmoji(ctx, skinPiece(live.current.settings.suikaSkin, SLICE_FRUITS, h.emoji), 0, h.r * 0.05, h.r * 1.9);
        // The juicy inside along the cut
        ctx.rotate(h.cut);
        ctx.fillStyle = h.juice;
        ctx.beginPath();
        ctx.ellipse(0, 0, h.r * 0.8, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Whole fruit, bombs, stars and ice
      for (const f of flyersRef.current) {
        ctx.save();
        ctx.translate(f.x, f.y);
        if (f.kind !== 'fruit') {
          const pulse = 1 + Math.sin(time * (f.kind === 'bomb' ? 0.02 : 0.012)) * 0.12;
          ctx.fillStyle = f.kind === 'bomb' ? 'rgba(255, 71, 87, 0.3)' : f.kind === 'star' ? 'rgba(255, 210, 63, 0.4)' : 'rgba(143, 216, 255, 0.45)';
          ctx.beginPath();
          ctx.arc(0, 0, (f.r + 9) * pulse, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.rotate(f.rot);
        drawEmoji(ctx, skinPiece(live.current.settings.suikaSkin, SLICE_FRUITS, f.emoji), 0, f.r * 0.05, f.r * 1.9);
        if (f.kind === 'bomb') {
          // Fizzing fuse
          ctx.fillStyle = Math.sin(time * 0.05) > 0 ? '#ffd23f' : '#ff7a1a';
          ctx.beginPath();
          ctx.arc(f.r * 0.55, -f.r * 0.75, 3 + Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Juice drops and bomb sparks
      for (const p of dropsRef.current) {
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Blade trail: a soft glow with a bright core, thinner toward the tail (colors from the shop's blade)
      const blade = bladeStyle(live.current.settings.blade);
      const now = performance.now();
      const trail = trailRef.current.filter((p) => now - p.t < TRAIL_MS);
      trailRef.current = trail;
      if (trail.length >= 2) {
        ctx.save();
        ctx.lineCap = 'round';
        for (const [width, core] of [
          [16, false],
          [5, true],
        ] as const) {
          for (let i = 1; i < trail.length; i++) {
            const k = Math.max(0, 1 - (now - trail[i].t) / TRAIL_MS);
            ctx.strokeStyle = core
              ? `rgba(${blade.core}, ${0.95 * k})`
              : blade.rainbow
                ? `hsla(${Math.round(time * 0.2 + i * 30) % 360}, 95%, 60%, ${P.glow * k})`
                : `rgba(${blade.glow || P.blade}, ${P.glow * k})`;
            ctx.lineWidth = 1 + width * k;
            ctx.beginPath();
            ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
            ctx.lineTo(trail[i].x, trail[i].y);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // Missed fruit: a red ✕ where it fell
      for (const m of missesRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - m.life / 70);
        ctx.font = '700 34px Fredoka, Jua, sans-serif';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 6;
        ctx.strokeStyle = P.outline;
        ctx.strokeText('✕', m.x, CH - 30 - m.life * 0.3);
        ctx.fillStyle = '#ff4757';
        ctx.fillText('✕', m.x, CH - 30 - m.life * 0.3);
        ctx.restore();
      }

      // "+50", "4콤보! +40"
      for (const t of floatsRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t.life / 50);
        ctx.font = `700 ${t.big ? 28 : 22}px Fredoka, Jua, sans-serif`;
        ctx.lineJoin = 'round';
        ctx.lineWidth = 5;
        ctx.strokeStyle = P.outline;
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillStyle = t.big ? '#ff9f1c' : '#ffd23f';
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
      }

      // Slow motion badge, top right, with a draining bar
      if (iceRef.current > 0) {
        const x = CW - 50;
        ctx.save();
        ctx.fillStyle = dark ? 'rgba(20, 15, 48, 0.75)' : 'rgba(255, 255, 255, 0.85)';
        ctx.strokeStyle = P.outline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, 12, 36, 36, 10);
        else ctx.rect(x, 12, 36, 36);
        ctx.fill();
        ctx.stroke();
        drawEmoji(ctx, '❄️', x + 18, 28, 22);
        ctx.fillStyle = '#2ea9ff';
        ctx.fillRect(x + 4, 41, 28 * Math.min(1, iceRef.current / ICE_FRAMES), 4);
        ctx.restore();
      }

      // White flash when a bomb goes off
      if (flashRef.current > 0) {
        ctx.fillStyle = `rgba(255, 250, 240, ${flashRef.current * 0.85})`;
        ctx.fillRect(-10, -10, CW + 20, CH + 20);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, dark, finishRound, settleCombo]);

  // ───────── blade (mouse held down or a finger) ─────────

  const toBoard = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (CW / rect.width), y: (e.clientY - rect.top) * (CH / rect.height) };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary || gameStateRef.current !== 'PLAYING' || isPausedRef.current) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const p = toBoard(e);
    bladeRef.current = { down: true, x: p.x, y: p.y, t: e.timeStamp };
    trailRef.current = [{ x: p.x, y: p.y, t: performance.now() }];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = bladeRef.current;
    if (!e.isPrimary || !b.down || isPausedRef.current) return;
    const p = toBoard(e);
    const dist = Math.hypot(p.x - b.x, p.y - b.y);
    if (dist < 2) return;
    const fast = dist / Math.max(1, e.timeStamp - b.t) >= MIN_SPEED;
    trailRef.current.push({ x: p.x, y: p.y, t: performance.now() });
    if (trailRef.current.length > 24) trailRef.current.shift();
    if (fast && isPlayingRef.current) slash(b.x, b.y, p.x, p.y);
    bladeRef.current = { down: true, x: p.x, y: p.y, t: e.timeStamp };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary) return;
    bladeRef.current.down = false;
    if (isPlayingRef.current) settleCombo();
  };

  return (
    <>
      <GameFrame
        hud={
          <Hud>
            <HudStat label="점수" value={formatNumber(score)} />
            <HudStat label="최고" value={formatNumber(Math.max(best, score))} tone={best > 0 && score > best ? 'hot' : 'default'} />
            <HudStat
              label="목숨"
              value={<span className="text-[0.7em] tracking-[-0.12em]" aria-label={`${lives}개 남음`}>{hearts(lives)}</span>}
              tone={lives === 1 && gameState === 'PLAYING' ? 'warn' : 'default'}
            />
            <HudStat label="자른 과일" value={`${cutCount}개`} />
          </Hud>
        }
        board={
          <div className="board-fit w-full" style={{ maxWidth: 'calc((100dvh - var(--board-offset)) * 0.7333)' }}>
            <div className="relative aspect-[440/600] w-full overflow-hidden rounded-[28px] border-2 border-line bg-surface-2 shadow-pop">
              <canvas
                ref={canvasRef}
                aria-label="과일 자르기 판"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="block h-full w-full cursor-crosshair touch-none select-none"
              />
              {gameState === 'IDLE' && (
                <BoardOverlay>
                  <StartCard meta={GAMES.slice} best={best} onStart={handleStartGame} onHelp={onHelp} />
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
                <span className="sticker h-8 w-8 shrink-0 bg-melon-soft text-base shadow-none" aria-hidden="true">
                  🍉
                </span>
                <span>
                  그어서 자르면 한 개에 <b>+{FRUIT_POINTS}점</b>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-mango-soft text-base shadow-none" aria-hidden="true">
                  🔥
                </span>
                <span>
                  한 번에 3개 이상 자르면 <b>콤보 보너스</b>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-soda-soft text-base shadow-none" aria-hidden="true">
                  ⭐
                </span>
                <span>
                  황금 별 <b>+{STAR_POINTS}점</b> · ❄️ 얼음은 잠깐 <b>느리게</b>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-berry-soft text-base shadow-none" aria-hidden="true">
                  💣
                </span>
                <span>
                  폭탄을 자르거나 과일을 <b>{LIVES}개</b> 놓치면 끝
                </span>
              </li>
            </ul>
            <div className="flex items-center justify-between gap-2">
              <p className="hidden text-xs text-ink-3 sm:block short:hidden">누른 채로 긋기 · 터치</p>
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
            game="slice"
            emoji={ending.cause === 'bomb' ? '💥' : '🍉'}
            title={ending.cause === 'bomb' ? 'BOOM!' : 'GAME OVER'}
            subtitle={ending.cause === 'bomb' ? '폭탄을 잘랐어요' : `과일을 ${LIVES}개 놓쳤어요`}
            tone={ending.cause === 'bomb' ? 'berry' : 'soda'}
            score={score}
            stats={[
              { label: '자른 과일', value: `${cutCount}개` },
              { label: '최대 콤보', value: maxCombo >= 3 ? `${maxCombo}콤보` : '없음' },
              { label: '놓친 과일', value: `${ending.missed}개` },
              { label: '플레이 시간', value: formatTime(elapsed) },
            ]}
            reward={reward}
            shareText={`🔪 과일 자르기 ${formatNumber(score)}점! 과일 ${cutCount}개를 썰었어요`}
            onRetry={handleStartGame}
            onExit={onExit}
          />
        </ScreenOverlay>
      )}
    </>
  );
};
