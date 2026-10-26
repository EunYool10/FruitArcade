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
import { runnerStyle } from '../../utils/shop';
import { drawEmoji, preloadEmoji } from '../../utils/emoji';
import { skinPiece } from '../../utils/skins';

const CW = 480;
const CH = 360;
/** Top of the ground */
const GROUND_Y = 300;
const PLAYER_X = 84;
/** The runner's body radius, and its feet below the body */
const R = 19;
const FOOT = 5;
/** Body centre when standing */
const BASE_Y = GROUND_Y - R - FOOT;
/** px per frame², 60 frames a second. Holding the jump keeps gravity low for a while: tap = hop, hold = high jump */
const GRAVITY = 0.8;
const HOLD_GRAVITY = 0.4;
const HOLD_FRAMES = 14;
const JUMP_V = -11;
/** ↓ in the air pulls down this much harder */
const FAST_FALL = 2.6;
/** A press this many frames before landing still jumps */
const BUFFER_FRAMES = 7;
/** Running speed in px per frame: speeds up over about a minute */
const START_SPEED = 5.5;
const MAX_SPEED = 12;
const ACCEL = 0.0015;
/** Points for the distance run, and for each cherry */
const SCORE_PER_PX = 0.025;
const CHERRY_POINTS = 20;
/** A high jump lasts about this many frames; gaps always leave room for one */
const AIR_FRAMES = 40;
/** Day turns to night and back every this many points */
const DAY_POINTS = 1400;

type Kind = 'cactus' | 'cactus2' | 'rock' | 'mushroom' | 'beeLow' | 'beeHigh';

/** Hit box (w × h), picture size, and for bees how high their middle flies above the ground */
const SHAPES: Record<Kind, { w: number; h: number; size: number; emoji: string; air?: number }> = {
  cactus: { w: 22, h: 40, size: 46, emoji: '🌵' },
  cactus2: { w: 50, h: 40, size: 46, emoji: '🌵' },
  rock: { w: 34, h: 22, size: 40, emoji: '🪨' },
  mushroom: { w: 24, h: 26, size: 34, emoji: '🍄' },
  // Low bees have to be jumped; high ones fly over a runner who stays down
  beeLow: { w: 28, h: 22, size: 34, emoji: '🐝', air: 34 },
  beeHigh: { w: 28, h: 22, size: 34, emoji: '🐝', air: 92 },
};

interface Obstacle {
  kind: Kind;
  x: number;
  /** Bob phase (bees) */
  phase: number;
  passed: boolean;
}

interface Cherry {
  x: number;
  y: number;
}

interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
}

/** Collectible fruit, for the shop's fruit skins */
const JUMP_FRUITS = ['🍒'];
preloadEmoji(['🌵', '🪨', '🍄', '🐝', '🍒', '☁️', '☀️', '🌙']);

