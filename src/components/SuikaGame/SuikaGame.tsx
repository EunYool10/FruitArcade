import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { GameResult, GameReward, GameSettings, SuikaBody, SuikaFruitDef, SuikaParticle, SuikaFloatText } from '../../types';
import { GAMES } from '../../constants';
import { playSound } from '../../utils/audio';
import { HAPTIC, vibrate } from '../../utils/haptics';
import { celebrate } from '../../utils/fx';
import { formatNumber, formatTime } from '../../utils/format';
import { BoardOverlay, GameFrame, Hud, HudStat, ScreenOverlay } from '../game/GameFrame';
import { StartCard } from '../game/StartCard';
import { ResultCard } from '../game/ResultCard';

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
const GRAVITY = 0.38;
const BOUNCE = 0.22;
const FRICTION = 0.985;
const COOLDOWN_MS = 550;
// Chance of each droppable fruit (cherry, strawberry, grape, hallabong, persimmon)
const DROP_WEIGHTS = [0.3, 0.25, 0.2, 0.15, 0.1];
const KEY_SPEED = 6.5;

const PALETTE = {
  light: {
    jarTop: '#fffdf8',
    jarBottom: '#ffe9c4',
    wall: '#2b2140',
    outline: '#2b2140',
    deadline: 'rgba(43, 33, 64, 0.32)',
    danger: '#e3285f',
    guide: 'rgba(43, 33, 64, 0.3)',
    textStroke: '#ffffff',
  },
  dark: {
    jarTop: '#2c2443',
    jarBottom: '#1d1729',
    wall: '#ffb627',
    outline: '#07050c',
    deadline: 'rgba(255, 244, 228, 0.32)',
    danger: '#ff4778',
    guide: 'rgba(255, 244, 228, 0.3)',
    textStroke: '#07050c',
  },
};
type Palette = (typeof PALETTE)['light'];

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

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
  ctx.fillStyle = '#000'; // color emoji inherit the fill alpha
  ctx.font = `${Math.round(r * 1.1)}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(f.emoji, 0, r * 0.07);
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
}) => {
  // Kept in a ref so the physics loop is not restarted when the callback identity changes
  const onUnlockRef = useRef(onUnlockAchieve);
  onUnlockRef.current = onUnlockAchieve;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'OVER'>('IDLE');
  const [score, setScore] = useState(0);
  const [curLevel, setCurLevel] = useState(0);
  const [nextLevel, setNextLevel] = useState(1);
  const [highestFruit, setHighestFruit] = useState(0);
  const [dangerTime, setDangerTime] = useState(3.0);
  const [isDanger, setIsDanger] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [reward, setReward] = useState<GameReward | null>(null);

  // Mutable game state refs for physics loop
  const bodiesRef = useRef<SuikaBody[]>([]);
  const particlesRef = useRef<SuikaParticle[]>([]);
  const floatTextsRef = useRef<SuikaFloatText[]>([]);
  const dropXRef = useRef(CW / 2);
  const shakeRef = useRef(0);
  const dangerTimerRef = useRef(3.0);
  const dangerRef = useRef(false);
  const warnCdRef = useRef(0);
  const curLevelRef = useRef(0);
  const nextLevelRef = useRef(1);
  const highestFruitRef = useRef(0);
  const isCooldownRef = useRef(false);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef(performance.now());
  const isPlayingRef = useRef(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownDangerRef = useRef(3.0);

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

  const randLevel = () => {
    let roll = Math.random();
    for (let lv = 0; lv < DROP_WEIGHTS.length; lv++) {
      roll -= DROP_WEIGHTS[lv];
      if (roll < 0) return lv;
    }
    return 0;
  };

  // Track elapsed play time
  useEffect(() => {
    if (gameState === 'PLAYING' && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
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
    bodiesRef.current = [];
    particlesRef.current = [];
    floatTextsRef.current = [];
    shakeRef.current = 0;
    dangerTimerRef.current = 3.0;
    dangerRef.current = false;
    warnCdRef.current = 0;
    keysRef.current = { left: false, right: false };
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    shownDangerRef.current = 3.0;

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
    setDangerTime(3.0);
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

    bodiesRef.current.push({
      id: Math.random().toString(36).slice(2),
      lv: curLevelRef.current,
      x: clampedX,
      y: DEADLINE - 22,
      vx: 0,
      vy: 1.2,
      r: f.r,
      mass: Math.max(1, f.r * f.r * 0.12),
      angle: 0,
      aVel: (Math.random() - 0.5) * 0.04,
      scale: 0.95,
      sleeping: false,
      sleepT: 0,
      landed: false,
    });

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

  // Main game loop (Physics + Canvas Render)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixelRatio = Math.min(3, Math.max(1, window.devicePixelRatio || 1) * 1.25);
    canvas.width = Math.round(CW * pixelRatio);
    canvas.height = Math.round(CH * pixelRatio);

    const loop = (time: number) => {
      const rawDt = Math.min((time - lastTimeRef.current) / 16.666, 2.5);
      lastTimeRef.current = time;

      if (!isPaused && isPlayingRef.current) {
        const dir = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
        if (dir !== 0) {
          const af = FRUITS[curLevelRef.current];
          dropXRef.current = Math.max(LEFT + af.r + 2, Math.min(RIGHT - af.r - 2, dropXRef.current + dir * KEY_SPEED * rawDt));
        }

        // Multi-substep physics simulation for high collision stability
        const SUBSTEPS = 4;
        const subDt = rawDt / SUBSTEPS;
        const gStep = (GRAVITY * subDt);

        for (let step = 0; step < SUBSTEPS; step++) {
          // 1. Move bodies & apply gravity
          for (let i = 0; i < bodiesRef.current.length; i++) {
            const b = bodiesRef.current[i];
            if (b.sleeping) continue;

            b.vx = Math.max(-12, Math.min(12, b.vx));
            b.vy = Math.max(-12, Math.min(12, b.vy));

            const spd2 = b.vx * b.vx + b.vy * b.vy;
            if (spd2 < 0.04 && Math.abs(b.aVel) < 0.03) {
              b.sleepT = (b.sleepT || 0) + 1;
              if (b.sleepT > 30) {
                b.vx = 0;
                b.vy = 0;
                b.aVel = 0;
                b.sleeping = true;
              }
            } else {
              b.sleepT = 0;
              b.sleeping = false;
            }

            if (b.sleeping) continue;

            b.vy += gStep;
            b.x += b.vx * subDt;
            b.y += b.vy * subDt;
            b.angle += b.aVel * subDt;

            if (b.scale < 1) {
              b.scale = Math.min(1, b.scale + 0.15 * subDt);
            }

            b.vx *= Math.pow(FRICTION, subDt);
            b.vy *= Math.pow(FRICTION, subDt);
            b.aVel *= Math.pow(0.96, subDt);
          }

          // 2. Wall and Floor boundary constraints
          for (let i = 0; i < bodiesRef.current.length; i++) {
            const b = bodiesRef.current[i];
            const sr = b.r * b.scale;

            if (b.x - sr < LEFT) {
              b.x = LEFT + sr;
              if (b.vx < 0) b.vx = -b.vx * BOUNCE;
              b.sleeping = false;
            }
            if (b.x + sr > RIGHT) {
              b.x = RIGHT - sr;
              if (b.vx > 0) b.vx = -b.vx * BOUNCE;
              b.sleeping = false;
            }
            if (b.y + sr > BOTTOM) {
              b.landed = true;
              b.y = BOTTOM - sr;
              if (b.vy > 0) {
                b.vy = -b.vy * (BOUNCE * 0.35);
                b.vx *= 0.86;
                b.aVel *= 0.85;
                if (Math.abs(b.vy) < 0.2) b.vy = 0;
              }
              b.sleeping = false;
            }
          }

          // 3. Body-Body collision detection & mass-weighted resolution
          const mergedIds = new Set<string>();
          const toMerge: [SuikaBody, SuikaBody][] = [];

          for (let i = 0; i < bodiesRef.current.length; i++) {
            const b1 = bodiesRef.current[i];
            for (let j = i + 1; j < bodiesRef.current.length; j++) {
              const b2 = bodiesRef.current[j];
              if (mergedIds.has(b1.id) || mergedIds.has(b2.id)) continue;
              if (b1.sleeping && b2.sleeping) continue;

              const dx = b2.x - b1.x;
              const dy = b2.y - b1.y;
              const d2 = dx * dx + dy * dy;
              const r1 = b1.r * b1.scale;
              const r2 = b2.r * b2.scale;
              const minD = r1 + r2;

              if (d2 < minD * minD && d2 > 0.0001) {
                b1.sleeping = false;
                b2.sleeping = false;
                // Touching the pile means the fruit has landed (two fruit still in the air do not count)
                if (b1.landed || b2.landed) {
                  b1.landed = true;
                  b2.landed = true;
                }

                const d = Math.sqrt(d2);
                const nx = dx / d;
                const ny = dy / d;
                const overlap = minD - d;

                const invM1 = 1 / b1.mass;
                const invM2 = 1 / b2.mass;
                const sumInv = invM1 + invM2;

                const w1 = invM1 / sumInv;
                const w2 = invM2 / sumInv;

                // Separate positions based on relative masses
                b1.x -= nx * overlap * w1 * 0.8;
                b1.y -= ny * overlap * w1 * 0.8;
                b2.x += nx * overlap * w2 * 0.8;
                b2.y += ny * overlap * w2 * 0.8;

                // Immediate wall clamp
                if (b1.x - r1 < LEFT) b1.x = LEFT + r1;
                if (b1.x + r1 > RIGHT) b1.x = RIGHT - r1;
                if (b1.y + r1 > BOTTOM) b1.y = BOTTOM - r1;

                if (b2.x - r2 < LEFT) b2.x = LEFT + r2;
                if (b2.x + r2 > RIGHT) b2.x = RIGHT - r2;
                if (b2.y + r2 > BOTTOM) b2.y = BOTTOM - r2;

                // Velocity impulse response
                const rvx = b2.vx - b1.vx;
                const rvy = b2.vy - b1.vy;
                const vn = rvx * nx + rvy * ny;

                if (vn < 0) {
                  const imp = (-(1 + BOUNCE * 0.25) * vn) / sumInv;
                  b1.vx -= invM1 * imp * nx;
                  b1.vy -= invM1 * imp * ny;
                  b2.vx += invM2 * imp * nx;
                  b2.vy += invM2 * imp * ny;
                }

                // Merge check
                if (b1.lv === b2.lv && !mergedIds.has(b1.id) && !mergedIds.has(b2.id)) {
                  mergedIds.add(b1.id);
                  mergedIds.add(b2.id);
                  toMerge.push([b1, b2]);
                }
              }
            }
          }

          // 4. Process Merges
          for (let m = 0; m < toMerge.length; m++) {
            const [b1, b2] = toMerge[m];
            bodiesRef.current = bodiesRef.current.filter((b) => b.id !== b1.id && b.id !== b2.id);

            let mx = (b1.x + b2.x) * 0.5;
            let my = (b1.y + b2.y) * 0.5;
            const nl = b1.lv + 1;

            if (nl < FRUITS.length) {
              const nf = FRUITS[nl];

              // Clamp spawn location to ensure it never spawns outside walls or floor
              mx = Math.max(LEFT + nf.r, Math.min(RIGHT - nf.r, mx));
              my = Math.min(BOTTOM - nf.r, my);

              bodiesRef.current.push({
                id: Math.random().toString(36).slice(2),
                lv: nl,
                x: mx,
                y: my,
                vx: (b1.vx + b2.vx) * 0.4,
                vy: (b1.vy + b2.vy) * 0.4 - 1.6,
                r: nf.r,
                mass: Math.max(1, nf.r * nf.r * 0.12),
                angle: (b1.angle + b2.angle) * 0.5,
                aVel: (b1.aVel + b2.aVel) * 0.5,
                scale: 0.75,
                sleeping: false,
                sleepT: 0,
                landed: true,
              });

              const pts = Math.round(b1.r + b2.r + nf.score);
              setScore((s) => s + pts);

              playSound('merge', settings, { level: nl });
              vibrate(HAPTIC.merge, settings);

              // Particle burst
              for (let p = 0; p < (settings.comboEffect ? 9 : 0); p++) {
                const a = Math.random() * Math.PI * 2;
                const sp = 1.2 + Math.random() * 3.5;
                particlesRef.current.push({
                  x: mx,
                  y: my,
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
                x: mx,
                y: my - 12,
                text: `+${pts}`,
                color: nf.color,
                alpha: 1,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -2.2,
              });

              shakeRef.current = Math.max(shakeRef.current, 1.8 + nl * 1.4);
              if (nl > highestFruitRef.current) {
                highestFruitRef.current = nl;
                setHighestFruit(nl);
              }
              if (nl === FRUITS.length - 1) onUnlockRef.current('suika_watermelon');
            } else {
              // Watermelon + Watermelon Merge -> Huge bonus
              setScore((s) => s + 5000);
              playSound('victory', settings);
              vibrate(HAPTIC.over, settings);
              shakeRef.current = 24;
              if (settings.celebrateEffect) celebrate(true);
            }
          }
        }

        // 5. Danger deadline check
        let isHazard = false;
        for (let i = 0; i < bodiesRef.current.length; i++) {
          const b = bodiesRef.current[i];
          if (b.scale < 0.85 || !b.landed) continue;
          if (b.y - b.r * b.scale < DEADLINE) {
            isHazard = true;
            break;
          }
        }

        const dtSec = rawDt / 60;
        if (isHazard) {
          dangerTimerRef.current = Math.max(0, dangerTimerRef.current - dtSec);
          dangerRef.current = true;
          setIsDanger(true);
          const shown = Math.ceil(dangerTimerRef.current * 10) / 10;
          if (shown !== shownDangerRef.current) {
            shownDangerRef.current = shown;
            setDangerTime(shown);
          }

          warnCdRef.current -= 1;
          if (warnCdRef.current <= 0) {
            playSound('warn', settings);
            warnCdRef.current = Math.max(16, Math.round(dangerTimerRef.current * 22));
          }

          if (dangerTimerRef.current <= 0) {
            isPlayingRef.current = false;
            setGameState('OVER');
            playSound('over', settings);
            vibrate(HAPTIC.over, settings);
          }
        } else {
          dangerTimerRef.current = Math.min(3.0, dangerTimerRef.current + dtSec * 1.6);
          dangerRef.current = false;
          setIsDanger(false);
        }

        // 6. Update particles & floating texts
        particlesRef.current.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08;
          p.life++;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);
        });
        particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

        floatTextsRef.current.forEach((t) => {
          t.x += t.vx;
          t.y += t.vy;
          t.alpha -= 0.022;
        });
        floatTextsRef.current = floatTextsRef.current.filter((t) => t.alpha > 0);

        shakeRef.current *= 0.88;
      }

      // --- RENDERING CANVAS ---
      const P = dark ? PALETTE.dark : PALETTE.light;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.clearRect(0, 0, CW, CH);

      const shake = settings.shakeEffect ? shakeRef.current : 0;
      const shakeX = shake > 0.1 ? (Math.random() - 0.5) * shake : 0;
      const shakeY = shake > 0.1 ? (Math.random() - 0.5) * shake : 0;

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

      // Deadline
      ctx.save();
      ctx.setLineDash([8, 7]);
      ctx.lineWidth = 2.5;
      if (dangerRef.current) {
        ctx.strokeStyle = P.danger;
        ctx.globalAlpha = 0.55 + Math.sin(time * 0.012) * 0.45;
      } else {
        ctx.strokeStyle = P.deadline;
      }
      ctx.beginPath();
      ctx.moveTo(LEFT + 6, DEADLINE);
      ctx.lineTo(RIGHT - 6, DEADLINE);
      ctx.stroke();
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
        ctx.moveTo(aimX, JAR_TOP + aimFruit.r);
        ctx.lineTo(aimX, BOTTOM);
        ctx.stroke();
        ctx.restore();
      }

      // Fruits, back to front
      const sortedBodies = [...bodiesRef.current].sort((a, b) => a.y - b.y);
      for (let i = 0; i < sortedBodies.length; i++) {
        const b = sortedBodies[i];
        const f = FRUITS[b.lv];
        if (!f) continue;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.scale(b.scale, b.scale);
        drawFruit(ctx, f, b.r, b.angle, P, dangerRef.current && b.y - b.r < DEADLINE);
        ctx.restore();
      }

      // Fruit waiting to be dropped
      if (aiming) {
        ctx.save();
        ctx.translate(aimX, JAR_TOP);
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

  return (
    <>
      <GameFrame
        hud={
          <Hud>
            <HudStat label="점수" value={formatNumber(score)} />
            <HudStat label="최고" value={formatNumber(Math.max(best, score))} tone={best > 0 && score > best ? 'hot' : 'default'} />
            <HudStat label="시간" value={formatTime(elapsedTime)} />
            <HudStat label="다음" value={<span className="text-2xl leading-none">{FRUITS[nextLevel]?.emoji}</span>} />
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
                  style={{ top: `calc(${(DEADLINE / CH) * 100}% + 10px)` }}
                  className="chip pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 animate-pulse bg-berry-deep text-white shadow-hard-sm"
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
              <h3 className="font-display text-lg">과일 진화</h3>
              <span className="text-xs font-bold text-ink-3">
                최고: {topFruit.emoji} {topFruit.name}
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
                    {f.emoji}
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
