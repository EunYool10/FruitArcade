import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { GameResult, GameReward, GameSettings, SuikaFruitDef, SuikaParticle, SuikaFloatText } from '../../types';
import { GAMES } from '../../constants';
import { playSound } from '../../utils/audio';
import { HAPTIC, vibrate } from '../../utils/haptics';
import { celebrate } from '../../utils/fx';
import { Rng, randomSeed, seededRandom } from '../../utils/rng';
import { formatNumber, formatTime } from '../../utils/format';
import { BoardOverlay, GameFrame, Hud, HudStat, ScreenOverlay } from '../game/GameFrame';
import { StartCard } from '../game/StartCard';
import { ResultCard } from '../game/ResultCard';
import { Merge, TICK_MS, World, addBody, createWorld, drawPos, stepWorld } from './physics';
import { drawEmoji, preloadEmoji } from '../../utils/emoji';
import { Emoji } from '../ui/Emoji';

const FRUITS: SuikaFruitDef[] = [
  { name: '체리', emoji: '🍒', r: 17, score: 1, color: '#ff334b' },
  { name: '딸기', emoji: '🍓', r: 24, score: 3, color: '#ff4940' },
  { name: '포도', emoji: '🍇', r: 32, score: 6, color: '#b054e8' },
  { name: '한라봉', emoji: '🍊', r: 41, score: 10, color: '#ff9800' },
  { name: '감', emoji: '🍅', r: 50, score: 18, color: '#ff6144' },
  { name: '사과', emoji: '🍎', r: 60, score: 36, color: '#f5222d' },
  { name: '배', emoji: '🍐', r: 71, score: 70, color: '#fadb14' },
  { name: '복숭아', emoji: '🍑', r: 83, score: 140, color: '#ffadd2' },
  { name: '파인애플', emoji: '🍍', r: 96, score: 280, color: '#ffc53d' },
  { name: '멜론', emoji: '🍈', r: 110, score: 560, color: '#52c41a' },
  { name: '수박', emoji: '🍉', r: 126, score: 1200, color: '#389e0d' },
];

// Logical Canvas Dimensions
const CW = 440;
const CH = 600;
// Wall & floor boundaries with explicit safety padding
const WALL_MARGIN = 20;
const LEFT = WALL_MARGIN;
const RIGHT = CW - WALL_MARGIN;
const BOTTOM = 580;
const DEADLINE = 115;
const JAR_TOP = DEADLINE - 30;
/** The fruit waiting to drop hangs this far above the line, and falls from right there */
const HOLD_GAP = 6;
const holdY = (lv: number) => DEADLINE - HOLD_GAP - FRUITS[lv].r;
/** Seconds a fruit may stay over the line */
const DANGER_SECONDS = 3;
/** Below this speed (px per frame) a fruit over the line counts as overflowing */
const SETTLED_SPEED = 1;
const COOLDOWN_MS = 550;
/** One physics tick in seconds and in 60 fps frames (effect speeds are per frame) */
const TICK_SEC = TICK_MS / 1000;
const TICK_FRAMES = TICK_MS / (1000 / 60);
const SHAKE_DECAY = Math.pow(0.88, TICK_FRAMES);
// Chance of each droppable fruit (cherry, strawberry, grape, hallabong, persimmon, apple).
// The longer a round goes, the fewer cherries and the more big fruit: the mix slides from
// EARLY to LATE between the 15th and the 135th fruit (counted, not timed, so a challenge
// seed still gives everyone the same fruit).
const EARLY_WEIGHTS = [0.3, 0.25, 0.2, 0.15, 0.1, 0];
const LATE_WEIGHTS = [0.05, 0.12, 0.22, 0.28, 0.25, 0.08];
const dropWeights = (n: number) => {
  const t = Math.max(0, Math.min(1, (n - 15) / 120));
  return EARLY_WEIGHTS.map((w, i) => w + (LATE_WEIGHTS[i] - w) * t);
};
/** Points multiplier for the time played: +0.1 every 30 seconds, ×2 from 5 minutes */
const scoreMult = (seconds: number) => 1 + Math.min(10, Math.floor(seconds / 30)) / 10;
const KEY_SPEED = 6.5;

