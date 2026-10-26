import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { DashDifficulty, DashFallingFruit, DashParticle, GameResult, GameReward, GameSettings } from '../../types';
import { GAMES } from '../../constants';
import { playSound } from '../../utils/audio';
import { HAPTIC, vibrate } from '../../utils/haptics';
import { celebrate } from '../../utils/fx';
import { Rng, randomSeed, seededRandom } from '../../utils/rng';
import { formatNumber, formatTime } from '../../utils/format';
import { BoardOverlay, GameFrame, Hud, HudStat, ScreenOverlay } from '../game/GameFrame';
import { StartCard } from '../game/StartCard';
import { Segmented } from '../ui/Segmented';
import { ResultCard } from '../game/ResultCard';
import { runnerStyle } from '../../utils/shop';
import { drawEmoji, preloadEmoji } from '../../utils/emoji';
import { skinPiece } from '../../utils/skins';

const CW = 440;
const CH = 600;
const PLAYER_Y = 530;
const PLAYER_R = 20;
const GROUND_Y = PLAYER_Y + PLAYER_R + 8;
// Fruit hit the player only when they really overlap (emoji are smaller than their halo)
const HIT_SCALE = 0.72;
// About a second without fruit at the start of a round
const START_GRACE = -60;

const FRUIT_TYPES = [
  { emoji: '🍓', color: '#ff4d4f', r: 16, hazard: true, points: 5 },
  { emoji: '🍌', color: '#faad14', r: 18, hazard: true, points: 7 },
  { emoji: '🍇', color: '#9254de', r: 20, hazard: true, points: 10 },
  { emoji: '🍎', color: '#f5222d', r: 22, hazard: true, points: 12 },
  { emoji: '🍍', color: '#ffc53d', r: 24, hazard: true, points: 15 },
  { emoji: '🍉', color: '#52c41a', r: 28, hazard: true, points: 20 },
  { emoji: '⭐', color: '#fadb14', r: 15, hazard: false, isBonus: true, bonusPoints: 50 },
];

type PowerKind = 'shield' | 'magnet' | 'slow' | 'double';

// Items that fall now and then: frames are 60 per second
const POWERS: Record<PowerKind, { emoji: string; color: string; label: string; frames: number }> = {
  shield: { emoji: '🛡️', color: '#2ea9ff', label: '방패', frames: 900 },
  magnet: { emoji: '🧲', color: '#ff4778', label: '자석', frames: 420 },
  slow: { emoji: '🐢', color: '#2ec27e', label: '느림', frames: 360 },
  double: { emoji: '✨', color: '#ffb627', label: '점수 2배', frames: 480 },
};
const POWER_KINDS = Object.keys(POWERS) as PowerKind[];

preloadEmoji([...FRUIT_TYPES.map((f) => f.emoji), ...Object.values(POWERS).map((p) => p.emoji)]);
/** The falling fruit in order, for the shop's fruit skins (stars and items keep their look) */
const DASH_FRUITS = FRUIT_TYPES.filter((t) => t.hazard).map((t) => t.emoji);
/** Frames between power-ups (about 13 to 20 seconds) */
const POWER_GAP = [780, 1200];

const PALETTE = {
  light: {
    skyTop: '#bfe8ff',
    skyBottom: '#fff5e6',
    speck: 'rgba(43, 33, 64, 0.1)',
    ground: '#7fd99f',
    outline: '#2b2140',
    lane: 'rgba(43, 33, 64, 0.18)',
    shadow: 'rgba(43, 33, 64, 0.2)',
  },
  dark: {
    skyTop: '#140f30',
    skyBottom: '#2b2147',
    speck: 'rgba(255, 244, 228, 0.55)',
    ground: '#1f7a55',
    outline: '#07050c',
    lane: 'rgba(255, 244, 228, 0.18)',
    shadow: 'rgba(0, 0, 0, 0.35)',
  },
};

// Slowly drifting background dots (stars at night)
const SPECKS = Array.from({ length: 36 }, (_, i) => ({
  x: (i * 97.13) % CW,
  y: (i * 53.71) % GROUND_Y,
  r: 1 + ((i * 7) % 3) * 0.6,
  speed: 0.15 + ((i * 13) % 5) * 0.06,
}));

