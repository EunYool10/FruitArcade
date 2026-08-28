import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Home, Sparkles, AlertTriangle, Play, Zap, Trophy, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameSettings, SuikaBody, SuikaFruitDef, SuikaParticle, SuikaFloatText } from '../../types';
import { playSound } from '../../utils/audio';
import { GameTimer, formatTime } from '../Common/GameTimer';

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
const GRAVITY = 0.38;
const BOUNCE = 0.22;
const FRICTION = 0.985;
const COOLDOWN_MS = 550;
const MAX_DROP_LEVEL = 4;

interface Props {
  settings: GameSettings;
  onMenu: () => void;
  isPaused: boolean;
}

export const SuikaGame: React.FC<Props> = ({ settings, onMenu, isPaused }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'OVER'>('IDLE');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem('suika_hs') || '0');
    } catch {
      return 0;
    }
  });
  const [curLevel, setCurLevel] = useState(0);
  const [nextLevel, setNextLevel] = useState(1);
  const [highestFruit, setHighestFruit] = useState(0);
  const [dangerTime, setDangerTime] = useState(3.0);
  const [isDanger, setIsDanger] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Mutable game state refs for physics loop
  const bodiesRef = useRef<SuikaBody[]>([]);
  const particlesRef = useRef<SuikaParticle[]>([]);
  const floatTextsRef = useRef<SuikaFloatText[]>([]);
  const dropXRef = useRef(CW / 2);
  const shakeRef = useRef(0);
  const dangerTimerRef = useRef(3.0);
  const warnCdRef = useRef(0);
  const curLevelRef = useRef(0);
  const nextLevelRef = useRef(1);
  const highestFruitRef = useRef(0);
  const isCooldownRef = useRef(false);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef(performance.now());
  const isPlayingRef = useRef(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const randLevel = () => Math.floor(Math.random() * (MAX_DROP_LEVEL + 1));

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
    warnCdRef.current = 0;

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
    setGameState('PLAYING');
    isPlayingRef.current = true;
    lastTimeRef.current = performance.now();

    playSound('click', settings);
  };

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
    });

    playSound('drop', settings);
    isCooldownRef.current = true;
    setIsCooldown(true);

    setTimeout(() => {
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

    const loop = (time: number) => {
      const rawDt = Math.min((time - lastTimeRef.current) / 16.666, 2.5);
      lastTimeRef.current = time;

      if (!isPaused && isPlayingRef.current) {
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
              });

              const pts = Math.round(b1.r + b2.r + nf.score);
              setScore((s) => {
                const nextS = s + pts;
                if (nextS > highScore) {
                  setHighScore(nextS);
                  try {
                    localStorage.setItem('suika_hs', nextS.toString());
                  } catch {
                    // ignore
                  }
                }
                return nextS;
              });

              playSound('merge', settings);

              // Particle burst
              for (let p = 0; p < 9; p++) {
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
            } else {
              // Watermelon + Watermelon Merge -> Huge bonus
              setScore((s) => s + 5000);
              playSound('victory', settings);
              shakeRef.current = 24;
              confetti({ particleCount: 120, spread: 85, origin: { y: 0.6 } });
            }
          }
        }

        // 5. Danger deadline check
        let isHazard = false;
        for (let i = 0; i < bodiesRef.current.length; i++) {
          const b = bodiesRef.current[i];
          if (b.scale < 0.85) continue;
          if (b.y - b.r * b.scale < DEADLINE) {
            isHazard = true;
            break;
          }
        }

        const dtSec = rawDt / 60;
        if (isHazard) {
          dangerTimerRef.current = Math.max(0, dangerTimerRef.current - dtSec);
          setIsDanger(true);
          setDangerTime(dangerTimerRef.current);

          warnCdRef.current -= 1;
          if (warnCdRef.current <= 0) {
            playSound('warn', settings);
            warnCdRef.current = Math.max(16, Math.round(dangerTimerRef.current * 22));
          }

          if (dangerTimerRef.current <= 0) {
            isPlayingRef.current = false;
            setGameState('OVER');
            playSound('over', settings);
          }
        } else {
          dangerTimerRef.current = Math.min(3.0, dangerTimerRef.current + dtSec * 1.6);
          if (dangerTimerRef.current >= 3.0) {
            setIsDanger(false);
          } else {
            setIsDanger(true);
            setDangerTime(dangerTimerRef.current);
          }
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
      ctx.clearRect(0, 0, CW, CH);

      const shakeX = shakeRef.current > 0.1 ? (Math.random() - 0.5) * shakeRef.current : 0;
      const shakeY = shakeRef.current > 0.1 ? (Math.random() - 0.5) * shakeRef.current : 0;

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Play area backdrop
      const boxGrad = ctx.createLinearGradient(0, DEADLINE - 30, 0, BOTTOM);
      boxGrad.addColorStop(0, 'rgba(14, 18, 34, 0.95)');
      boxGrad.addColorStop(1, 'rgba(9, 12, 24, 0.98)');
      ctx.fillStyle = boxGrad;
      ctx.beginPath();
      ctx.roundRect(LEFT, DEADLINE - 30, RIGHT - LEFT, BOTTOM - (DEADLINE - 30), [0, 0, 16, 16]);
      ctx.fill();

      // Deadline dashed line
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      if (isDanger) {
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.6 + Math.sin(time * 0.012) * 0.4})`;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
      } else {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      }
      ctx.beginPath();
      ctx.moveTo(LEFT, DEADLINE);
      ctx.lineTo(RIGHT, DEADLINE);
      ctx.stroke();
      ctx.restore();

      // Sort bodies by y position for natural stacking visual depth
      const sortedBodies = [...bodiesRef.current].sort((a, b) => a.y - b.y);

      // Render fruit bodies
      for (let i = 0; i < sortedBodies.length; i++) {
        const b = sortedBodies[i];
        const f = FRUITS[b.lv];
        if (!f) continue;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.scale(b.scale, b.scale);

        // Body base circle
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Border
        const isNearDeadline = b.y - b.r < DEADLINE && isDanger;
        ctx.strokeStyle = isNearDeadline ? 'rgba(239, 68, 68, 0.95)' : 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Radial shading highlight
        const g = ctx.createRadialGradient(-b.r * 0.35, -b.r * 0.35, b.r * 0.1, 0, 0, b.r);
        g.addColorStop(0, 'rgba(255, 255, 255, 0.32)');
        g.addColorStop(0.7, 'rgba(0, 0, 0, 0.05)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.fill();

        // Emoji Sprite inside exact circle
        ctx.font = `bold ${b.r * 1.12}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.emoji, 0, b.r * 0.05);

        ctx.restore();
      }

      // Aiming guide & Dropper Fruit
      if (isPlayingRef.current && !isCooldownRef.current) {
        const f = FRUITS[curLevelRef.current];
        const cx = Math.max(LEFT + f.r + 2, Math.min(RIGHT - f.r - 2, dropXRef.current));

        // Dropper guide line
        ctx.save();
        ctx.strokeStyle = `${f.color}50`;
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, DEADLINE - 30);
        ctx.lineTo(cx, BOTTOM);
        ctx.stroke();
        ctx.restore();

        // Dropper preview fruit
        ctx.save();
        ctx.translate(cx, DEADLINE - 30);
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(0, 0, f.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = `bold ${f.r * 1.1}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.emoji, 0, f.r * 0.05);
        ctx.restore();
      }

      // Render Particles
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

      // Render Floating score texts
      for (let t = 0; t < floatTextsRef.current.length; t++) {
        const ft = floatTextsRef.current[t];
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 4;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      // Exterior container frame / Neon walls
      ctx.strokeStyle = '#ff7a00';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([]);
      ctx.shadowColor = 'rgba(255, 122, 0, 0.45)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(LEFT, DEADLINE - 30);
      ctx.lineTo(LEFT, BOTTOM);
      ctx.lineTo(RIGHT, BOTTOM);
      ctx.lineTo(RIGHT, DEADLINE - 30);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPaused, highScore, settings]);

  // Pointer interactions with accurate canvas scaling
  const handlePointerMove = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = CW / rect.width;
    const canvasX = (clientX - rect.left) * scale;
    const f = FRUITS[curLevelRef.current];
    dropXRef.current = Math.max(LEFT + f.r + 2, Math.min(RIGHT - f.r - 2, canvasX));
  };

  return (
    <div id="suika-game-board" className="flex-1 flex flex-col items-center justify-center p-[var(--ui-space-lg)] w-full max-w-[500px] mx-auto animate-in fade-in duration-300 select-none">
      {/* Top Game HUD - Standardized Arcade HUD Box */}
      <div
        id="suika-hud"
        className="arcade-hud-box mb-2.5"
      >
        {/* Left: Score & Best */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Zap className="w-4 h-4 fill-orange-400/40" />
            </div>
            <div>
              <div className="text-[10px] font-black text-orange-400 tracking-wider uppercase">SCORE</div>
              <div className="text-lg sm:text-xl font-mono font-black text-white leading-none">{score}</div>
            </div>
          </div>

          <div className="hidden sm:block pl-3 border-l border-white/10">
            <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Trophy className="w-2.5 h-2.5 text-amber-400" /> BEST
            </div>
            <div className="text-sm font-mono font-bold text-slate-300">{highScore}</div>
          </div>
        </div>

        {/* Center/Right: Next Fruit & Timer */}
        <div className="flex items-center gap-2">
          {gameState === 'PLAYING' && (
            <>
              <GameTimer seconds={elapsedTime} id="suika-timer" />
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-extrabold text-orange-400">NEXT</span>
                <span className="text-xl leading-none">{FRUITS[nextLevel]?.emoji}</span>
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleStartGame}
            title="다시 시작"
            className="h-[var(--ui-btn-h-nav)] min-h-[44px] sm:min-h-0 w-[36px] sm:w-[34px] rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 text-slate-300 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onMenu}
            title="메인 메뉴"
            className="h-[var(--ui-btn-h-nav)] min-h-[44px] sm:min-h-0 px-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 text-slate-300 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer whitespace-nowrap active:scale-95"
          >
            메뉴
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="relative rounded-[22px] overflow-hidden border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.6)] bg-[#0d1222] w-full aspect-[440/600] max-h-[calc(100vh-185px)]">
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          onMouseMove={(e) => handlePointerMove(e.clientX)}
          onClick={handleDrop}
          onTouchMove={(e) => {
            e.preventDefault();
            handlePointerMove(e.touches[0].clientX);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleDrop();
          }}
          className="w-full h-full block cursor-crosshair touch-none select-none"
        />

        {/* Danger Warning Alert Badge - Positioned cleanly right at deadline */}
        {isDanger && gameState === 'PLAYING' && (
          <div className="absolute top-[88px] left-1/2 -translate-x-1/2 bg-rose-600/95 border border-rose-400 text-white font-black px-3.5 py-1 rounded-full text-xs shadow-lg animate-pulse flex items-center gap-1.5 pointer-events-none whitespace-nowrap z-20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
            <span>과일 넘침 경고! {dangerTime.toFixed(1)}초</span>
          </div>
        )}

        {/* Start Game Overlay */}
        {gameState === 'IDLE' && (
          <div className="absolute inset-0 bg-[#0a0d18]/95 flex flex-col items-center justify-center p-6 text-center z-20 animate-in fade-in">
            <div className="text-6xl mb-3 filter drop-shadow-[0_0_20px_rgba(56,158,13,0.7)] animate-bounce">
              🍉
            </div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-emerald-400 tracking-tight">
              SUIKA WATERMELON
            </h2>
            <p className="text-xs text-slate-300 max-w-[260px] mt-2 mb-6 font-medium leading-relaxed">
              같은 과일끼리 합쳐서 더 큰 과일로 진화시키세요! 수박을 완성해 보세요!
            </p>
            <button
              onClick={handleStartGame}
              className="w-full max-w-[220px] btn-arcade-primary flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" /> 게임 시작
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'OVER' && (
          <div className="absolute inset-0 bg-[#0a0d18]/95 flex flex-col items-center justify-center p-6 text-center z-20 animate-in fade-in zoom-in-95">
            <div className="text-5xl mb-2">💔</div>
            <h2 className="text-2xl font-black text-rose-400 tracking-tight">GAME OVER</h2>
            <p className="text-xs text-slate-400 mt-1 mb-5">과일이 상단 데드라인을 넘었습니다!</p>

            <div className="w-full max-w-[260px] p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 mb-5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span>이번 점수</span>
                <span className="text-lg font-black text-orange-400 font-mono">{score}점</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 pt-1.5 border-t border-white/5">
                <span>플레이 시간</span>
                <span className="text-sm font-black text-blue-400 font-mono">{formatTime(elapsedTime)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 pt-1.5 border-t border-white/5">
                <span>최고 기록</span>
                <span className="text-sm font-black text-slate-200 font-mono">{highScore}점</span>
              </div>
            </div>

            <div className="w-full max-w-[260px] space-y-2">
              <button
                onClick={handleStartGame}
                className="w-full btn-arcade-primary flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> 다시 시작
              </button>
              <button
                onClick={onMenu}
                className="w-full btn-arcade-secondary flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" /> 메뉴로
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Evolution Ladder Bar */}
      <div className="w-full bg-[#131724]/95 border border-white/10 rounded-2xl p-2.5 mt-2 shadow-md backdrop-blur-md">
        <div className="text-[10px] font-black text-orange-400 tracking-wider text-center uppercase mb-1 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-300" /> 과일 진화 단계
        </div>
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
          {FRUITS.map((f, i) => {
            const isUnlocked = i <= highestFruit;
            const isCurrentMax = i === highestFruit;
            return (
              <React.Fragment key={f.name}>
                <span
                  title={`${f.name} (${f.score}점)`}
                  className={`transition-all duration-300 select-none ${
                    isCurrentMax
                      ? 'scale-125 opacity-100 filter drop-shadow-[0_0_8px_rgba(255,122,0,0.8)]'
                      : isUnlocked
                      ? 'opacity-90 scale-100'
                      : 'opacity-25 grayscale scale-90'
                  } ${i < 5 ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}
                >
                  {f.emoji}
                </span>
                {i < FRUITS.length - 1 && (
                  <span className="text-[10px] text-orange-500/40 font-bold">›</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