const RADII = FRUITS.map((f) => f.r);
preloadEmoji(FRUITS.map((f) => f.emoji));
const newWorld = () => createWorld({ left: LEFT, right: RIGHT, bottom: BOTTOM }, RADII);

const PALETTE = {
  light: {
    jarTop: '#fffdf8',
    jarBottom: '#ffe9c4',
    wall: '#2b2140',
    outline: '#2b2140',
    deadline: 'rgba(43, 33, 64, 0.45)',
    danger: '#e3285f',
    guide: 'rgba(43, 33, 64, 0.3)',
    textStroke: '#ffffff',
  },
  dark: {
    jarTop: '#2c2443',
    jarBottom: '#1d1729',
    wall: '#ffb627',
    outline: '#07050c',
    deadline: 'rgba(255, 244, 228, 0.45)',
    danger: '#ff4778',
    guide: 'rgba(255, 244, 228, 0.3)',
    textStroke: '#07050c',
  },
};
type Palette = (typeof PALETTE)['light'];


/** Cartoon fruit: flat fill, gloss, outline, then the emoji (which rotates). */
function drawFruit(ctx: CanvasRenderingContext2D, f: SuikaFruitDef, r: number, angle: number, P: Palette, warn: boolean) {
  ctx.fillStyle = f.color;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.36, -r * 0.42, r * 0.3, r * 0.16, -0.65, 0, Math.PI * 2);
  ctx.fill();

  const lw = Math.max(2, r * 0.07);
  ctx.lineWidth = lw;
  ctx.strokeStyle = warn ? P.danger : P.outline;
  ctx.beginPath();
  ctx.arc(0, 0, r - lw / 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.rotate(angle);
  drawEmoji(ctx, f.emoji, 0, r * 0.03, r * 1.2);
  ctx.restore();
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
  /** Same seed → same fruit order (friend challenges) */
  seed?: string;
  onRoundSeed?: (seed: string) => void;
}