// Harder = faster and denser, but every dodge and star is worth more
export const DASH_DIFFICULTY: Record<DashDifficulty, { label: string; sub: string; speed: number; spawn: number; dodge: number; star: number }> = {
  easy: { label: '쉬움', sub: '천천히', speed: 0.8, spawn: 1.3, dodge: 1, star: 30 },
  normal: { label: '보통', sub: '기본', speed: 1, spawn: 1, dodge: 2, star: 50 },
  hard: { label: '어려움', sub: '점수 1.5배', speed: 1.22, spawn: 0.8, dodge: 3, star: 80 },
};


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
  onChangeDifficulty: (d: DashDifficulty) => void;
  onHelp?: () => void;
  /** Same seed → same falling pattern (friend challenges) */
  seed?: string;
  onRoundSeed?: (seed: string) => void;
  /** A challenge fixes the difficulty */
  lockedDifficulty?: DashDifficulty;
}

export const FruitDashGame: React.FC<Props> = ({
  settings,
  dark,
  best,
  autoStart = false,
  isPaused,
  onUnlockAchieve,
  onGameComplete,
  onRoundChange,
  onExit,
  onChangeDifficulty,
  onHelp,
  seed,
  onRoundSeed,
  lockedDifficulty,
}) => {
  const rngRef = useRef<Rng>(Math.random);
  const difficulty = lockedDifficulty ?? settings.dashDifficulty;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'OVER'>('IDLE');
  const [score, setScore] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [level, setLevel] = useState(1);
  const [bonusStarsCollected, setBonusStarsCollected] = useState(0);
  const [reward, setReward] = useState<GameReward | null>(null);

  // Mutable Game Loop State
  const fruitsRef = useRef<DashFallingFruit[]>([]);
  const particlesRef = useRef<DashParticle[]>([]);
  const playerXRef = useRef<number>(CW / 2);
  const targetXRef = useRef<number>(CW / 2);
  const facingRef = useRef(1);
  const diffRef = useRef<DashDifficulty>(difficulty);
  const levelRef = useRef(1);
  const floatsRef = useRef<{ x: number; y: number; text: string; life: number }[]>([]);
  const crashedRef = useRef(false);
  const keysPressedRef = useRef({ left: false, right: false });
  const isPlayingRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef(performance.now());
  const spawnTimerRef = useRef(0);
  const scoreRef = useRef(0);
  const starsRef = useRef(0);
  const timeRef = useRef(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Power-ups: frames left on each effect, and frames until the next item falls
  const effectsRef = useRef<Record<PowerKind, number>>({ shield: 0, magnet: 0, slow: 0, double: 0 });
  const powerTimerRef = useRef(0);
  const powersTakenRef = useRef(0);
  const [powersTaken, setPowersTaken] = useState(0);
  const dodgedRef = useRef(0);
  const [dodged, setDodged] = useState(0);

  // Dev server only (compiled out of real builds): lets browser tests hand out power-ups
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__dashTest = {
      give: (k: PowerKind) => (effectsRef.current[k] = POWERS[k].frames),
      drop: () => (powerTimerRef.current = 0),
      effects: () => ({ ...effectsRef.current }),
      powers: () => powersTakenRef.current,
      items: () => fruitsRef.current.filter((x) => x.power).map((x) => ({ x: x.x / CW, y: x.y / CH, power: x.power })),
    };
  }, []);

  // Latest callbacks/values for code running inside the animation loop
  const live = useRef({ onUnlockAchieve, onGameComplete, settings });
  live.current = { onUnlockAchieve, onGameComplete, settings };

  useEffect(() => {
    onRoundChange(gameState === 'PLAYING');
  }, [gameState, onRoundChange]);

  useEffect(
    () => () => {
      isPlayingRef.current = false;
    },
    []
  );

  // Track elapsed play time and level scaling
  useEffect(() => {
    if (gameState === 'PLAYING' && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        const next = timeRef.current + 1;
        timeRef.current = next;
        setElapsedTime(next);
        const nextLevel = Math.min(10, 1 + Math.floor(next / 10));
        if (nextLevel > levelRef.current) playSound('levelup', live.current.settings);
        levelRef.current = nextLevel;
        setLevel(levelRef.current);
        if (next >= 30) live.current.onUnlockAchieve('dash_survivor_30');
        if (next >= 30 && diffRef.current === 'hard') live.current.onUnlockAchieve('dash_hard_30');
        if (next >= 60) live.current.onUnlockAchieve('dash_survivor_60');
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameState, isPaused]);

  const handleStartGame = () => {
    diffRef.current = difficulty;
    const roundSeed = seed ?? randomSeed();
    rngRef.current = seededRandom(roundSeed);
    onRoundSeed?.(roundSeed);
    fruitsRef.current = [];
    particlesRef.current = [];
    playerXRef.current = CW / 2;
    targetXRef.current = CW / 2;
    keysPressedRef.current = { left: false, right: false };
    spawnTimerRef.current = START_GRACE;
    floatsRef.current = [];
    levelRef.current = 1;
    scoreRef.current = 0;
    starsRef.current = 0;
    timeRef.current = 0;
    crashedRef.current = false;
    effectsRef.current = { shield: 0, magnet: 0, slow: 0, double: 0 };
    powerTimerRef.current = POWER_GAP[0];
    powersTakenRef.current = 0;
    setPowersTaken(0);
    dodgedRef.current = 0;
    setDodged(0);

    setScore(0);
    setElapsedTime(0);
    setLevel(1);
    setBonusStarsCollected(0);
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

  const handleGameOver = useCallback((finalScore: number, finalTime: number) => {
    const { settings: s, onUnlockAchieve: unlock, onGameComplete: complete } = live.current;
    isPlayingRef.current = false;
    crashedRef.current = true;
    setGameState('OVER');
    playSound('over', s);
    vibrate(HAPTIC.crash, s);

    setDodged(dodgedRef.current);
    if (finalScore >= 500) unlock('dash_dodge_master');
    if (starsRef.current >= 5) unlock('dash_star_collector');

    const r = complete({ game: 'dash', score: finalScore, seconds: finalTime });
    setReward(r);
    if (r.newBest && s.celebrateEffect) celebrate();
  }, []);

  // Keyboard: ← → / A D to move (by physical key, so a Korean layout works too)
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const startRef = useRef(handleStartGame);
  startRef.current = handleStartGame;

  useEffect(() => {
    const isLeft = (e: KeyboardEvent) => e.code === 'ArrowLeft' || e.code === 'KeyA';
    const isRight = (e: KeyboardEvent) => e.code === 'ArrowRight' || e.code === 'KeyD';

    const onDown = (e: KeyboardEvent) => {
      if (isPausedRef.current || e.ctrlKey || e.metaKey || e.altKey) return;
      const state = gameStateRef.current;
      if (isLeft(e) || isRight(e)) {
        keysPressedRef.current[isLeft(e) ? 'left' : 'right'] = true;
        if (state === 'PLAYING') e.preventDefault();
        return;
      }
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (state === 'PLAYING') {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur?.();
      } else if (state === 'IDLE' && !(e.target as HTMLElement | null)?.closest?.('button')) {
        e.preventDefault();
        startRef.current();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (isLeft(e)) keysPressedRef.current.left = false;
      if (isRight(e)) keysPressedRef.current.right = false;
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Main Game Loop (Canvas + Update)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixelRatio = Math.min(3, Math.max(1, window.devicePixelRatio || 1) * 1.25);
    canvas.width = Math.round(CW * pixelRatio);
    canvas.height = Math.round(CH * pixelRatio);

    const loop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 16.666, 2.0);
      lastTimeRef.current = time;

      if (isPlayingRef.current && !isPaused) {
        // 1. Keyboard or Pointer movement
        const keys = keysPressedRef.current;
        const keySpeed = 10 * dt;
        if (keys.left) {
          targetXRef.current = Math.max(PLAYER_R + 10, targetXRef.current - keySpeed);
        }
        if (keys.right) {
          targetXRef.current = Math.min(CW - PLAYER_R - 10, targetXRef.current + keySpeed);
        }

        // Smooth player movement towards target pointer
        const px = playerXRef.current;
        const tx = targetXRef.current;
        playerXRef.current += (tx - px) * Math.min(1, 0.32 * dt);
        playerXRef.current = Math.max(PLAYER_R + 10, Math.min(CW - PLAYER_R - 10, playerXRef.current));

        // 2. Spawn falling fruits with progressive difficulty
        spawnTimerRef.current += dt;
        const lvl = levelRef.current;
        const diff = DASH_DIFFICULTY[diffRef.current];
        const spawnInterval = Math.max(14, 40 - lvl * 2.6) * diff.spawn; // Spawns faster as level increases

        if (spawnTimerRef.current >= spawnInterval) {
          spawnTimerRef.current = 0;

          // 12% chance for bonus golden star
          const rand = rngRef.current;
          const isStar = rand() < 0.12;
          const chosenDef = isStar
            ? FRUIT_TYPES[FRUIT_TYPES.length - 1]
            : FRUIT_TYPES[Math.floor(rand() * (FRUIT_TYPES.length - 1))];

          const speedBase = (2.6 + lvl * 0.38) * diff.speed;
          const spawnX = rand() * (CW - chosenDef.r * 2 - 20) + chosenDef.r + 10;

          fruitsRef.current.push({
            id: Math.random().toString(36).slice(2),
            x: spawnX,
            y: -chosenDef.r,
            vx: (rand() - 0.5) * (lvl > 3 ? 1.4 : 0.4),
            vy: speedBase + rand() * 1.5,
            r: chosenDef.r,
            emoji: chosenDef.emoji,
            color: chosenDef.color,
            isHazard: chosenDef.hazard,
            isBonus: chosenDef.isBonus,
            bonusPoints: chosenDef.bonusPoints,
            rot: 0,
            rotSpeed: (rand() - 0.5) * 0.08,
          });
        }

        // Power-up items on their own timer
        powerTimerRef.current -= dt;
        if (powerTimerRef.current <= 0) {
          const rand = rngRef.current;
          powerTimerRef.current = POWER_GAP[0] + rand() * (POWER_GAP[1] - POWER_GAP[0]);
          const kind = POWER_KINDS[Math.floor(rand() * POWER_KINDS.length)];
          const r = 17;
          fruitsRef.current.push({
            id: Math.random().toString(36).slice(2),
            x: rand() * (CW - r * 2 - 20) + r + 10,
            y: -r,
            vx: 0,
            vy: (2.4 + lvl * 0.2) * diff.speed,
            r,
            emoji: POWERS[kind].emoji,
            color: POWERS[kind].color,
            isHazard: false,
            power: kind,
            rot: 0,
            rotSpeed: 0,
          });
        }

        // Effects wear off
        const fx = effectsRef.current;
        for (const k of POWER_KINDS) if (fx[k] > 0) fx[k] = Math.max(0, fx[k] - dt);
        const pace = fx.slow > 0 ? 0.5 : 1;
        const gain = fx.double > 0 ? 2 : 1;

        // 3. Update fruits position & collisions
        const currentPx = playerXRef.current;
        const currentPy = PLAYER_Y;
        const pR = PLAYER_R;

        for (let i = fruitsRef.current.length - 1; i >= 0; i--) {
          const f = fruitsRef.current[i];
          f.x += f.vx * dt * pace;
          f.y += f.vy * dt * pace;
          f.rot += f.rotSpeed * dt;

          // Magnet pulls stars (and items) toward the player
          if (fx.magnet > 0 && (f.isBonus || f.power)) {
            const mx = currentPx - f.x;
            const my = currentPy - f.y;
            if (mx * mx + my * my < 220 * 220) {
              f.x += mx * 0.09 * dt;
              f.y += my * 0.09 * dt;
            }
          }

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
          const minDist = f.isBonus || f.power ? f.r + pR : f.r * HIT_SCALE + pR * 0.85;

          // Collision detected!
          if (distSq < minDist * minDist) {
            if (f.power) {
              const def = POWERS[f.power];
              fx[f.power] = def.frames;
              powersTakenRef.current += 1;
              setPowersTaken(powersTakenRef.current);
              playSound('combo', settings);
              vibrate(HAPTIC.match, settings);
              floatsRef.current.push({ x: f.x, y: f.y - 10, text: def.label, life: 0 });
              for (let p = 0; p < 10; p++) {
                const angle = Math.random() * Math.PI * 2;
                particlesRef.current.push({
                  x: f.x,
                  y: f.y,
                  vx: Math.cos(angle) * (2 + Math.random() * 3),
                  vy: Math.sin(angle) * (2 + Math.random() * 3),
                  r: 3 + Math.random() * 2,
                  color: def.color,
                  alpha: 1,
                  life: 0,
                  maxLife: 22,
                });
              }
              fruitsRef.current.splice(i, 1);
              continue;
            }
            if (f.isHazard && fx.shield > 0) {
              // The shield takes the hit
              fx.shield = 0;
              live.current.onUnlockAchieve('dash_shield_save');
              playSound('merge', settings, { level: 6 });
              vibrate(HAPTIC.crash, settings);
              floatsRef.current.push({ x: f.x, y: f.y - 10, text: '막았다!', life: 0 });
              for (let p = 0; p < 14; p++) {
                const angle = Math.random() * Math.PI * 2;
                particlesRef.current.push({
                  x: f.x,
                  y: f.y,
                  vx: Math.cos(angle) * (2.5 + Math.random() * 3),
                  vy: Math.sin(angle) * (2.5 + Math.random() * 3),
                  r: 3 + Math.random() * 2.5,
                  color: POWERS.shield.color,
                  alpha: 1,
                  life: 0,
                  maxLife: 24,
                });
              }
              fruitsRef.current.splice(i, 1);
              continue;
            }
            if (f.isBonus) {
              // Collect bonus star
              const bonus = diff.star * gain;
              scoreRef.current += bonus;
              starsRef.current += 1;
              setScore(scoreRef.current);
              setBonusStarsCollected(starsRef.current);
              playSound('star', settings);
              vibrate(HAPTIC.match, settings);
              floatsRef.current.push({ x: f.x, y: f.y - 10, text: `+${bonus}`, life: 0 });

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
              break; // keep the loop (and rendering) alive for the next round
            }
          }

          // Landed on the grass: dodged (+2) with a little splash
          if (f.y + f.r * 0.45 >= GROUND_Y) {
            if (f.isHazard) {
              scoreRef.current += diff.dodge * gain;
              dodgedRef.current += 1;
              setScore(scoreRef.current);
            }
            for (let p = 0; p < 6; p++) {
              const a = Math.PI + Math.random() * Math.PI;
              particlesRef.current.push({
                x: f.x,
                y: GROUND_Y - 3,
                vx: Math.cos(a) * (0.8 + Math.random() * 2),
                vy: Math.sin(a) * (1.5 + Math.random() * 2.2),
                r: 2 + Math.random() * 2.2,
                color: f.color,
                alpha: 1,
                life: 0,
                maxLife: 18 + Math.random() * 8,
              });
            }
            fruitsRef.current.splice(i, 1);
          }
        }

        // 4. Update particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 0.18 * dt;
          p.life += dt;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);
          if (p.life >= p.maxLife) {
            particlesRef.current.splice(i, 1);
          }
        }
      }

      if (!isPaused) {
        for (let i = floatsRef.current.length - 1; i >= 0; i--) {
          const t = floatsRef.current[i];
          t.y -= 1.1 * dt;
          t.life += dt;
          if (t.life > 45) floatsRef.current.splice(i, 1);
        }
      }

      // --- RENDERING CANVAS ---
      const P = dark ? PALETTE.dark : PALETTE.light;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.clearRect(0, 0, CW, CH);

      // 1. Sky
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      sky.addColorStop(0, P.skyTop);
      sky.addColorStop(1, P.skyBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CW, CH);

      // Drifting specks
      ctx.fillStyle = P.speck;
      for (const s of SPECKS) {
        const y = (s.y + time * 0.02 * s.speed) % GROUND_Y;
        ctx.beginPath();
        ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Player lane
      ctx.save();
      ctx.strokeStyle = P.lane;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(12, PLAYER_Y);
      ctx.lineTo(CW - 12, PLAYER_Y);
      ctx.stroke();
      ctx.restore();

      // 3. Ground with a scalloped grass edge
      ctx.fillStyle = P.ground;
      ctx.strokeStyle = P.outline;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-4, CH + 4);
      ctx.lineTo(-4, GROUND_Y);
      for (let x = 0; x <= CW; x += 22) {
        ctx.quadraticCurveTo(x + 11, GROUND_Y - 7, x + 22, GROUND_Y);
      }
      ctx.lineTo(CW + 4, CH + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 4. Falling fruits
      for (let i = 0; i < fruitsRef.current.length; i++) {
        const f = fruitsRef.current[i];
        ctx.save();
        ctx.translate(f.x, f.y);

        if (f.power) {
          const pulse = 1 + Math.sin(time * 0.015) * 0.15;
          ctx.fillStyle = `${f.color}55`;
          ctx.beginPath();
          ctx.arc(0, 0, (f.r + 9) * pulse, 0, Math.PI * 2);
          ctx.fill();
        }
        if (f.isBonus) {
          const pulse = 1 + Math.sin(time * 0.012) * 0.12;
          ctx.fillStyle = 'rgba(255, 210, 63, 0.35)';
          ctx.beginPath();
          ctx.arc(0, 0, (f.r + 8) * pulse, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `${f.color}40`;
        ctx.strokeStyle = P.outline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, f.r + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.rotate(f.rot);
        drawEmoji(ctx, skinPiece(live.current.settings.suikaSkin, DASH_FRUITS, f.emoji), 0, 1, f.r * 1.4);
        ctx.restore();
      }

      // 5. Particles
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

      // 6. Player: a little running fruit (an orange unless a runner from the shop is on) that looks where it is going
      const look = runnerStyle(settings.runner, time);
      const px = playerXRef.current;
      const step = targetXRef.current - px;
      const moving = isPlayingRef.current && Math.abs(step) > 1.5;
      if (moving) facingRef.current = step > 0 ? 1 : -1;
      const fx = facingRef.current * 3;
      const stride = moving ? Math.sin(time * 0.03) * 3 : 0;
      const INK = look.face;

      ctx.save();
      ctx.translate(px, PLAYER_Y);

      // Shadow on the grass
      ctx.fillStyle = P.shadow;
      ctx.beginPath();
      ctx.ellipse(0, GROUND_Y - PLAYER_Y + 2, PLAYER_R * 0.9, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = P.outline;
      ctx.lineWidth = 2.5;

      // Feet, lifting in turn while running
      ctx.fillStyle = look.feet;
      for (const side of [-1, 1]) {
        const lift = Math.max(0, side < 0 ? stride : -stride);
        ctx.beginPath();
        ctx.ellipse(side * 8, PLAYER_R - 1 - lift, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Body
      ctx.fillStyle = look.body;
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-7, -9, 6, 3.5, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_R - 1.5, 0, Math.PI * 2);
      ctx.stroke();

      // Leaf
      ctx.lineWidth = 2;
      ctx.fillStyle = look.leaf;
      ctx.beginPath();
      ctx.ellipse(4, -PLAYER_R - 1, 7, 3.5, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cheeks
      ctx.fillStyle = 'rgba(255, 71, 120, 0.45)';
      for (const ex of [-10, 10]) {
        ctx.beginPath();
        ctx.ellipse(fx + ex, 4, 3.2, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = INK;
      ctx.fillStyle = INK;
      ctx.lineCap = 'round';
      if (crashedRef.current) {
        // Dizzy face
        ctx.lineWidth = 2;
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
        ctx.fillStyle = INK === '#ffffff' ? look.body : '#fff';
        for (const ex of [-5.5, 5.5]) {
          ctx.beginPath();
          ctx.arc(fx + ex + 0.8, -4.3, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(fx, 3, 4, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      }
      ctx.restore();

      // Shield bubble and magnet ring around the player
      const fxNow = effectsRef.current;
      if (fxNow.shield > 0) {
        ctx.save();
        ctx.globalAlpha = fxNow.shield < 120 ? 0.35 + 0.35 * Math.abs(Math.sin(time * 0.02)) : 0.55;
        ctx.fillStyle = 'rgba(46, 169, 255, 0.25)';
        ctx.strokeStyle = '#2ea9ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, PLAYER_Y, PLAYER_R + 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      if (fxNow.magnet > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 71, 120, 0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 7]);
        ctx.lineDashOffset = -time * 0.03;
        ctx.beginPath();
        ctx.arc(px, PLAYER_Y, 60 + Math.sin(time * 0.01) * 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Active effects, top right: icon with a draining bar
      let badgeX = CW - 14;
      for (const k of POWER_KINDS) {
        const left = fxNow[k];
        if (left <= 0) continue;
        const def = POWERS[k];
        badgeX -= 40;
        ctx.save();
        ctx.fillStyle = dark ? 'rgba(20, 15, 48, 0.75)' : 'rgba(255, 255, 255, 0.85)';
        ctx.strokeStyle = P.outline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(badgeX, 12, 36, 36, 10);
        else ctx.rect(badgeX, 12, 36, 36);
        ctx.fill();
        ctx.stroke();
        drawEmoji(ctx, def.emoji, badgeX + 18, 28, 22);
        ctx.fillStyle = def.color;
        ctx.fillRect(badgeX + 4, 41, 28 * Math.min(1, left / def.frames), 4);
        ctx.restore();
      }

      // 7. "+50" popups
      for (const t of floatsRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t.life / 45);
        ctx.font = '700 22px Fredoka, Jua, sans-serif';
        ctx.textAlign = 'center';
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
  }, [isPaused, handleGameOver, settings, dark]);

  // Pointer move handler
  const handlePointerMove = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    targetXRef.current = (clientX - rect.left) * (CW / rect.width);
  };

  const diffInfo = DASH_DIFFICULTY[gameState === 'IDLE' ? difficulty : diffRef.current];

  return (
    <>
      <GameFrame
        hud={
          <Hud>
            <HudStat label="점수" value={formatNumber(score)} />
            <HudStat label="최고" value={formatNumber(Math.max(best, score))} tone={best > 0 && score > best ? 'hot' : 'default'} />
            <HudStat label="생존" value={formatTime(elapsedTime)} />
            <HudStat label="황금 별" value={`⭐${bonusStarsCollected}`} />
          </Hud>
        }
        board={
          <div className="board-fit w-full" style={{ maxWidth: 'calc((100dvh - var(--board-offset)) * 0.7333)' }}>
            <div className="relative aspect-[440/600] w-full overflow-hidden rounded-[28px] border-2 border-line bg-surface-2 shadow-pop">
              <canvas
                ref={canvasRef}
                aria-label="FRUIT DASH 판"
                onPointerDown={(e) => handlePointerMove(e.clientX)}
                onPointerMove={(e) => handlePointerMove(e.clientX)}
                className="block h-full w-full cursor-ew-resize touch-none select-none"
              />
              {gameState === 'PLAYING' && (
                <span key={level} className="chip pointer-events-none absolute left-3 top-3 z-10 bg-surface font-display text-sm animate-pop-in">
                  LV.{level} · {diffInfo.label}
                </span>
              )}
              {gameState === 'IDLE' && (
                <BoardOverlay>
                  <StartCard meta={GAMES.dash} best={best} onStart={handleStartGame} onHelp={onHelp}>
                    <Segmented<DashDifficulty>
                      ariaLabel="난이도"
                      columns={3}
                      value={difficulty}
                      onChange={(d) => !lockedDifficulty && onChangeDifficulty(d)}
                      options={(Object.keys(DASH_DIFFICULTY) as DashDifficulty[]).map((d) => ({
                        value: d,
                        label: DASH_DIFFICULTY[d].label,
                        sub: DASH_DIFFICULTY[d].sub,
                      }))}
                    />
                  </StartCard>
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
                  🍎
                </span>
                <span>
                  과일에 닿으면 끝! 피할 때마다 <b>+{diffInfo.dodge}점</b>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-mango-soft text-base shadow-none" aria-hidden="true">
                  ⭐
                </span>
                <span>
                  황금 별을 먹으면 <b>+{diffInfo.star}점</b>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-grape-soft text-base shadow-none" aria-hidden="true">
                  🛡️
                </span>
                <span>
                  아이템: <b>방패</b> 한 번 막기 · <b>자석</b> 별 끌어오기 · <b>느림</b> · <b>점수 2배</b>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-soda-soft text-base shadow-none" aria-hidden="true">
                  ⏫
                </span>
                <span>10초마다 레벨이 올라 더 빨라져요</span>
              </li>
            </ul>
            <div className="flex items-center justify-between gap-2">
              <p className="hidden text-xs text-ink-3 sm:block short:hidden">← → / A D · 마우스 · 터치</p>
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
            game="dash"
            emoji="💥"
            title="CRASH!"
            subtitle={`과일에 부딪혔어요 · ${diffInfo.label}`}
            tone="berry"
            score={score}
            stats={[
              { label: '생존 시간', value: formatTime(elapsedTime) },
              { label: '도달 레벨', value: `Lv.${level}` },
              { label: '피한 과일', value: `${dodged}개` },
              { label: '황금 별 · 아이템', value: `${bonusStarsCollected}개 · ${powersTaken}개` },
            ]}
            reward={reward}
            shareText={`🏃 FRUIT DASH(${diffInfo.label}) ${formatNumber(score)}점! ${elapsedTime}초 동안 살아남았어요`}
            onRetry={handleStartGame}
            onExit={onExit}
          />
        </ScreenOverlay>
      )}
    </>
  );
};