const BOARD = {
  light: {
    day: ['#8fd8ff', '#e8f7ff'],
    night: ['#1b1640', '#3d3170'],
    hill: '#a8dc8f',
    hillNight: '#2d4a3a',
    grass: '#6cc24a',
    dirt: '#e9c78f',
    pebble: 'rgba(122, 72, 24, 0.28)',
    outline: '#2b2140',
    shadow: 'rgba(43, 33, 64, 0.18)',
  },
  dark: {
    day: ['#3b6f9e', '#7fb3d9'],
    night: ['#0d0a24', '#241c4a'],
    hill: '#3f7a4a',
    hillNight: '#1c3326',
    grass: '#3f8f3a',
    dirt: '#5a4430',
    pebble: 'rgba(255, 244, 228, 0.12)',
    outline: '#07050c',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

const mix = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
};
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Hit box of an obstacle (left, top, right, bottom) */
function boxOf(o: Obstacle, time: number): [number, number, number, number] {
  const s = SHAPES[o.kind];
  if (s.air === undefined) return [o.x, GROUND_Y - s.h, o.x + s.w, GROUND_Y];
  const cy = GROUND_Y - s.air + Math.sin(time * 0.006 + o.phase) * 4;
  return [o.x, cy - s.h / 2, o.x + s.w, cy + s.h / 2];
}

function circleHitsBox(cx: number, cy: number, r: number, [l, t, rr, b]: [number, number, number, number]) {
  const px = Math.max(l, Math.min(cx, rr)) - cx;
  const py = Math.max(t, Math.min(cy, b)) - cy;
  return px * px + py * py < r * r;
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
  /** Same seed → same obstacles in the same places (friend challenges) */
  seed?: string;
  onRoundSeed?: (seed: string) => void;
}

export const FruitJumpGame: React.FC<Props> = ({
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
  const [cherries, setCherries] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState<{ meters: number; passed: number } | null>(null);
  const [reward, setReward] = useState<GameReward | null>(null);

  // Mutable round state for the animation loop
  const runRef = useRef({ y: BASE_Y, vy: 0, onGround: true, held: false, holdFrames: 0, buffer: 0, fastFall: false, squash: 0, stride: 0 });
  const worldRef = useRef({ speed: START_SPEED, frames: 0, distance: 0, scroll: 0, toNext: 480 });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const cherriesRef = useRef<Cherry[]>([]);
  const dustRef = useRef<Dust[]>([]);
  const floatsRef = useRef<{ x: number; y: number; text: string; life: number }[]>([]);
  const cloudsRef = useRef([
    { x: 120, y: 60, s: 38 },
    { x: 330, y: 95, s: 30 },
    { x: 520, y: 45, s: 44 },
  ]);
  const crashedRef = useRef(false);
  const endRef = useRef<number | null>(null);
  const shakeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const scoreRef = useRef(0);
  const cherryRef = useRef(0);
  const passedRef = useRef(0);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animFrameRef = useRef<number | null>(null);

  // Latest callbacks/values for code running inside the animation loop
  const live = useRef({ onUnlockAchieve, onGameComplete, settings });
  live.current = { onUnlockAchieve, onGameComplete, settings };
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  // Dev server only (compiled out of real builds): lets browser tests see the runner and steer the course
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__jumpTest = {
      state: () => ({ ...runRef.current, ...worldRef.current, score: scoreRef.current, obstacles: obstaclesRef.current.map((o) => ({ kind: o.kind, x: o.x })) }),
      clear: () => {
        obstaclesRef.current = [];
        cherriesRef.current = [];
        worldRef.current.toNext = 100000;
      },
      place: (kind: Kind, x = 300) => obstaclesRef.current.push({ kind, x, phase: 0, passed: false }),
      cherries: (n: number, x = 300) => {
        for (let i = 0; i < n; i++) cherriesRef.current.push({ x: x + i * 30, y: BASE_Y });
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

  // A pause lets go of the jump
  useEffect(() => {
    if (isPaused) {
      runRef.current.held = false;
      runRef.current.fastFall = false;
    }
  }, [isPaused]);

  // Play time
  useEffect(() => {
    if (gameState !== 'PLAYING' || isPaused) return;
    const id = setInterval(() => {
      if (!isPlayingRef.current) return;
      timeRef.current += 1;
      setElapsed(timeRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [gameState, isPaused]);

  const handleStartGame = () => {
    const roundSeed = seed ?? randomSeed();
    rngRef.current = seededRandom(roundSeed);
    onRoundSeed?.(roundSeed);
    runRef.current = { y: BASE_Y, vy: 0, onGround: true, held: false, holdFrames: 0, buffer: 0, fastFall: false, squash: 0, stride: 0 };
    worldRef.current = { speed: START_SPEED, frames: 0, distance: 0, scroll: 0, toNext: 480 };
    obstaclesRef.current = [];
    cherriesRef.current = [];
    dustRef.current = [];
    floatsRef.current = [];
    crashedRef.current = false;
    endRef.current = null;
    shakeRef.current = 0;
    scoreRef.current = 0;
    cherryRef.current = 0;
    passedRef.current = 0;
    timeRef.current = 0;
    setScore(0);
    setCherries(0);
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

  const jump = () => {
    const r = runRef.current;
    r.vy = JUMP_V;
    r.onGround = false;
    r.holdFrames = 0;
    r.buffer = 0;
    r.squash = -0.6;
    playSound('jump', live.current.settings);
    vibrate(HAPTIC.tap, live.current.settings);
  };

  /** Finger down / Space: jump now, or as soon as the runner lands */
  const press = () => {
    if (!isPlayingRef.current || isPausedRef.current) return;
    const r = runRef.current;
    r.held = true;
    if (r.onGround) jump();
    else r.buffer = BUFFER_FRAMES;
  };
  const release = () => {
    runRef.current.held = false;
  };

  // Keys: Space / ↑ / W jump (held = higher), ↓ / S comes down fast; Space or Enter starts from the start card
  const startRef = useRef(handleStartGame);
  startRef.current = handleStartGame;
  const pressRef = useRef(press);
  pressRef.current = press;
  useEffect(() => {
    const isJump = (e: KeyboardEvent) => e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW';
    const isDown = (e: KeyboardEvent) => e.code === 'ArrowDown' || e.code === 'KeyS';
    const onDown = (e: KeyboardEvent) => {
      if (isPausedRef.current || e.ctrlKey || e.metaKey || e.altKey) return;
      if (gameStateRef.current === 'PLAYING') {
        if (isJump(e) || isDown(e)) {
          e.preventDefault();
          (document.activeElement as HTMLElement | null)?.blur?.();
        }
        if (isJump(e) && !e.repeat) pressRef.current();
        if (isDown(e)) runRef.current.fastFall = true;
      } else if (gameStateRef.current === 'IDLE' && (e.code === 'Space' || e.code === 'Enter') && !(e.target as HTMLElement | null)?.closest?.('button')) {
        e.preventDefault();
        startRef.current();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (isJump(e)) runRef.current.held = false;
      if (isDown(e)) runRef.current.fastFall = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  const finishRound = useCallback(() => {
    const { settings: s, onUnlockAchieve: unlock, onGameComplete: complete } = live.current;
    setEnding({ meters: Math.floor(worldRef.current.distance / 40), passed: passedRef.current });
    setElapsed(timeRef.current);
    setGameState('OVER');
    playSound('over', s);
    vibrate(HAPTIC.over, s);
    if (scoreRef.current >= 500) unlock('jump_500');
    if (scoreRef.current >= 1500) unlock('jump_1500');
    const r = complete({ game: 'jump', score: scoreRef.current, seconds: timeRef.current });
    setReward(r);
    if (r.newBest && s.celebrateEffect) celebrate();
  }, []);

  const puff = (x: number, y: number, count: number) => {
    for (let i = 0; i < count; i++) {
      dustRef.current.push({ x, y, vx: -1 - Math.random() * 2, vy: -Math.random() * 1.6, r: 2 + Math.random() * 3, life: 0 });
    }
  };

  /** The next obstacle, and maybe cherries around it. Uses the round's seeded dice only. */
  const spawn = () => {
    const rand = rngRef.current;
    const w = worldRef.current;
    const pts = scoreRef.current;
    const roll = rand();
    let kind: Kind;
    if (pts >= 200 && roll < 0.22) kind = rand() < 0.5 ? 'beeLow' : 'beeHigh';
    else {
      const g = rand();
      kind = g < 0.42 ? 'cactus' : g < 0.62 ? 'rock' : g < 0.8 ? 'mushroom' : pts >= 80 ? 'cactus2' : 'cactus';
    }
    const x = CW + 30;
    obstaclesRef.current.push({ kind, x, phase: rand() * 6, passed: false });
    // Cherries: an arc over a ground obstacle, or a row on the ground after it
    const c = rand();
    if (SHAPES[kind].air === undefined && c < 0.35) {
      const n = 1 + Math.floor(rand() * 3);
      const mid = x + SHAPES[kind].w / 2;
      for (let i = 0; i < n; i++) {
        const off = i - (n - 1) / 2;
        cherriesRef.current.push({ x: mid + off * 32, y: BASE_Y - 92 + Math.abs(off) * 22 });
      }
    } else if (c > 0.8) {
      for (let i = 0; i < 3; i++) cherriesRef.current.push({ x: x + 150 + w.speed * 10 + i * 30, y: BASE_Y - 2 });
    }
    // Room to land and jump again, more at speed
    w.toNext = w.speed * AIR_FRAMES + 140 + SHAPES[kind].w + rand() * (260 + w.speed * 14);
  };

  // Main loop: the run while playing, effects always, drawing every frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixelRatio = Math.min(3, Math.max(1, window.devicePixelRatio || 1) * 1.25);
    canvas.width = Math.round(CW * pixelRatio);
    canvas.height = Math.round(CH * pixelRatio);
    const P = dark ? BOARD.dark : BOARD.light;

    const loop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 16.666, 2.0);
      lastTimeRef.current = time;
      const r = runRef.current;
      const w = worldRef.current;

      if (!isPaused) {
        if (isPlayingRef.current) {
          w.frames += dt;
          w.speed = Math.min(MAX_SPEED, START_SPEED + w.frames * ACCEL);
          const move = w.speed * dt;
          w.distance += move;
          w.scroll += move;

          // Jump physics
          if (!r.onGround) {
            const rising = r.vy < 0;
            let g = r.held && rising && r.holdFrames < HOLD_FRAMES ? HOLD_GRAVITY : GRAVITY;
            if (r.fastFall) g *= FAST_FALL;
            r.holdFrames += dt;
            r.vy += g * dt;
            r.y += r.vy * dt;
            if (r.y >= BASE_Y) {
              r.y = BASE_Y;
              r.vy = 0;
              r.onGround = true;
              r.squash = 1;
              puff(PLAYER_X - 6, GROUND_Y, 5);
              if (r.buffer > 0) jump();
            }
            r.buffer = Math.max(0, r.buffer - dt);
          } else {
            r.stride += dt * w.speed * 0.045;
            if (Math.random() < 0.06 * dt) puff(PLAYER_X - 12, GROUND_Y, 1);
          }

          // Course
          w.toNext -= move;
          if (w.toNext <= 0) spawn();
          for (const o of obstaclesRef.current) o.x -= move;
          for (const c of cherriesRef.current) c.x -= move;
          obstaclesRef.current = obstaclesRef.current.filter((o) => o.x + SHAPES[o.kind].w > -40);
          cherriesRef.current = cherriesRef.current.filter((c) => c.x > -30);

          // Cherries
          for (let i = cherriesRef.current.length - 1; i >= 0; i--) {
            const c = cherriesRef.current[i];
            if (Math.hypot(c.x - PLAYER_X, c.y - r.y) < R + 14) {
              cherriesRef.current.splice(i, 1);
              cherryRef.current += 1;
              setCherries(cherryRef.current);
              floatsRef.current.push({ x: c.x, y: c.y - 18, text: `+${CHERRY_POINTS}`, life: 0 });
              playSound('star', live.current.settings);
              vibrate(HAPTIC.match, live.current.settings);
              if (cherryRef.current >= 15) live.current.onUnlockAchieve('jump_cherry_15');
            }
          }

          // Score: distance plus cherries; a chime every 100
          const before = scoreRef.current;
          const next = Math.floor(w.distance * SCORE_PER_PX) + cherryRef.current * CHERRY_POINTS;
          if (next !== before) {
            scoreRef.current = next;
            setScore(next);
            if (Math.floor(next / 100) > Math.floor(before / 100)) playSound('match', live.current.settings);
          }

          // Hits (a slightly smaller body, so near misses feel fair)
          for (const o of obstaclesRef.current) {
            const box = boxOf(o, time);
            if (circleHitsBox(PLAYER_X, r.y, R * 0.8, box)) {
              crashedRef.current = true;
              isPlayingRef.current = false;
              r.held = false;
              shakeRef.current = 12;
              endRef.current = 45;
              puff(PLAYER_X + 10, r.y, 10);
              playSound('bomb', live.current.settings);
              vibrate(HAPTIC.crash, live.current.settings);
              break;
            }
            if (!o.passed && box[2] < PLAYER_X - R) {
              o.passed = true;
              passedRef.current += 1;
            }
          }
        } else if (crashedRef.current && !r.onGround) {
          // A crash in the air falls to the ground
          r.vy += GRAVITY * dt;
          r.y = Math.min(BASE_Y, r.y + r.vy * dt);
          if (r.y >= BASE_Y) r.onGround = true;
        }

        // Clouds drift even on the start card
        for (const c of cloudsRef.current) {
          c.x -= (isPlayingRef.current ? w.speed * 0.18 : 0.3) * dt;
          if (c.x < -60) {
            c.x = CW + 40 + Math.random() * 120;
            c.y = 35 + Math.random() * 80;
          }
        }
        for (let i = dustRef.current.length - 1; i >= 0; i--) {
          const d = dustRef.current[i];
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.life += dt;
          if (d.life > 30) dustRef.current.splice(i, 1);
        }
        for (let i = floatsRef.current.length - 1; i >= 0; i--) {
          floatsRef.current[i].y -= 0.9 * dt;
          floatsRef.current[i].life += dt;
          if (floatsRef.current[i].life > 45) floatsRef.current.splice(i, 1);
        }
        r.squash *= Math.pow(0.82, dt);
        shakeRef.current = Math.max(0, shakeRef.current - 0.8 * dt);
        if (endRef.current !== null) {
          endRef.current -= dt;
          if (endRef.current <= 0) {
            endRef.current = null;
            finishRound();
          }
        }
      }

      // ───────── drawing ─────────
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const shake = live.current.settings.shakeEffect ? shakeRef.current : 0;
      if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

      // Sky: day, sunset, night and back as the score grows
      const phase = (scoreRef.current % DAY_POINTS) / DAY_POINTS;
      const night = smooth(0.5, 0.62, phase) * (1 - smooth(0.88, 1, phase));
      const dusk = Math.max(0, 1 - Math.abs(phase - 0.56) / 0.07) + Math.max(0, 1 - Math.abs(phase - 0.94) / 0.06);
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      sky.addColorStop(0, mix(P.day[0], P.night[0], night));
      sky.addColorStop(1, mix(P.day[1], P.night[1], night));
      ctx.fillStyle = sky;
      ctx.fillRect(-10, -10, CW + 20, GROUND_Y + 10);
      if (dusk > 0) {
        ctx.fillStyle = `rgba(255, 140, 90, ${0.28 * Math.min(1, dusk)})`;
        ctx.fillRect(-10, -10, CW + 20, GROUND_Y + 10);
      }
      if (night > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * night})`;
        for (let i = 0; i < 24; i++) {
          const sx = (i * 97 + 31) % CW;
          const sy = (i * 53 + 17) % (GROUND_Y - 90);
          const tw = 0.6 + 0.4 * Math.sin(time * 0.003 + i);
          ctx.fillRect(sx, sy, 2 * tw, 2 * tw);
        }
      }
      ctx.globalAlpha = 1 - night;
      drawEmoji(ctx, '☀️', CW - 70, 58, 46);
      ctx.globalAlpha = night;
      drawEmoji(ctx, '🌙', CW - 70, 58, 40);
      ctx.globalAlpha = 0.85 - night * 0.4;
      for (const c of cloudsRef.current) drawEmoji(ctx, '☁️', c.x, c.y, c.s);
      ctx.globalAlpha = 1;

      // Far hills, slower than the ground
      ctx.fillStyle = mix(P.hill, P.hillNight, night);
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      const hs = worldRef.current.scroll * 0.3;
      for (let x = 0; x <= CW; x += 8) ctx.lineTo(x, GROUND_Y - 34 - Math.sin((x + hs) / 70) * 14 - Math.sin((x + hs) / 31) * 6);
      ctx.lineTo(CW, GROUND_Y);
      ctx.closePath();
      ctx.fill();

      // Ground: grass strip, dirt, pebbles rolling by
      ctx.fillStyle = P.dirt;
      ctx.fillRect(-10, GROUND_Y, CW + 20, CH - GROUND_Y + 10);
      ctx.fillStyle = P.grass;
      ctx.fillRect(-10, GROUND_Y - 2, CW + 20, 10);
      ctx.fillStyle = P.pebble;
      const gs = worldRef.current.scroll;
      for (let i = 0; i < 14; i++) {
        const px = (((i * 83 - gs) % (CW + 60)) + CW + 60) % (CW + 60) - 30;
        ctx.fillRect(px, GROUND_Y + 16 + ((i * 29) % 36), 10 + (i % 3) * 6, 3);
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Cherries, bobbing a little
      for (const c of cherriesRef.current) {
        drawEmoji(ctx, skinPiece(live.current.settings.suikaSkin, JUMP_FRUITS, '🍒'), c.x, c.y + Math.sin(time * 0.008 + c.x * 0.05) * 3, 28);
      }

      // Obstacles
      for (const o of obstaclesRef.current) {
        const s = SHAPES[o.kind];
        const [l, t, rr, b] = boxOf(o, time);
        if (o.kind === 'cactus2') {
          drawEmoji(ctx, s.emoji, l + 12, b - s.size / 2 + 3, s.size);
          drawEmoji(ctx, s.emoji, rr - 12, b - s.size / 2 + 6, s.size * 0.86);
        } else if (s.air !== undefined) {
          ctx.save();
          ctx.translate((l + rr) / 2, (t + b) / 2);
          ctx.scale(-1, 1); // flying towards the runner
          drawEmoji(ctx, s.emoji, 0, 0, s.size);
          ctx.restore();
        } else {
          drawEmoji(ctx, s.emoji, (l + rr) / 2, b - s.size / 2 + 4, s.size);
        }
      }

      // Dust
      for (const d of dustRef.current) {
        ctx.globalAlpha = Math.max(0, 0.5 * (1 - d.life / 30));
        ctx.fillStyle = dark ? '#b9a98f' : '#d9b77c';
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // The runner: a little fruit with feet (the shop's runner colours), squashing on landing
      const look = runnerStyle(live.current.settings.runner, time);
      const ink = look.face;
      const sq = r.squash;
      const sx = 1 + sq * 0.14;
      const sy = 1 - sq * 0.14;
      ctx.save();
      ctx.fillStyle = P.shadow;
      const lift = (BASE_Y - r.y) / 140;
      ctx.beginPath();
      ctx.ellipse(PLAYER_X, GROUND_Y + 2, R * (0.95 - lift * 0.4), 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(PLAYER_X, r.y + R * (1 - sy));
      ctx.scale(sx, sy);
      ctx.strokeStyle = P.outline;
      // Feet: running steps on the ground, tucked up in the air
      ctx.fillStyle = look.feet;
      ctx.lineWidth = 2.5;
      for (const side of [-1, 1]) {
        const step = r.onGround && !crashedRef.current ? Math.max(0, Math.sin(r.stride + (side < 0 ? 0 : Math.PI)) * 4) : 0;
        const tuck = r.onGround ? 0 : 3;
        ctx.beginPath();
        ctx.ellipse(side * 8, R - 1 - step - tuck, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = look.body;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-7, -9, 6, 3.5, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, R - 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.fillStyle = look.leaf;
      ctx.beginPath();
      ctx.ellipse(4, -R - 1, 7, 3.5, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 71, 120, 0.45)';
      for (const ex of [-7, 13]) {
        ctx.beginPath();
        ctx.ellipse(ex, 4, 3.2, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.lineCap = 'round';
      const fx = 3;
      if (crashedRef.current) {
        for (const ex of [-5.5, 5.5]) {
          ctx.beginPath();
          ctx.moveTo(fx + ex - 2.5, -5.5);
          ctx.lineTo(fx + ex + 2.5, -0.5);
          ctx.moveTo(fx + ex + 2.5, -5.5);
          ctx.lineTo(fx + ex - 2.5, -0.5);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(fx, 6, 2.5, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        for (const ex of [-5.5, 5.5]) {
          ctx.beginPath();
          ctx.ellipse(fx + ex, -3, 2.3, 3.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = ink === '#ffffff' ? look.body : '#fff';
        for (const ex of [-5.5, 5.5]) {
          ctx.beginPath();
          ctx.arc(fx + ex + 0.8, -4.3, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        if (r.onGround) ctx.arc(fx, 3, 4, 0.15 * Math.PI, 0.85 * Math.PI);
        else ctx.ellipse(fx, 5, 2.6, 3.2, 0, 0, Math.PI * 2); // "Wheee"
        ctx.stroke();
      }
      ctx.restore();

      // "+20"
      for (const t of floatsRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t.life / 45);
        ctx.font = '700 20px Fredoka, Jua, sans-serif';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 5;
        ctx.strokeStyle = P.outline;
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillStyle = '#ffd23f';
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, dark, finishRound]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    press();
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.isPrimary) release();
  };

  return (
    <>
      <GameFrame
        hud={
          <Hud>
            <HudStat label="점수" value={formatNumber(score)} />
            <HudStat label="최고" value={formatNumber(Math.max(best, score))} tone={best > 0 && score > best ? 'hot' : 'default'} />
            <HudStat label="체리" value={`🍒${cherries}`} />
            <HudStat label="시간" value={formatTime(elapsed)} />
          </Hud>
        }
        board={
          <div className="board-fit w-full" style={{ maxWidth: 'calc((100dvh - var(--board-offset)) * 1.3333)' }}>
            <div className="relative aspect-[480/360] w-full overflow-hidden rounded-[28px] border-2 border-line bg-surface-2 shadow-pop">
              <canvas
                ref={canvasRef}
                aria-label="과일 점프 판"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onContextMenu={(e) => e.preventDefault()}
                className="block h-full w-full cursor-pointer touch-none select-none"
              />
              {gameState === 'IDLE' && (
                <BoardOverlay>
                  <StartCard meta={GAMES.jump} best={best} onStart={handleStartGame} onHelp={onHelp} />
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
                  👆
                </span>
                <span>
                  탭하면 <b>점프</b>, 길게 누르면 <b>더 높이</b>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-berry-soft text-base shadow-none" aria-hidden="true">
                  🌵
                </span>
                <span>
                  선인장 · 돌 · 버섯에 부딪히면 <b>끝</b>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-mango-soft text-base shadow-none" aria-hidden="true">
                  🐝
                </span>
                <span>
                  낮게 나는 벌은 <b>넘고</b>, 높이 나는 벌은 <b>그냥 지나가요</b>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-soda-soft text-base shadow-none" aria-hidden="true">
                  🍒
                </span>
                <span>
                  체리 <b>+{CHERRY_POINTS}점</b> · 갈수록 빨라지고 밤이 와요
                </span>
              </li>
            </ul>
            <div className="flex items-center justify-between gap-2">
              <p className="hidden text-xs text-ink-3 sm:block short:hidden">Space · ↑ 점프 · ↓ 빨리 내려오기</p>
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
            game="jump"
            emoji="🌵"
            title="꽈당!"
            subtitle={`${formatNumber(ending.meters)}m를 달렸어요`}
            tone="melon"
            score={score}
            stats={[
              { label: '달린 거리', value: `${formatNumber(ending.meters)}m` },
              { label: '먹은 체리', value: `${cherries}개` },
              { label: '넘은 장애물', value: `${ending.passed}개` },
              { label: '플레이 시간', value: formatTime(elapsed) },
            ]}
            reward={reward}
            shareText={`🦘 과일 점프 ${formatNumber(score)}점! ${formatNumber(ending.meters)}m를 달렸어요`}
            onRetry={handleStartGame}
            onExit={onExit}
          />
        </ScreenOverlay>
      )}
    </>
  );
};