export const SuikaGame: React.FC<Props> = ({
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
  // Kept in a ref so the physics loop is not restarted when the callback identity changes
  const onUnlockRef = useRef(onUnlockAchieve);
  onUnlockRef.current = onUnlockAchieve;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'OVER'>('IDLE');
  const [score, setScore] = useState(0);
  const [curLevel, setCurLevel] = useState(0);
  const [nextLevel, setNextLevel] = useState(1);
  const [highestFruit, setHighestFruit] = useState(0);
  const [dangerTime, setDangerTime] = useState(DANGER_SECONDS);
  const [isDanger, setIsDanger] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [reward, setReward] = useState<GameReward | null>(null);

  // Mutable game state refs for physics loop
  const worldRef = useRef<World>(newWorld());
  const particlesRef = useRef<SuikaParticle[]>([]);
  const floatTextsRef = useRef<SuikaFloatText[]>([]);
  const dropXRef = useRef(CW / 2);
  const shakeRef = useRef(0);
  const dangerTimerRef = useRef(DANGER_SECONDS);
  const dangerRef = useRef(false);
  /** Seconds since nothing was over the line (the warning waits a moment before it goes away) */
  const calmRef = useRef(0);
  const warnCdRef = useRef(0);
  const curLevelRef = useRef(0);
  const nextLevelRef = useRef(1);
  const highestFruitRef = useRef(0);
  const isCooldownRef = useRef(false);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef(performance.now());
  /** Time not yet simulated (less than one tick) */
  const accRef = useRef(0);
  const isPlayingRef = useRef(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownDangerRef = useRef(DANGER_SECONDS);

  // Report the finished round once
  useEffect(() => {
    if (gameState === 'OVER') {
      setReward(onGameComplete({ game: 'suika', score, seconds: elapsedTime }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  useEffect(() => {
    onRoundChange(gameState === 'PLAYING');
  }, [gameState, onRoundChange]);

  useEffect(
    () => () => {
      isPlayingRef.current = false;
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    },
    []
  );

  /** How many fruit this round has rolled (the drop mix depends on it) */
  const rollsRef = useRef(0);
  const randLevel = () => {
    const weights = dropWeights(rollsRef.current++);
    let roll = rngRef.current() * weights.reduce((a, b) => a + b, 0);
    for (let lv = 0; lv < weights.length; lv++) {
      roll -= weights[lv];
      if (roll < 0) return lv;
    }
    return 0;
  };
  /** Seconds played, for the points multiplier inside the physics loop */
  const elapsedRef = useRef(0);

  // Track elapsed play time
  useEffect(() => {
    if (gameState === 'PLAYING' && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsedTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameState, isPaused]);

  // Start / Restart game
  const handleStartGame = () => {
    const roundSeed = seed ?? randomSeed();
    rngRef.current = seededRandom(roundSeed);
    onRoundSeed?.(roundSeed);
    rollsRef.current = 0;
    elapsedRef.current = 0;
    worldRef.current = newWorld();
    particlesRef.current = [];
    floatTextsRef.current = [];
    shakeRef.current = 0;
    dangerTimerRef.current = DANGER_SECONDS;
    dangerRef.current = false;
    warnCdRef.current = 0;
    keysRef.current = { left: false, right: false };
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    shownDangerRef.current = DANGER_SECONDS;

    const cLv = randLevel();
    const nLv = randLevel();
    curLevelRef.current = cLv;
    nextLevelRef.current = nLv;
    highestFruitRef.current = 0;
    isCooldownRef.current = false;
    dropXRef.current = CW / 2;

    setCurLevel(cLv);
    setNextLevel(nLv);
    setHighestFruit(0);
    setScore(0);
    setElapsedTime(0);
    setIsDanger(false);
    setDangerTime(DANGER_SECONDS);
    setIsCooldown(false);
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

  // Drop current fruit
  const handleDrop = useCallback(() => {
    if (!isPlayingRef.current || isCooldownRef.current || isPaused) return;

    const f = FRUITS[curLevelRef.current];
    const clampedX = Math.max(LEFT + f.r + 2, Math.min(RIGHT - f.r - 2, dropXRef.current));

    addBody(worldRef.current, curLevelRef.current, clampedX, holdY(curLevelRef.current), { vy: 1.2 });

    playSound('drop', settings);
    vibrate(HAPTIC.tap, settings);
    isCooldownRef.current = true;
    setIsCooldown(true);

    cooldownTimerRef.current = setTimeout(() => {
      if (!isPlayingRef.current) return;
      curLevelRef.current = nextLevelRef.current;
      const newNext = randLevel();
      nextLevelRef.current = newNext;
      setCurLevel(curLevelRef.current);
      setNextLevel(newNext);
      isCooldownRef.current = false;
      setIsCooldown(false);
    }, COOLDOWN_MS);
  }, [isPaused, settings]);

  // Main game loop: physics in fixed ticks (same on every screen), drawing every frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixelRatio = Math.min(3, Math.max(1, window.devicePixelRatio || 1) * 1.25);
    canvas.width = Math.round(CW * pixelRatio);
    canvas.height = Math.round(CH * pixelRatio);
    lastTimeRef.current = performance.now();
    accRef.current = 0;

    const onMerge = (m: Merge) => {
      if (m.made) {
        const nl = m.made.lv;
        const nf = FRUITS[nl];
        const pts = Math.round((m.a.r + m.b.r + nf.score) * scoreMult(elapsedRef.current));
        setScore((s) => s + pts);

        playSound('merge', settings, { level: nl });
        vibrate(HAPTIC.merge, settings);

        // Particle burst
        for (let p = 0; p < (settings.comboEffect ? 9 : 0); p++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 1.2 + Math.random() * 3.5;
          particlesRef.current.push({
            x: m.x,
            y: m.y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - 0.5,
            r: 2.5 + Math.random() * 3,
            color: nf.color,
            alpha: 1,
            life: 0,
            maxLife: 22 + Math.random() * 14,
          });
        }

        floatTextsRef.current.push({
          x: m.x,
          y: m.y - 12,
          text: `+${pts}`,
          color: nf.color,
          alpha: 1,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -2.2,
        });

        shakeRef.current = Math.max(shakeRef.current, 1 + nl * 0.6);
        if (nl > highestFruitRef.current) {
          highestFruitRef.current = nl;
          setHighestFruit(nl);
        }
        if (nl === FRUITS.length - 1) onUnlockRef.current('suika_watermelon');
      } else {
        // Watermelon + Watermelon Merge -> Huge bonus
        setScore((s) => s + Math.round(5000 * scoreMult(elapsedRef.current)));
        playSound('victory', settings);
        vibrate(HAPTIC.over, settings);
        shakeRef.current = 12;
        if (settings.celebrateEffect) celebrate(true);
      }
    };

    /** One physics tick (1/120 s) */
    const tick = () => {
      const dir = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
      if (dir !== 0) {
        const af = FRUITS[curLevelRef.current];
        dropXRef.current = Math.max(LEFT + af.r + 2, Math.min(RIGHT - af.r - 2, dropXRef.current + dir * KEY_SPEED * TICK_FRAMES));
      }

      stepWorld(worldRef.current).forEach(onMerge);

      // Danger deadline check: a fruit that has come to rest over the line. One still falling
      // into the pile pokes over it for a moment as it lands; that is not overflowing.
      const isHazard = worldRef.current.bodies.some(
        (b) => b.landed && b.scale >= 0.85 && b.y - b.r * b.scale < DEADLINE && Math.hypot(b.vx, b.vy) < SETTLED_SPEED
      );
      if (isHazard) {
        calmRef.current = 0;
        dangerTimerRef.current = Math.max(0, dangerTimerRef.current - TICK_SEC);
        if (!dangerRef.current) {
          dangerRef.current = true;
          setIsDanger(true);
        }
        const shown = Math.ceil(dangerTimerRef.current * 10) / 10;
        if (shown !== shownDangerRef.current) {
          shownDangerRef.current = shown;
          setDangerTime(shown);
        }

        warnCdRef.current -= TICK_SEC;
        if (warnCdRef.current <= 0) {
          playSound('warn', settings);
          warnCdRef.current = Math.max(0.27, dangerTimerRef.current * 0.37);
        }

        if (dangerTimerRef.current <= 0) {
          isPlayingRef.current = false;
          setGameState('OVER');
          playSound('over', settings);
          vibrate(HAPTIC.over, settings);
        }
      } else {
        dangerTimerRef.current = Math.min(DANGER_SECONDS, dangerTimerRef.current + TICK_SEC * 1.6);
        calmRef.current += TICK_SEC;
        // A fruit dipping over the line for an instant shouldn't make the warning flicker
        if (dangerRef.current && calmRef.current > 0.25) {
          dangerRef.current = false;
          setIsDanger(false);
        }
      }

      // Particles & floating texts (speeds are per 60 fps frame)
      particlesRef.current.forEach((p) => {
        p.x += p.vx * TICK_FRAMES;
        p.y += p.vy * TICK_FRAMES;
        p.vy += 0.08 * TICK_FRAMES;
        p.life += TICK_FRAMES;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

      floatTextsRef.current.forEach((t) => {
        t.x += t.vx * TICK_FRAMES;
        t.y += t.vy * TICK_FRAMES;
        t.alpha -= 0.022 * TICK_FRAMES;
      });
      floatTextsRef.current = floatTextsRef.current.filter((t) => t.alpha > 0);

      shakeRef.current *= SHAKE_DECAY;
    };

    const loop = (time: number) => {
      const elapsed = Math.min(time - lastTimeRef.current, 250);
      lastTimeRef.current = time;

      if (!isPaused && isPlayingRef.current) {
        accRef.current += elapsed;
        while (accRef.current >= TICK_MS && isPlayingRef.current) {
          tick();
          accRef.current -= TICK_MS;
        }
      } else {
        accRef.current = 0;
      }
      // How far into the next tick we are: fruit are drawn between their last two positions
      const lerp = isPlayingRef.current && !isPaused ? accRef.current / TICK_MS : 1;

      // --- RENDERING CANVAS ---
      const P = dark ? PALETTE.dark : PALETTE.light;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.clearRect(0, 0, CW, CH);

      // A smooth sway instead of random jumps, so the jar never looks like it's trembling
      const shake = settings.shakeEffect && shakeRef.current > 0.15 ? shakeRef.current : 0;
      const shakeX = shake ? Math.sin(time * 0.06) * shake : 0;
      const shakeY = shake ? Math.cos(time * 0.075) * shake * 0.6 : 0;

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Jar interior
      const jarGrad = ctx.createLinearGradient(0, JAR_TOP, 0, BOTTOM);
      jarGrad.addColorStop(0, P.jarTop);
      jarGrad.addColorStop(1, P.jarBottom);
      ctx.fillStyle = jarGrad;
      ctx.beginPath();
      ctx.roundRect(LEFT, JAR_TOP, RIGHT - LEFT, BOTTOM - JAR_TOP, [0, 0, 24, 24]);
      ctx.fill();

      // Overflow line. In danger: the space above it pulses red and a red bar on the line
      // shrinks toward the middle as the seconds run out.
      ctx.save();
      const lineL = LEFT + 6;
      const lineR = RIGHT - 6;
      if (dangerRef.current) {
        ctx.fillStyle = P.danger;
        ctx.globalAlpha = 0.1 + (Math.sin(time * 0.012) + 1) * 0.06;
        ctx.fillRect(LEFT, JAR_TOP, RIGHT - LEFT, DEADLINE - JAR_TOP);
        ctx.globalAlpha = 1;
      }
      ctx.setLineDash([8, 7]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = dangerRef.current ? P.danger : P.deadline;
      ctx.beginPath();
      ctx.moveTo(lineL, DEADLINE);
      ctx.lineTo(lineR, DEADLINE);
      ctx.stroke();
      if (dangerRef.current) {
        const half = ((lineR - lineL) / 2) * Math.max(0, Math.min(1, dangerTimerRef.current / DANGER_SECONDS));
        const mid = (lineL + lineR) / 2;
        ctx.setLineDash([]);
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(mid - half, DEADLINE);
        ctx.lineTo(mid + half, DEADLINE);
        ctx.stroke();
      } else {
        ctx.fillStyle = P.deadline;
        ctx.font = '700 12px Pretendard, Jua, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('넘침 선', lineR, DEADLINE - 5);
      }
      ctx.restore();

      const aiming = isPlayingRef.current && !isCooldownRef.current;
      const aimFruit = FRUITS[curLevelRef.current];
      const aimX = Math.max(LEFT + aimFruit.r + 2, Math.min(RIGHT - aimFruit.r - 2, dropXRef.current));

      // Aiming guide (under the fruits)
      if (aiming) {
        ctx.save();
        ctx.strokeStyle = P.guide;
        ctx.setLineDash([3, 7]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(aimX, DEADLINE);
        ctx.lineTo(aimX, BOTTOM);
        ctx.stroke();
        ctx.restore();
      }

      // Fruits, back to front
      const sortedBodies = [...worldRef.current.bodies].sort((a, b) => a.y - b.y);
      for (let i = 0; i < sortedBodies.length; i++) {
        const b = sortedBodies[i];
        const f = FRUITS[b.lv];
        if (!f) continue;
        const at = drawPos(b, lerp);
        ctx.save();
        ctx.translate(at.x, at.y);
        ctx.scale(b.scale, b.scale);
        drawFruit(ctx, f, b.r, at.angle, P, dangerRef.current && b.y - b.r < DEADLINE);
        ctx.restore();
      }

      // Fruit waiting to be dropped
      if (aiming) {
        ctx.save();
        ctx.translate(aimX, holdY(curLevelRef.current));
        drawFruit(ctx, aimFruit, aimFruit.r, 0, P, false);
        ctx.restore();
      }

      // Particles
      for (let p = 0; p < particlesRef.current.length; p++) {
        const pt = particlesRef.current[p];
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Floating score texts
      for (let t = 0; t < floatTextsRef.current.length; t++) {
        const ft = floatTextsRef.current[t];
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = '700 20px Fredoka, Jua, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 5;
        ctx.strokeStyle = P.textStroke;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      // Jar walls
      ctx.strokeStyle = P.wall;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(LEFT, JAR_TOP);
      ctx.lineTo(LEFT, BOTTOM - 24);
      ctx.arcTo(LEFT, BOTTOM, LEFT + 24, BOTTOM, 24);
      ctx.lineTo(RIGHT - 24, BOTTOM);
      ctx.arcTo(RIGHT, BOTTOM, RIGHT, BOTTOM - 24, 24);
      ctx.lineTo(RIGHT, JAR_TOP);
      ctx.stroke();

      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPaused, settings, dark]);

  // Keyboard: ← → / A D to aim, Space · ↓ · Enter to drop (or start)
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const actionsRef = useRef({ start: handleStartGame, drop: handleDrop });
  actionsRef.current = { start: handleStartGame, drop: handleDrop };

  useEffect(() => {
    const isLeft = (e: KeyboardEvent) => e.code === 'ArrowLeft' || e.code === 'KeyA';
    const isRight = (e: KeyboardEvent) => e.code === 'ArrowRight' || e.code === 'KeyD';
    const isAction = (e: KeyboardEvent) => e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'Enter';

    const onDown = (e: KeyboardEvent) => {
      if (isPausedRef.current || e.ctrlKey || e.metaKey || e.altKey) return;
      const state = gameStateRef.current;
      if (state === 'PLAYING') {
        if (isLeft(e)) keysRef.current.left = true;
        else if (isRight(e)) keysRef.current.right = true;
        else if (isAction(e)) {
          if (!e.repeat) actionsRef.current.drop();
        } else return;
        e.preventDefault();
        // Keep Space from also "clicking" a button that still has focus
        (document.activeElement as HTMLElement | null)?.blur?.();
      } else if (state === 'IDLE' && isAction(e)) {
        // A focused button handles Space/Enter itself
        if ((e.target as HTMLElement | null)?.closest?.('button')) return;
        e.preventDefault();
        actionsRef.current.start();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (isLeft(e)) keysRef.current.left = false;
      if (isRight(e)) keysRef.current.right = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Pointer interactions with accurate canvas scaling
  const handlePointerMove = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (clientX - rect.left) * (CW / rect.width);
    const f = FRUITS[curLevelRef.current];
    dropXRef.current = Math.max(LEFT + f.r + 2, Math.min(RIGHT - f.r - 2, canvasX));
  };

  const topFruit = FRUITS[highestFruit];
  const mult = gameState === 'IDLE' ? 1 : scoreMult(elapsedTime);

  return (
    <>
      <GameFrame
        hud={
          <Hud>
            <HudStat label="점수" value={formatNumber(score)} />
            <HudStat label="최고" value={formatNumber(Math.max(best, score))} tone={best > 0 && score > best ? 'hot' : 'default'} />
            {/* The points multiplier rides on the time: it grows the longer the round lasts */}
            <HudStat label={mult > 1 ? `시간 ×${mult.toFixed(1)}` : '시간'} value={formatTime(elapsedTime)} tone={mult > 1 ? 'hot' : 'default'} />
            <HudStat label="다음" value={<Emoji e={FRUITS[nextLevel]?.emoji ?? ''} className="text-2xl leading-none" />} />
          </Hud>
        }
        board={
          <div className="board-fit w-full" style={{ maxWidth: 'calc((100dvh - var(--board-offset)) * 0.7333)' }}>
            <div className="relative aspect-[440/600] w-full overflow-hidden rounded-[28px] border-2 border-line bg-surface-2 shadow-pop">
              <canvas
                ref={canvasRef}
                aria-label="수박 게임 판"
                onPointerDown={(e) => handlePointerMove(e.clientX)}
                onPointerMove={(e) => handlePointerMove(e.clientX)}
                onPointerUp={() => handleDrop()}
                className="block h-full w-full cursor-crosshair touch-none select-none"
              />

              {isDanger && gameState === 'PLAYING' && (
                <div
                  role="alert"
                  className="chip pointer-events-none absolute right-2 top-2 z-10 bg-berry-deep text-white shadow-hard-sm"
                >
                  <AlertTriangle className="h-3.5 w-3.5" strokeWidth={3} /> 넘치기 직전! {dangerTime.toFixed(1)}초
                </div>
              )}

              {gameState === 'IDLE' && (
                <BoardOverlay>
                  <StartCard meta={GAMES.suika} best={best} onStart={handleStartGame} onHelp={onHelp} />
                </BoardOverlay>
              )}
            </div>
          </div>
        }
        panel={
          <div className="panel p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg">
                과일 진화
                {mult > 1 && (
                  <span key={mult} className="chip h-6 bg-mango px-2 text-[11px] text-on-bright animate-pop-in" title="오래 버틸수록 점수가 올라요">
                    점수 ×{mult.toFixed(1)}
                  </span>
                )}
              </h3>
              <span className="text-xs font-bold text-ink-3">
                최고: <Emoji e={topFruit.emoji} /> {topFruit.name}
              </span>
            </div>
            <ol className="grid grid-cols-6 gap-1.5">
              {FRUITS.map((f, i) => {
                const reached = i <= highestFruit;
                const isTop = i === highestFruit && gameState !== 'IDLE';
                return (
                  <li
                    key={f.name}
                    title={`${f.name} · ${f.score}점`}
                    className={`grid aspect-square place-items-center rounded-xl border-2 border-line text-xl transition-all ${
                      isTop ? '-translate-y-0.5 bg-mango-soft shadow-hard-sm' : reached ? 'bg-surface-2' : 'bg-surface-3 opacity-40 grayscale'
                    }`}
                  >
                    <Emoji e={f.emoji} />
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="hidden text-xs text-ink-3 sm:block short:hidden">← → 이동 · Space 낙하</p>
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

      {gameState === 'OVER' && (
        <ScreenOverlay>
          <ResultCard
            game="suika"
            emoji={highestFruit === FRUITS.length - 1 ? '🍉' : '💥'}
            title="GAME OVER"
            subtitle="과일이 점선 위로 넘쳤어요"
            tone="berry"
            score={score}
            stats={[
              { label: '가장 큰 과일', value: `${topFruit.emoji} ${topFruit.name}` },
              { label: '플레이 시간', value: formatTime(elapsedTime) },
            ]}
            reward={reward}
            shareText={`🍉 수박 게임 ${formatNumber(score)}점! 가장 큰 과일은 ${topFruit.emoji} ${topFruit.name}`}
            onRetry={handleStartGame}
            onExit={onExit}
          />
        </ScreenOverlay>
      )}
    </>
  );
};
