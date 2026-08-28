import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Home, Zap, Trophy, Heart, Play, ShieldAlert, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameSettings, DashFallingFruit, DashParticle } from '../../types';
import { playSound } from '../../utils/audio';
import { GameTimer, formatTime } from '../Common/GameTimer';

const CW = 440;
const CH = 600;
const PLAYER_Y = 530;
const PLAYER_R = 20;

const FRUIT_TYPES = [
  { emoji: '🍓', color: '#ff4d4f', r: 16, hazard: true, points: 5 },
  { emoji: '🍌', color: '#faad14', r: 18, hazard: true, points: 7 },
  { emoji: '🍇', color: '#9254de', r: 20, hazard: true, points: 10 },
  { emoji: '🍎', color: '#f5222d', r: 22, hazard: true, points: 12 },
  { emoji: '🍍', color: '#ffc53d', r: 24, hazard: true, points: 15 },
  { emoji: '🍉', color: '#52c41a', r: 28, hazard: true, points: 20 },
  { emoji: '⭐', color: '#fadb14', r: 15, hazard: false, isBonus: true, bonusPoints: 50 },
];

interface Props {
  settings: GameSettings;
  onMenu: () => void;
  isPaused: boolean;
  onGameOver?: (score: number, duration: number) => void;
  handleGameComplete?: (gameType: 'dash', finalScore: number, playTimeSeconds: number) => void;
  onUnlockAchieve: (id: string) => void;
}

