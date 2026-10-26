import React, { useEffect, useRef, useState } from 'react';
import { Check, Eraser, Minus, PaintBucket, Pencil, Plus, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import { GameResult, GameReward, GameSettings } from '../../types';
import { GAMES } from '../../constants';
import { playSound } from '../../utils/audio';
import { HAPTIC, vibrate } from '../../utils/haptics';
import { celebrate } from '../../utils/fx';
import { randomSeed, seededRandom } from '../../utils/rng';
import { formatTime } from '../../utils/format';
import { emojiSrc } from '../../utils/emoji';
import { BoardOverlay, GameFrame, Hud, HudStat, ScreenOverlay } from '../game/GameFrame';
import { StartCard } from '../game/StartCard';
import { ResultCard } from '../game/ResultCard';
import { Segmented } from '../ui/Segmented';
import { Emoji } from '../ui/Emoji';
import { GRID, Pixels, compare } from './similarity';

/** Drawing canvas size in px (the same on every screen, so scores don't depend on the device) */
const SIZE = 480;
const PROMPTS: [string, string][] = [
  ['🍎', '사과'],
  ['🍌', '바나나'],
  ['🍓', '딸기'],
  ['🍉', '수박'],
  ['🍊', '귤'],
  ['🍋', '레몬'],
  ['🍇', '포도'],
  ['🍑', '복숭아'],
  ['🍒', '체리'],
  ['🍍', '파인애플'],
  ['🥝', '키위'],
  ['🥭', '망고'],
  ['🍐', '배'],
  ['🫐', '블루베리'],
  ['🥥', '코코넛'],
  ['🍈', '멜론'],
];
const PLAYER_ICONS = ['🍓', '🍊', '🍋', '🍏', '🫐', '🍇'];
const COLORS: [string, string][] = [
  ['#e63946', '빨강'],
  ['#ff8c1a', '주황'],
  ['#ffd23f', '노랑'],
  ['#8ac926', '연두'],
  ['#2a9d4b', '초록'],
  ['#8d5a3b', '갈색'],
  ['#ff8fab', '분홍'],
  ['#8e44ad', '보라'],
  ['#3a86ff', '파랑'],
  ['#2b2140', '검정'],
];
const BRUSHES = [6, 14, 26];
const MAX_PLAYERS = 6;
const SETUP_KEY = 'fruit_arcade_draw_setup';

interface Setup {
  players: number;
  seconds: number;
  rounds: number;
  /** Show the fruit's picture while drawing */
  hint: boolean;
}
const DEFAULT_SETUP: Setup = { players: 2, seconds: 30, rounds: 3, hint: true };

function loadSetup(): Setup {
  try {
    const s = { ...DEFAULT_SETUP, ...JSON.parse(localStorage.getItem(SETUP_KEY) || '{}') };
    return {
      players: Math.max(1, Math.min(MAX_PLAYERS, Math.round(Number(s.players)) || 2)),
      seconds: [15, 30, 60].includes(s.seconds) ? s.seconds : 30,
      rounds: [3, 5].includes(s.rounds) ? s.rounds : 3,
      hint: s.hint !== false,
    };
  } catch {
    return DEFAULT_SETUP;
  }
}

type Tool = 'pen' | 'fill' | 'eraser';
type Op = { kind: 'stroke'; color: string; size: number; erase: boolean; pts: number[] } | { kind: 'fill'; color: string; x: number; y: number };

interface Entry {
  player: number;
  image: string;
  sync: number;
}

interface Standing {
  wins: number;
  total: number;
  best: number;
}

type Phase = 'intro' | 'draw' | 'scoring' | 'reveal';

const playerName = (i: number) => `${PLAYER_ICONS[i]} ${i + 1}P`;

// ───────── pictures → pixels for the 싱크율 ─────────

type Box = { x0: number; y0: number; x1: number; y1: number };

/** The part of a canvas that has anything on it */
function boxOf(c: HTMLCanvasElement): Box | null {
  const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width;
  let y0 = c.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++)
      if (d[(y * c.width + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** Crop to what's drawn and fit it into the GRID square, so size and position don't matter */
function normalize(src: HTMLCanvasElement, box: Box): Pixels {
  const c = document.createElement('canvas');
  c.width = c.height = GRID;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const bw = box.x1 - box.x0 + 1;
  const bh = box.y1 - box.y0 + 1;
  const s = (GRID - 4) / Math.max(bw, bh);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, box.x0, box.y0, bw, bh, (GRID - bw * s) / 2, (GRID - bh * s) / 2, bw * s, bh * s);
  return { size: GRID, data: g.getImageData(0, 0, GRID, GRID).data };
}

const refCache = new Map<string, Promise<Pixels | null>>();
/** The fruit's picture as pixels (null if it can't be loaded) */
function referenceOf(emoji: string): Promise<Pixels | null> {
  let p = refCache.get(emoji);
  if (!p) {
    p = new Promise<Pixels | null>((resolve) => {
      const src = emojiSrc(emoji);
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = 240;
        c.getContext('2d')!.drawImage(img, 0, 0, 240, 240);
        const box = boxOf(c);
        resolve(box ? normalize(c, box) : null);
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
    refCache.set(emoji, p);
  }
  return p;
}

// ───────── drawing ─────────

const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Paint bucket: fills the touching area of the same colour (empty paper counts as one colour) */
function floodFill(ctx: CanvasRenderingContext2D, sx: number, sy: number, color: string) {
  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;
  const at = (x: number, y: number) => (y * SIZE + x) * 4;
  const s = at(sx, sy);
  const empty = d[s + 3] < 128;
  const [tr, tg, tb] = [d[s], d[s + 1], d[s + 2]];
  const [r, g, b] = hexRgb(color);
  if (!empty && Math.abs(tr - r) + Math.abs(tg - g) + Math.abs(tb - b) < 30) return;
  const same = (i: number) => (empty ? d[i + 3] < 128 : d[i + 3] >= 128 && Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) < 60);
  const seen = new Uint8Array(SIZE * SIZE);
  const stack = [sx, sy];
  while (stack.length) {
    const y = stack.pop()!;
    let x = stack.pop()!;
    while (x > 0 && !seen[y * SIZE + x - 1] && same(at(x - 1, y))) x--;
    let up = false;
    let down = false;
    for (; x < SIZE && !seen[y * SIZE + x] && same(at(x, y)); x++) {
      const i = at(x, y);
      seen[y * SIZE + x] = 1;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
      if (y > 0) {
        const open = !seen[(y - 1) * SIZE + x] && same(at(x, y - 1));
        if (open && !up) stack.push(x, y - 1);
        up = open;
      }
      if (y < SIZE - 1) {
        const open = !seen[(y + 1) * SIZE + x] && same(at(x, y + 1));
        if (open && !down) stack.push(x, y + 1);
        down = open;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function drawOp(ctx: CanvasRenderingContext2D, op: Op) {
  if (op.kind === 'fill') {
    floodFill(ctx, op.x, op.y, op.color);
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = op.erase ? 'destination-out' : 'source-over';
  ctx.strokeStyle = op.color;
  ctx.fillStyle = op.color;
  ctx.lineWidth = op.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const p = op.pts;
  if (p.length === 2) {
    ctx.beginPath();
    ctx.arc(p[0], p[1], op.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.stroke();
  }
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

export const FruitDrawGame: React.FC<Props> = ({ settings, best, autoStart = false, isPaused, onUnlockAchieve, onGameComplete, onRoundChange, onExit, onHelp }) => {
  const [setup, setSetup] = useState<Setup>(loadSetup);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'OVER'>('IDLE');
  const [phase, setPhase] = useState<Phase>('intro');
  const [prompts, setPrompts] = useState<[string, string][]>([]);
  const [round, setRound] = useState(0);
  const [turn, setTurn] = useState(0);
  const [entries, setEntries] = useState<Entry[][]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [left, setLeft] = useState(0);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0][0]);
  const [brush, setBrush] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [reward, setReward] = useState<GameReward | null>(null);
  const [final, setFinal] = useState<{ order: number[]; best: number; seconds: number } | null>(null);

  // The round in play, for timers and pointer handlers
  const game = useRef({ setup, round: 0, turn: 0, prompts: [] as [string, string][], entries: [] as Entry[][], standings: [] as Standing[], started: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const opsRef = useRef<Op[]>([]);
  const strokeRef = useRef<Op | null>(null);
  const leftRef = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const live = useRef({ onUnlockAchieve, onGameComplete, settings });
  live.current = { onUnlockAchieve, onGameComplete, settings };
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const changeSetup = (next: Setup) => {
    setSetup(next);
    try {
      localStorage.setItem(SETUP_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    onRoundChange(gameState === 'PLAYING');
  }, [gameState, onRoundChange]);

  const handleStartGame = () => {
    const s = setup;
    const rand = seededRandom(randomSeed());
    const pool = [...PROMPTS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picked = pool.slice(0, s.rounds);
    const stand = Array.from({ length: s.players }, () => ({ wins: 0, total: 0, best: 0 }));
    game.current = { setup: s, round: 0, turn: 0, prompts: picked, entries: [[]], standings: stand, started: Date.now() };
    setPrompts(picked);
    setRound(0);
    setTurn(0);
    setEntries([[]]);
    setStandings(stand);
    setReward(null);
    setFinal(null);
    setPhase('intro');
    setGameState('PLAYING');
    playSound('click', settings);
    // Warm up the first pictures so scoring is instant
    picked.forEach(([e]) => referenceOf(e));
  };

  // "한 판 더" and "처음부터" skip the start card
  useEffect(() => {
    if (autoStart) handleStartGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redraw = () => {
    const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    for (const op of opsRef.current) drawOp(ctx, op);
  };

  const beginDrawing = () => {
    opsRef.current = [];
    strokeRef.current = null;
    setCanUndo(false);
    setTool('pen');
    leftRef.current = game.current.setup.seconds;
    setLeft(leftRef.current);
    setPhase('draw');
    playSound('click', settings);
    requestAnimationFrame(redraw);
  };

  /** Done (or out of time): score the drawing, then the next player or the round's results */
  const finishDrawing = async () => {
    if (phaseRef.current !== 'draw') return;
    strokeRef.current = null;
    setPhase('scoring');
    phaseRef.current = 'scoring';
    const g = game.current;
    const canvas = canvasRef.current!;
    const box = boxOf(canvas);
    const ref = await referenceOf(g.prompts[g.round][0]);
    const sync = box && ref ? compare(normalize(canvas, box), ref).sync : 0;
    // A small copy on paper for the results
    const thumb = document.createElement('canvas');
    thumb.width = thumb.height = 200;
    const t = thumb.getContext('2d')!;
    t.fillStyle = '#ffffff';
    t.fillRect(0, 0, 200, 200);
    t.drawImage(canvas, 0, 0, 200, 200);
    const entry = { player: g.turn, image: thumb.toDataURL('image/png'), sync };
    // The next player must not see it
    opsRef.current = [];
    setCanUndo(false);
    redraw();
    g.entries = g.entries.map((r, i) => (i === g.round ? [...r, entry] : r));
    setEntries(g.entries);
    if (sync >= 70) live.current.onUnlockAchieve('draw_70');
    if (sync >= 90) live.current.onUnlockAchieve('draw_90');

    if (g.turn < g.setup.players - 1) {
      g.turn += 1;
      setTurn(g.turn);
      setPhase('intro');
      playSound('flip', live.current.settings);
      return;
    }
    // Everyone drew: the closest picture(s) take the round
    const list = g.entries[g.round];
    const top = Math.max(...list.map((e) => e.sync));
    g.standings = g.standings.map((s, i) => {
      const e = list.find((x) => x.player === i)!;
      const won = g.setup.players > 1 && top > 0 && e.sync === top;
      return { wins: s.wins + (won ? 1 : 0), total: s.total + e.sync, best: Math.max(s.best, e.sync) };
    });
    setStandings(g.standings);
    setPhase('reveal');
    playSound('victory', live.current.settings);
    vibrate(HAPTIC.match, live.current.settings);
  };
  const finishRef = useRef(finishDrawing);
  finishRef.current = finishDrawing;

  const nextRound = () => {
    const g = game.current;
    if (g.round < g.setup.rounds - 1) {
      g.round += 1;
      g.turn = 0;
      g.entries = [...g.entries, []];
      setEntries(g.entries);
      setRound(g.round);
      setTurn(0);
      setPhase('intro');
      playSound('click', settings);
      return;
    }
    // The end: most rounds won, then the higher total
    const order = g.standings.map((_, i) => i).sort((a, b) => g.standings[b].wins - g.standings[a].wins || g.standings[b].total - g.standings[a].total);
    const bestSync = Math.max(0, ...g.standings.map((s) => s.best));
    const seconds = Math.round((Date.now() - g.started) / 1000);
    setFinal({ order, best: bestSync, seconds });
    setGameState('OVER');
    if (g.setup.players >= 3) live.current.onUnlockAchieve('draw_party');
    const r = live.current.onGameComplete({ game: 'draw', score: bestSync, seconds });
    setReward(r);
    playSound('victory', settings);
    if (r.newBest && settings.celebrateEffect) celebrate();
  };

  // The drawing clock (stops while paused)
  useEffect(() => {
    if (phase !== 'draw' || isPaused) return;
    let raf = 0;
    let last = performance.now();
    const loop = (time: number) => {
      leftRef.current = Math.max(0, leftRef.current - (time - last) / 1000);
      last = time;
      setLeft(leftRef.current);
      if (leftRef.current <= 0) {
        playSound('warn', live.current.settings);
        finishRef.current();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, isPaused]);

  // ───────── pointer drawing ─────────

  const toCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) * SIZE) / r.width), Math.round(((e.clientY - r.top) * SIZE) / r.height)];
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary || phaseRef.current !== 'draw' || isPausedRef.current) return;
    const ctx = e.currentTarget.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const [x, y] = toCanvas(e);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    if (tool === 'fill') {
      const op: Op = { kind: 'fill', color, x, y };
      drawOp(ctx, op);
      opsRef.current.push(op);
      setCanUndo(true);
      playSound('drop', settings);
      return;
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const op: Op = { kind: 'stroke', color, size: BRUSHES[brush] * (tool === 'eraser' ? 1.6 : 1), erase: tool === 'eraser', pts: [x, y] };
    strokeRef.current = op;
    drawOp(ctx, op);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const op = strokeRef.current;
    if (!e.isPrimary || !op || op.kind !== 'stroke') return;
    const ctx = e.currentTarget.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const [x, y] = toCanvas(e);
    const n = op.pts.length;
    if (Math.abs(x - op.pts[n - 2]) + Math.abs(y - op.pts[n - 1]) < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = op.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = op.color;
    ctx.lineWidth = op.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(op.pts[n - 2], op.pts[n - 1]);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
    op.pts.push(x, y);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary || !strokeRef.current) return;
    opsRef.current.push(strokeRef.current);
    strokeRef.current = null;
    setCanUndo(true);
  };

  const undo = () => {
    if (phaseRef.current !== 'draw' || !opsRef.current.length) return;
    opsRef.current.pop();
    setCanUndo(opsRef.current.length > 0);
    redraw();
  };
  const clearAll = () => {
    if (phaseRef.current !== 'draw' || !opsRef.current.length) return;
    opsRef.current = [];
    setCanUndo(false);
    redraw();
    playSound('drop', settings);
  };

  // Keys: Space / Enter start from the start card; Ctrl+Z undoes a line
  const keyRef = useRef({ start: handleStartGame, undo });
  keyRef.current = { start: handleStartGame, undo };
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (isPausedRef.current) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        keyRef.current.undo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (gameStateRef.current === 'IDLE' && (e.code === 'Space' || e.code === 'Enter') && !(e.target as HTMLElement | null)?.closest?.('button')) {
        e.preventDefault();
        keyRef.current.start();
      }
    };
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
  }, []);

  const prompt = prompts[round];
  const players = gameState === 'IDLE' ? setup.players : game.current.setup.players;
  const solo = players === 1;
  const roundEntries = entries[round] ?? [];
  const roundTop = Math.max(0, ...roundEntries.map((e) => e.sync));
  const bestSoFar = Math.max(0, ...standings.map((s) => s.best));
  const seconds = game.current.setup.seconds;

  return (
    <>
      <GameFrame
        hud={
          <Hud>
            <HudStat label="라운드" value={gameState === 'IDLE' ? '–' : `${round + 1}/${game.current.setup.rounds}`} />
            <HudStat label="차례" value={gameState === 'PLAYING' ? playerName(turn) : '–'} />
            <HudStat label="남은 시간" value={phase === 'draw' ? `${Math.ceil(left)}초` : '–'} tone={phase === 'draw' && left <= 5 ? 'warn' : 'default'} />
            <HudStat label="최고 싱크율" value={`${Math.max(best, bestSoFar)}%`} tone={bestSoFar > best && best > 0 ? 'hot' : 'default'} />
          </Hud>
        }
        board={
          <div className="board-fit w-full" style={{ maxWidth: 'calc((100dvh - var(--board-offset)) * 0.7333)' }}>
            <div className="@container relative aspect-[440/600] w-full select-none overflow-clip rounded-[28px] border-2 border-line bg-grape-soft shadow-pop">
              {/* Prompt and time */}
              <div className="absolute inset-x-[4%] top-[2.5%] flex h-[7%] items-center gap-[2cqw]">
                <span className="chip h-full min-w-0 flex-1 justify-center gap-[1.5cqw] bg-surface px-[3cqw] font-display text-[4.6cqw]">
                  {gameState === 'PLAYING' && prompt ? (
                    <>
                      <span className="text-[3.2cqw] font-bold text-ink-3">제시어</span>
                      {setup.hint && (
                        <span className="text-[6cqw] leading-none">
                          <Emoji e={prompt[0]} />
                        </span>
                      )}
                      <span className="truncate">{prompt[1]}</span>
                    </>
                  ) : (
                    '🎨 과일 그리기'
                  )}
                </span>
              </div>
              <div className="absolute inset-x-[4%] top-[10.5%] h-[1.2%] overflow-hidden rounded-full bg-surface/70">
                <span
                  className={`block h-full ${left <= 5 ? 'bg-berry' : 'bg-grape'}`}
                  style={{ width: phase === 'draw' ? `${(left / seconds) * 100}%` : '0%' }}
                />
              </div>

              {/* Paper */}
              <canvas
                ref={canvasRef}
                width={SIZE}
                height={SIZE}
                aria-label="그림판"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onContextMenu={(e) => e.preventDefault()}
                className={`absolute left-[5%] top-[13.5%] aspect-square w-[90%] touch-none rounded-[4cqw] border-2 border-line bg-white ${
                  tool === 'fill' ? 'cursor-cell' : 'cursor-crosshair'
                }`}
              />

              {/* Tools */}
              <div className="absolute inset-x-[4%] top-[81%] flex h-[7%] items-center justify-between gap-[1cqw]" role="group" aria-label="색">
                {COLORS.map(([c, name]) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setColor(c);
                      if (tool === 'eraser') setTool('pen');
                    }}
                    aria-label={name}
                    aria-pressed={color === c}
                    className={`aspect-square h-[78%] rounded-full border-2 border-line transition-transform ${color === c && tool !== 'eraser' ? 'scale-125 ring-2 ring-ink ring-offset-1' : ''}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="absolute inset-x-[4%] top-[89.5%] flex h-[8%] items-center gap-[1cqw]">
                {(
                  [
                    ['pen', Pencil, '펜'],
                    ['fill', PaintBucket, '채우기'],
                    ['eraser', Eraser, '지우개'],
                  ] as [Tool, typeof Pencil, string][]
                ).map(([t, Icon, label]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTool(t)}
                    aria-pressed={tool === t}
                    aria-label={label}
                    className={`grid h-full w-[9.5cqw] shrink-0 place-items-center rounded-[2.5cqw] border-2 border-line ${tool === t ? 'bg-grape text-white' : 'bg-surface'}`}
                  >
                    <Icon className="h-[4.6cqw] w-[4.6cqw]" strokeWidth={2.5} />
                  </button>
                ))}
                <span className="flex h-full shrink-0 items-center rounded-[2.5cqw] border-2 border-line bg-surface">
                  <button type="button" className="grid h-full w-[6cqw] place-items-center" onClick={() => setBrush((b) => Math.max(0, b - 1))} aria-label="가늘게">
                    <Minus className="h-[3.6cqw] w-[3.6cqw]" strokeWidth={3} />
                  </button>
                  <span className="grid w-[5cqw] place-items-center" aria-label={`굵기 ${brush + 1}`}>
                    <span className="block rounded-full bg-ink" style={{ width: `${1.2 + brush * 1.2}cqw`, height: `${1.2 + brush * 1.2}cqw` }} />
                  </span>
                  <button type="button" className="grid h-full w-[6cqw] place-items-center" onClick={() => setBrush((b) => Math.min(BRUSHES.length - 1, b + 1))} aria-label="굵게">
                    <Plus className="h-[3.6cqw] w-[3.6cqw]" strokeWidth={3} />
                  </button>
                </span>
                <button type="button" onClick={undo} disabled={!canUndo} aria-label="되돌리기" className="grid h-full w-[9.5cqw] shrink-0 place-items-center rounded-[2.5cqw] border-2 border-line bg-surface disabled:opacity-40">
                  <Undo2 className="h-[4.6cqw] w-[4.6cqw]" strokeWidth={2.5} />
                </button>
                <button type="button" onClick={clearAll} disabled={!canUndo} aria-label="전부 지우기" className="grid h-full w-[9.5cqw] shrink-0 place-items-center rounded-[2.5cqw] border-2 border-line bg-surface disabled:opacity-40">
                  <Trash2 className="h-[4.6cqw] w-[4.6cqw]" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => finishRef.current()}
                  disabled={phase !== 'draw'}
                  className="btn btn-grape ml-auto h-full min-w-0 flex-1 gap-[0.8cqw] rounded-[2.5cqw] px-[1.5cqw] text-[3.6cqw]"
                >
                  <Check className="h-[4.4cqw] w-[4.4cqw]" strokeWidth={3} /> 완성!
                </button>
              </div>

              {/* Before each drawing: whose turn, and the word */}
              {gameState === 'PLAYING' && phase === 'intro' && prompt && (
                <BoardOverlay>
                  <div className="panel w-full max-w-[300px] p-5 text-center animate-pop-in">
                    <p className="text-xs font-bold text-ink-3">
                      라운드 {round + 1} / {game.current.setup.rounds}
                    </p>
                    <p className="mt-2 text-xs font-bold text-ink-3">제시어</p>
                    {setup.hint && (
                      <p className="mt-1 text-6xl leading-none">
                        <Emoji e={prompt[0]} />
                      </p>
                    )}
                    <p className="mt-1 font-display text-4xl">{prompt[1]}</p>
                    <p className="mt-4 font-display text-xl">{solo ? '그릴 준비 됐나요?' : `${playerName(turn)} 차례예요!`}</p>
                    {!solo && <p className="mt-1 text-xs text-ink-2">다른 사람은 화면을 보지 마세요 🙈</p>}
                    <button type="button" className="btn btn-lg btn-grape mt-4 w-full" onClick={beginDrawing} autoFocus>
                      <Pencil className="h-5 w-5" strokeWidth={2.5} /> 그리기 시작 ({seconds}초)
                    </button>
                  </div>
                </BoardOverlay>
              )}
              {phase === 'scoring' && (
                <BoardOverlay>
                  <p className="panel px-5 py-3 font-display text-lg animate-pop-in">🔍 싱크율 재는 중…</p>
                </BoardOverlay>
              )}

              {/* After everyone drew: the pictures side by side */}
              {gameState === 'PLAYING' && phase === 'reveal' && prompt && (
                <BoardOverlay>
                  <div className="panel max-h-full w-full max-w-[340px] overflow-y-auto p-4 text-center animate-pop-in">
                    <p className="text-xs font-bold text-ink-3">
                      라운드 {round + 1} 결과 · {prompt[1]}
                    </p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span className="text-4xl leading-none">
                        <Emoji e={prompt[0]} />
                      </span>
                      <span className="text-left text-[11px] font-bold text-ink-3">
                        이 그림과
                        <br />
                        얼마나 닮았을까요?
                      </span>
                    </div>
                    <ul className={`mt-3 grid gap-2 ${roundEntries.length === 1 ? 'grid-cols-1' : roundEntries.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {roundEntries.map((e) => {
                        const top = !solo && e.sync === roundTop && roundTop > 0;
                        return (
                          <li key={e.player} className={`relative rounded-2xl border-2 border-line p-1.5 ${top ? 'bg-mango-soft' : 'bg-surface-2'}`}>
                            {top && <span className="absolute -right-2 -top-3 text-2xl">👑</span>}
                            <img src={e.image} alt={`${playerName(e.player)}의 그림`} className={`mx-auto aspect-square w-full rounded-xl border-2 border-line ${solo ? 'max-w-[180px]' : ''}`} />
                            <p className="mt-1 text-xs font-bold">{playerName(e.player)}</p>
                            <p className="font-display text-xl leading-none tabular-nums">{e.sync}%</p>
                          </li>
                        );
                      })}
                    </ul>
                    {!solo && (
                      <p className="mt-2 text-xs text-ink-2">
                        {roundTop > 0
                          ? `${roundEntries
                              .filter((e) => e.sync === roundTop)
                              .map((e) => playerName(e.player))
                              .join(', ')} 승리! +1점`
                          : '아무도 그리지 않았어요'}
                      </p>
                    )}
                    {!solo && (
                      <div className="mt-2 flex flex-wrap justify-center gap-1" aria-label="지금까지 점수">
                        {standings.map((st, i) => (
                          <span key={i} className={`chip h-6 px-2 text-[11px] font-bold ${st.wins === Math.max(...standings.map((x) => x.wins)) && st.wins > 0 ? 'bg-mango-soft' : 'bg-surface-2'}`}>
                            {playerName(i)} {st.wins}점
                          </span>
                        ))}
                      </div>
                    )}
                    <button type="button" className="btn btn-grape mt-3 w-full" onClick={nextRound} autoFocus>
                      {round < game.current.setup.rounds - 1 ? '다음 라운드' : '최종 결과 보기'}
                    </button>
                  </div>
                </BoardOverlay>
              )}

              {gameState === 'IDLE' && (
                <BoardOverlay>
                  <StartCard meta={GAMES.draw} best={best} onStart={handleStartGame} onHelp={onHelp}>
                    <div className="space-y-2 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-ink-2">함께 그릴 사람</span>
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            className="btn btn-icon btn-sm"
                            onClick={() => changeSetup({ ...setup, players: Math.max(1, setup.players - 1) })}
                            disabled={setup.players <= 1}
                            aria-label="한 명 빼기"
                          >
                            <Minus className="h-4 w-4" strokeWidth={3} />
                          </button>
                          <span className="w-12 text-center font-display text-lg tabular-nums">{setup.players}명</span>
                          <button
                            type="button"
                            className="btn btn-icon btn-sm"
                            onClick={() => changeSetup({ ...setup, players: Math.min(MAX_PLAYERS, setup.players + 1) })}
                            disabled={setup.players >= MAX_PLAYERS}
                            aria-label="한 명 더"
                          >
                            <Plus className="h-4 w-4" strokeWidth={3} />
                          </button>
                        </span>
                      </div>
                      <Segmented<number>
                        ariaLabel="그리기 시간"
                        columns={3}
                        value={setup.seconds}
                        onChange={(v) => changeSetup({ ...setup, seconds: v })}
                        options={[
                          { value: 15, label: '15초' },
                          { value: 30, label: '30초' },
                          { value: 60, label: '1분' },
                        ]}
                      />
                      <Segmented<number>
                        ariaLabel="라운드"
                        columns={2}
                        value={setup.rounds}
                        onChange={(v) => changeSetup({ ...setup, rounds: v })}
                        options={[
                          { value: 3, label: '3라운드' },
                          { value: 5, label: '5라운드' },
                        ]}
                      />
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-ink-2">
                        <input type="checkbox" className="h-4 w-4 accent-grape" checked={setup.hint} onChange={(e) => changeSetup({ ...setup, hint: e.target.checked })} />
                        정답 그림 보면서 그리기
                      </label>
                    </div>
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
                <span className="sticker h-8 w-8 shrink-0 bg-grape-soft text-base shadow-none" aria-hidden="true">
                  👥
                </span>
                <span>
                  한 화면을 <b>돌려 가며</b> 1~6명이 차례로 그려요
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-berry-soft text-base shadow-none" aria-hidden="true">
                  🍓
                </span>
                <span>
                  제시어 과일을 <b>시간 안에</b> 그려요 (채우기 · 지우개 · 되돌리기)
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-mango-soft text-base shadow-none" aria-hidden="true">
                  🔍
                </span>
                <span>
                  모양 · 색 · 위치가 닮을수록 <b>싱크율</b>이 올라가요
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-melon-soft text-base shadow-none" aria-hidden="true">
                  👑
                </span>
                <span>
                  라운드마다 싱크율 <b>1등이 1점</b>, 점수가 가장 많으면 우승
                </span>
              </li>
            </ul>
            <div className="flex items-center justify-between gap-2">
              <p className="hidden text-xs text-ink-3 sm:block short:hidden">Ctrl+Z 되돌리기 · 랭킹 없는 파티 게임</p>
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

      {gameState === 'OVER' && final && (
        <ScreenOverlay>
          <ResultCard
            game="draw"
            emoji={solo ? '🎨' : '🏆'}
            title={
              solo
                ? '그림 완성!'
                : final.order.filter((i) => standings[i].wins === standings[final.order[0]].wins && standings[i].total === standings[final.order[0]].total).length > 1
                  ? '공동 우승!'
                  : `${playerName(final.order[0])} 우승!`
            }
            subtitle={solo ? `그림 ${game.current.setup.rounds}장 · 평균 싱크율 ${Math.round(standings[0].total / game.current.setup.rounds)}%` : `${players}명 · ${game.current.setup.rounds}라운드`}
            tone="grape"
            score={final.best}
            scoreLabel="최고 싱크율"
            unit="%"
            stats={
              solo
                ? [
                    { label: '그린 그림', value: `${game.current.setup.rounds}장` },
                    { label: '평균 싱크율', value: `${Math.round(standings[0].total / game.current.setup.rounds)}%` },
                    { label: '최고 싱크율', value: `${standings[0].best}%` },
                    { label: '걸린 시간', value: formatTime(final.seconds) },
                  ]
                : final.order.slice(0, 4).map((i, rank) => ({
                    label: `${['🥇', '🥈', '🥉', '4등'][rank]} ${playerName(i)}`,
                    value: `${standings[i].wins}승 · 평균 ${Math.round(standings[i].total / game.current.setup.rounds)}%`,
                  }))
            }
            reward={reward}
            ranked={false}
            shareText={`🎨 과일 그리기에서 싱크율 ${final.best}%로 그렸어요!`}
            shareUrl={`${window.location.origin}${window.location.pathname}`}
            onRetry={handleStartGame}
            onExit={onExit}
          />
        </ScreenOverlay>
      )}
    </>
  );
};