export const FruitDashGame: React.FC<Props> = ({
  settings,
  onMenu,
  isPaused,
  onGameOver,
  handleGameComplete,
  onUnlockAchieve,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'OVER'>('IDLE');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem('dash_hs') || '0');
    } catch {
      return 0;
    }
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [level, setLevel] = useState(1);
  const [bonusStarsCollected, setBonusStarsCollected] = useState(0);

  // Mutable Game Loop State
  const fruitsRef = useRef<DashFallingFruit[]>([]);
  const particlesRef = useRef<DashParticle[]>([]);
  const playerXRef = useRef<number>(CW / 2);
  const targetXRef = useRef<number>(CW / 2);
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});
  const isPlayingRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef(performance.now());
  const spawnTimerRef = useRef(0);
  const scoreRef = useRef(0);
  const starsRef = useRef(0);
  const timeRef = useRef(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(e.key)) {
        keysPressedRef.current[e.key.toLowerCase()] = true;
      }
      if (e.code === 'Space' && gameState !== 'PLAYING') {
        e.preventDefault();
        handleStartGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(e.key)) {
        keysPressedRef.current[e.key.toLowerCase()] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Track elapsed play time and level scaling
  useEffect(() => {
    if (gameState === 'PLAYING' && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime((t) => {
          const next = t + 1;
          timeRef.current = next;

          // Achievement checks
          if (next >= 30) onUnlockAchieve('dash_survivor_30');
          if (next >= 60) onUnlockAchieve('dash_survivor_60');

          const newLvl = Math.min(10, 1 + Math.floor(next / 10));
          setLevel(newLvl);
          return next;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameState, isPaused, onUnlockAchieve]);

  const handleStartGame = () => {
    fruitsRef.current = [];
    particlesRef.current = [];
    playerXRef.current = CW / 2;
    targetXRef.current = CW / 2;
    keysPressedRef.current = {};
    spawnTimerRef.current = 0;
    scoreRef.current = 0;
    starsRef.current = 0;
    timeRef.current = 0;

    setScore(0);
    setElapsedTime(0);
    setLevel(1);
    setBonusStarsCollected(0);
    setGameState('PLAYING');
    isPlayingRef.current = true;
    lastTimeRef.current = performance.now();

    playSound('click', settings);
  };

  const handleGameOver = useCallback((finalScore: number, finalTime: number) => {
    isPlayingRef.current = false;
    setGameState('OVER');
    playSound('over', settings);

    if (finalScore > highScore) {
      setHighScore(finalScore);
      try {
        localStorage.setItem('dash_hs', finalScore.toString());
      } catch {
        // ignore
      }
      if (settings.celebrateEffect) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    }

    if (finalScore >= 500) {
      onUnlockAchieve('dash_dodge_master');
    }
    if (starsRef.current >= 5) {
      onUnlockAchieve('dash_star_collector');
    }

    // Call stats update handlers
    if (handleGameComplete) {
      handleGameComplete('dash', finalScore, finalTime);
    }
    if (onGameOver) {
      onGameOver(finalScore, finalTime);
    }
  }, [highScore, settings, onUnlockAchieve, onGameOver, handleGameComplete]);

  // Main Game Loop (Canvas + Update)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 16.666, 2.0);
      lastTimeRef.current = time;

      if (isPlayingRef.current && !isPaused) {
        // 1. Keyboard or Pointer movement
        const keys = keysPressedRef.current;
        const keySpeed = 10 * dt;
        if (keys['arrowleft'] || keys['a']) {
          targetXRef.current = Math.max(PLAYER_R + 10, targetXRef.current - keySpeed);
        }
        if (keys['arrowright'] || keys['d']) {
          targetXRef.current = Math.min(CW - PLAYER_R - 10, targetXRef.current + keySpeed);
        }

        // Smooth player movement towards target pointer
        const px = playerXRef.current;
        const tx = targetXRef.current;
        playerXRef.current += (tx - px) * Math.min(1, 0.32 * dt);
        playerXRef.current = Math.max(PLAYER_R + 10, Math.min(CW - PLAYER_R - 10, playerXRef.current));

        // 2. Spawn falling fruits with progressive difficulty
        spawnTimerRef.current += dt;
        const spawnInterval = Math.max(12, 42 - level * 3); // Spawns faster as level increases

        if (spawnTimerRef.current >= spawnInterval) {
          spawnTimerRef.current = 0;

          // 12% chance for bonus golden star
          const isStar = Math.random() < 0.12;
          const chosenDef = isStar
            ? FRUIT_TYPES[FRUIT_TYPES.length - 1]
            : FRUIT_TYPES[Math.floor(Math.random() * (FRUIT_TYPES.length - 1))];

          const speedBase = 2.8 + level * 0.45;
          const spawnX = Math.random() * (CW - chosenDef.r * 2 - 20) + chosenDef.r + 10;

          fruitsRef.current.push({
            id: Math.random().toString(36).slice(2),
            x: spawnX,
            y: -chosenDef.r,
            vx: (Math.random() - 0.5) * (level > 3 ? 1.4 : 0.4),
            vy: speedBase + Math.random() * 1.5,
            r: chosenDef.r,
            emoji: chosenDef.emoji,
            color: chosenDef.color,
            isHazard: chosenDef.hazard,
            isBonus: chosenDef.isBonus,
            bonusPoints: chosenDef.bonusPoints,
            rot: 0,
            rotSpeed: (Math.random() - 0.5) * 0.08,
          });
        }

        // 3. Update fruits position & collisions
        const currentPx = playerXRef.current;
        const currentPy = PLAYER_Y;
        const pR = PLAYER_R;

        for (let i = fruitsRef.current.length - 1; i >= 0; i--) {
          const f = fruitsRef.current[i];
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          f.rot += f.rotSpeed * dt;

          // Bounce off side walls
          if (f.x - f.r < 10) {
            f.x = 10 + f.r;
            f.vx = Math.abs(f.vx);
          } else if (f.x + f.r > CW - 10) {
            f.x = CW - 10 - f.r;
            f.vx = -Math.abs(f.vx);
          }

          // Check distance to player
          const dx = f.x - currentPx;
          const dy = f.y - currentPy;
          const distSq = dx * dx + dy * dy;
          const minDist = f.r + pR;

          // Collision detected!
          if (distSq < minDist * minDist) {
            if (f.isBonus) {
              // Collect bonus star
              const bonus = f.bonusPoints || 50;
              scoreRef.current += bonus;
              starsRef.current += 1;
              setScore(scoreRef.current);
              setBonusStarsCollected(starsRef.current);
              playSound('victory', settings);

              // Burst particles
              for (let p = 0; p < 8; p++) {
                const angle = Math.random() * Math.PI * 2;
                particlesRef.current.push({
                  x: f.x,
                  y: f.y,
                  vx: Math.cos(angle) * (2 + Math.random() * 3),
                  vy: Math.sin(angle) * (2 + Math.random() * 3),
                  r: 3 + Math.random() * 2,
                  color: '#fadb14',
                  alpha: 1,
                  life: 0,
                  maxLife: 20,
                });
              }

              fruitsRef.current.splice(i, 1);
              continue;
            } else if (f.isHazard) {
              // HIT HAZARD -> GAME OVER
              handleGameOver(scoreRef.current, timeRef.current);
              return;
            }
          }

          // Successfully dodged past bottom
          if (f.y > CH + f.r) {
            if (f.isHazard) {
              scoreRef.current += 2;
              setScore(scoreRef.current);
            }
            fruitsRef.current.splice(i, 1);
          }
        }

        // 4. Update particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life += dt;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);
          if (p.life >= p.maxLife) {
            particlesRef.current.splice(i, 1);
          }
        }
      }

      // --- RENDERING CANVAS ---
      ctx.clearRect(0, 0, CW, CH);

      // 1. Background Grid & Glow
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, CW, CH);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 20; x < CW; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CH);
        ctx.stroke();
      }
      for (let y = 20; y < CH; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CW, y);
        ctx.stroke();
      }

      // 2. Danger Zone line near player bottom
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 122, 0, 0.2)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(10, PLAYER_Y);
      ctx.lineTo(CW - 10, PLAYER_Y);
      ctx.stroke();
      ctx.restore();

      // 3. Render Falling Fruits
      for (let i = 0; i < fruitsRef.current.length; i++) {
        const f = fruitsRef.current[i];
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);

        // Glow behind fruit
        ctx.shadowColor = f.color;
        ctx.shadowBlur = f.isBonus ? 12 : 6;
        ctx.fillStyle = `${f.color}25`;
        ctx.beginPath();
        ctx.arc(0, 0, f.r + 2, 0, Math.PI * 2);
        ctx.fill();

        // Emoji Sprite
        ctx.shadowBlur = 0;
        ctx.font = `${f.r * 1.3}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.emoji, 0, 2);

        ctx.restore();
      }

      // 4. Render Particles
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. Render Player Character
      const px = playerXRef.current;
      const py = PLAYER_Y;

      ctx.save();
      ctx.translate(px, py);

      // Player Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 16, PLAYER_R * 0.9, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Neon Basket / Hero Base
      const heroGrad = ctx.createLinearGradient(-PLAYER_R, -PLAYER_R, PLAYER_R, PLAYER_R);
      heroGrad.addColorStop(0, '#ff7a00');
      heroGrad.addColorStop(1, '#ff3e00');

      ctx.shadowColor = '#ff7a00';
      ctx.shadowBlur = 12;
      ctx.fillStyle = heroGrad;
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_R, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Face / Logo inside player
      ctx.shadowBlur = 0;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏃', 0, 0);

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPaused, level, handleGameOver, settings]);

  // Pointer move handler
  const handlePointerMove = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = CW / rect.width;
    const canvasX = (clientX - rect.left) * scale;
    targetXRef.current = canvasX;
  };

  return (
    <div id="fruit-dash-board" className="flex-1 flex flex-col items-center justify-center p-[var(--ui-space-lg)] w-full max-w-[500px] mx-auto animate-in fade-in duration-300 select-none">
      {/* Top HUD */}
      <div
        id="dash-hud"
        className="arcade-hud-box mb-2.5"
      >
        {/* Score & Best */}
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

        {/* Level & Stars & Timer */}
        <div className="flex items-center gap-2">
          {gameState === 'PLAYING' && (
            <>
              <GameTimer seconds={elapsedTime} id="dash-timer" />
              <div className="px-2.5 py-1 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-300 font-bold text-xs">
                LV.{level}
              </div>
              {bonusStarsCollected > 0 && (
                <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs">
                  <Sparkles className="w-3 h-3" /> {bonusStarsCollected}
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls */}
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

      {/* Canvas Screen */}
      <div className="relative rounded-[22px] overflow-hidden border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.6)] bg-[#0b0f19] w-full aspect-[440/600] max-h-[calc(100vh-185px)]">
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          onMouseMove={(e) => handlePointerMove(e.clientX)}
          onTouchMove={(e) => {
            e.preventDefault();
            handlePointerMove(e.touches[0].clientX);
          }}
          className="w-full h-full block cursor-ew-resize touch-none select-none"
        />

        {/* Start Overlay */}
        {gameState === 'IDLE' && (
          <div className="absolute inset-0 bg-[#0a0d18]/95 flex flex-col items-center justify-center p-6 text-center z-20 animate-in fade-in">
            <div className="text-6xl mb-3 filter drop-shadow-[0_0_20px_rgba(255,122,0,0.7)] animate-bounce">
              🏃💨
            </div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-rose-400 tracking-tight">
              FRUIT DASH
            </h2>
            <p className="text-xs text-slate-300 max-w-[280px] mt-2 mb-6 font-medium leading-relaxed">
              위에서 쏟아지는 과일들을 피하며 생존하세요! 황금 별(⭐)을 먹으면 대량의 보너스 점수를 얻습니다!
            </p>
            <button
              onClick={handleStartGame}
              className="w-full max-w-[220px] btn-arcade-primary flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" /> 대쉬 시작하기
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'OVER' && (
          <div className="absolute inset-0 bg-[#0a0d18]/95 flex flex-col items-center justify-center p-6 text-center z-20 animate-in fade-in zoom-in-95">
            <div className="text-5xl mb-2">💥</div>
            <h2 className="text-2xl font-black text-rose-400 tracking-tight">CRASHED!</h2>
            <p className="text-xs text-slate-400 mt-1 mb-5">과일에 충돌하여 질주가 종료되었습니다!</p>

            <div className="w-full max-w-[260px] p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 mb-5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span>최종 점수</span>
                <span className="text-lg font-black text-orange-400 font-mono">{score}점</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 pt-1.5 border-t border-white/5">
                <span>생존 시간</span>
                <span className="text-sm font-black text-blue-400 font-mono">{formatTime(elapsedTime)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 pt-1.5 border-t border-white/5">
                <span>별빛 스타 채집</span>
                <span className="text-sm font-black text-amber-300 font-mono">{bonusStarsCollected}개</span>
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
                <RotateCcw className="w-4 h-4" /> 다시 질주하기
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

      {/* Guide Banner */}
      <div className="w-full bg-[#131724]/95 border border-white/10 rounded-2xl p-2.5 mt-2 shadow-md backdrop-blur-md flex items-center justify-between text-xs px-4">
        <span className="text-slate-400 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          마우스/터치로 캐릭터를 좌우로 조작
        </span>
        <span className="text-amber-400 font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> ⭐=+50점
        </span>
      </div>
    </div>
  );
};
