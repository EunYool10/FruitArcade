import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { GameResult, GameReward, GameSettings } from '../../types';
import { GAMES } from '../../constants';
import { playSound } from '../../utils/audio';
import { HAPTIC, vibrate } from '../../utils/haptics';
import { celebrate } from '../../utils/fx';
import { Rng, randomSeed, seededRandom } from '../../utils/rng';
import { formatNumber, formatTime, josa } from '../../utils/format';
import { drawEmoji, preloadEmoji } from '../../utils/emoji';
import { skinPiece } from '../../utils/skins';
import { BoardOverlay, GameFrame, Hud, HudStat, ScreenOverlay } from '../game/GameFrame';
import { StartCard } from '../game/StartCard';
import { ResultCard } from '../game/ResultCard';
import { Row, SONGS, Song, songById, songLevel, songRows } from './songs';
import { playNote } from './sound';

const CW = 440;
const CH = 600;
const LANES = 4;
const LW = CW / LANES;
/** Row height: four rows fill the board */
const RH = CH / 4;
/** Rows per second never go past this */
const MAX_SPEED = 10;
/** Each finished lap of the song plays this much faster */
const LAP_SPEEDUP = 0.15;
/** Extra rows per second for every tile played */
const RAMP = 0.004;
/** Where the board rests before the first tap (the first tile sits a little above the bottom) */
const START_POS = -0.55;
/** How long a wrong tap or a missed tile shows before the result */
const END_MS = 1100;
const SONG_KEY = 'fruit_arcade_piano_song';
/** D F J K play the four lanes */
const KEYS: Record<string, number> = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3 };

/** A tile's fruit by note: C 딸기, D 귤, E 레몬, F 풋사과, G 블루베리, A 포도, B 복숭아, sharps 체리 */
const FRUIT_BY_PITCH = ['🍓', '🍒', '🍊', '🍒', '🍋', '🍏', '🍒', '🫐', '🍒', '🍇', '🍒', '🍑'];
/** The fruit in order, for the shop's fruit skins */
const PIANO_FRUITS = ['🍓', '🍒', '🍊', '🍋', '🍏', '🫐', '🍇', '🍑'];
const TILE: Record<string, { fill: string; deep: string }> = {
  '🍓': { fill: '#ff5c7a', deep: '#c9184a' },
  '🍒': { fill: '#f0444b', deep: '#a4161a' },
  '🍊': { fill: '#ff9f1c', deep: '#d16a00' },
  '🍋': { fill: '#ffd23f', deep: '#d4a600' },
  '🍏': { fill: '#8bd450', deep: '#4c8c2b' },
  '🫐': { fill: '#5b7cfa', deep: '#2a3eb1' },
  '🍇': { fill: '#9b5de5', deep: '#6a3fb5' },
  '🍑': { fill: '#ffa48a', deep: '#e5737a' },
};
preloadEmoji(PIANO_FRUITS);

const BOARD = {
  light: { bg: '#fff8ec', alt: '#fff1db', line: 'rgba(43, 33, 64, 0.12)', outline: '#2b2140', done: 'rgba(43, 33, 64, 0.06)', text: '#2b2140' },
  dark: { bg: '#211a45', alt: '#1c163d', line: 'rgba(255, 244, 228, 0.1)', outline: '#07050c', done: 'rgba(255, 244, 228, 0.06)', text: '#fff4e4' },
};

const fruitOf = (midi: number) => FRUIT_BY_PITCH[((midi % 12) + 12) % 12];

/** Song id from a round seed ("ode.k3j9x"); the first song when it names none */
const songOfSeed = (seed: string | undefined) => songById(seed?.split('.')[0]);

function loadSongId(): string {
  try {
    return songById(localStorage.getItem(SONG_KEY) ?? '')?.id ?? SONGS[0].id;
  } catch {
    return SONGS[0].id;
  }
}

type EndCause = 'wrong' | 'miss';

interface Bit {
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  life: number;
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
  /** "song.random": same song, same tiles (friend challenges) */
  seed?: string;
  onRoundSeed?: (seed: string) => void;
}

export const PianoGame: React.FC<Props> = ({
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const challengeSong = songOfSeed(seed);
  const [songId, setSongId] = useState(() => challengeSong?.id ?? loadSongId());
  const song: Song = songById(songId) ?? SONGS[0];

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'OVER'>('IDLE');
  const [score, setScore] = useState(0);
  const [laps, setLaps] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState<EndCause | null>(null);
  const [reward, setReward] = useState<GameReward | null>(null);

  // Mutable round state for the animation loop and taps
  const rngRef = useRef<Rng>(Math.random);
  const lapRowsRef = useRef<Row[]>([]);
  /** The song this round plays */
  const roundSongRef = useRef<Song>(song);
  /** Every row so far: its note (null = empty) and lane (-1 = empty) */
  const notesRef = useRef<Row[]>([]);
  const lanesRef = useRef<number[]>([]);
  /** Rows whose tile ends a lap of the song */
  const lapEndsRef = useRef<Set<number>>(new Set());
  /** Row → when its tile was played (performance.now) */
  const playedRef = useRef<Map<number, number>>(new Map());
  /** Lowest tile still to play */
  const nextRef = useRef(0);
  const posRef = useRef(START_POS);
  const startedRef = useRef(false);
  const lapRef = useRef(0);
  const scoreRef = useRef(0);
  const timeRef = useRef(0);
  const endRef = useRef<{ cause: EndCause; row: number; lane: number; at: number } | null>(null);
  const bitsRef = useRef<Bit[]>([]);
  const floatsRef = useRef<{ text: string; life: number }[]>([]);
  const isPlayingRef = useRef(false);
  const lastTimeRef = useRef(performance.now());
  const animFrameRef = useRef<number | null>(null);

  const live = useRef({ onUnlockAchieve, onGameComplete, settings });
  live.current = { onUnlockAchieve, onGameComplete, settings };
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  useEffect(() => {
    onRoundChange(gameState === 'PLAYING');
  }, [gameState, onRoundChange]);

  useEffect(
    () => () => {
      isPlayingRef.current = false;
    },
    []
  );

  /** Lay out laps of the song until there are at least `count` rows; a tile never repeats its lane */
  const growRows = (count: number) => {
    const notes = notesRef.current;
    const lanes = lanesRef.current;
    while (notes.length < count) {
      let last = -1;
      for (let i = lanes.length - 1; i >= 0; i--)
        if (lanes[i] >= 0) {
          last = lanes[i];
          break;
        }
      const lap = lapRowsRef.current;
      lap.forEach((note) => {
        notes.push(note);
        if (note === null) return lanes.push(-1);
        let lane = Math.floor(rngRef.current() * (last < 0 ? LANES : LANES - 1));
        if (last >= 0 && lane >= last) lane++;
        last = lane;
        lanes.push(lane);
      });
      for (let i = notes.length - 1; i >= 0; i--)
        if (notes[i] !== null) {
          lapEndsRef.current.add(i);
          break;
        }
    }
  };

  const speedNow = () => Math.min(MAX_SPEED, roundSongRef.current.speed * (1 + LAP_SPEEDUP * lapRef.current) + RAMP * scoreRef.current);

  // Dev server only (compiled out of real builds): lets browser tests play the tiles
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__pianoTest = {
      next: () => ({ row: nextRef.current, lane: lanesRef.current[nextRef.current], pos: posRef.current }),
      play: () => tap(lanesRef.current[nextRef.current], null),
      end: () => endRef.current,
      lanes: () => lanesRef.current.slice(0, 40),
    };
  });

  // Play time (from the first tile)
  useEffect(() => {
    if (gameState !== 'PLAYING' || isPaused) return;
    const id = setInterval(() => {
      if (!isPlayingRef.current || !startedRef.current || endRef.current) return;
      timeRef.current += 1;
      setElapsed(timeRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [gameState, isPaused]);

  const handleStartGame = () => {
    const chosen = challengeSong ?? song;
    const roundSeed = seed ?? `${chosen.id}.${randomSeed()}`;
    rngRef.current = seededRandom(roundSeed);
    onRoundSeed?.(roundSeed);
    roundSongRef.current = chosen;
    lapRowsRef.current = songRows(chosen);
    notesRef.current = [];
    lanesRef.current = [];
    lapEndsRef.current = new Set();
    playedRef.current = new Map();
    nextRef.current = 0;
    posRef.current = START_POS;
    startedRef.current = false;
    lapRef.current = 0;
    scoreRef.current = 0;
    timeRef.current = 0;
    endRef.current = null;
    bitsRef.current = [];
    floatsRef.current = [];
    growRows(lapRowsRef.current.length * 2);

    setScore(0);
    setLaps(0);
    setSpeed(1);
    setElapsed(0);
    setEnding(null);
    setReward(null);
    setGameState('PLAYING');
    isPlayingRef.current = true;
    lastTimeRef.current = performance.now();
  };

  // "한 판 더" and "처음부터" skip the start card
  useEffect(() => {
    if (autoStart) handleStartGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickSong = (id: string) => {
    setSongId(id);
    try {
      localStorage.setItem(SONG_KEY, id);
    } catch {
      // ignore
    }
  };

  const finishRound = useCallback((cause: EndCause) => {
    const { settings: s, onUnlockAchieve: unlock, onGameComplete: complete } = live.current;
    setEnding(cause);
    setElapsed(timeRef.current);
    setGameState('OVER');
    playSound('over', s);
    if (scoreRef.current >= 200) unlock('piano_200');
    const r = complete({ game: 'piano', score: scoreRef.current, seconds: timeRef.current, won: lapRef.current >= 1 });
    setReward(r);
    if (r.newBest && s.celebrateEffect) celebrate();
  }, []);

  /** A wrong tap or a missed tile: show it for a moment, then the result */
  const fail = (cause: EndCause, row: number, lane: number) => {
    if (endRef.current) return;
    endRef.current = { cause, row, lane, at: performance.now() };
    isPlayingRef.current = false;
    playSound('wrong', live.current.settings);
    vibrate(HAPTIC.wrong, live.current.settings);
  };

  const hit = (row: number) => {
    const s = live.current.settings;
    const note = notesRef.current[row];
    playedRef.current.set(row, performance.now());
    if (note !== null) playNote(note, s);
    vibrate(HAPTIC.tap, s);
    startedRef.current = true;
    scoreRef.current += 1;
    setScore(scoreRef.current);

    // Fruit bits fly out of the tile
    const lane = lanesRef.current[row];
    const x = lane * LW + LW / 2;
    const y = CH - (row + 0.5 - posRef.current) * RH;
    const emoji = skinPiece(s.suikaSkin, PIANO_FRUITS, fruitOf(note ?? 60));
    if (s.animEnabled)
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
        const v = 3 + Math.random() * 3;
        bitsRef.current.push({ emoji, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, life: 0 });
      }

    // More song further up, and the next tile
    if (lanesRef.current.length < row + 24) growRows(row + 24 + lapRowsRef.current.length);
    let next = row + 1;
    while (lanesRef.current[next] === -1) next++;
    nextRef.current = next;

    if (lapEndsRef.current.has(row)) {
      lapRef.current += 1;
      setLaps(lapRef.current);
      floatsRef.current.push({ text: `🎉 ${lapRef.current}바퀴 완주! 더 빨라져요`, life: 0 });
      playSound('levelup', s);
      if (lapRef.current === 1) live.current.onUnlockAchieve('piano_song');
      if (lapRef.current === 3) live.current.onUnlockAchieve('piano_lap_3');
    }
    setSpeed(speedNow() / roundSongRef.current.speed);
  };

  /** A tap on a lane (row null = a key, which always means the next tile's row) */
  const tap = (lane: number, row: number | null) => {
    if (gameStateRef.current !== 'PLAYING' || isPausedRef.current || endRef.current) return;
    const next = nextRef.current;
    const nextLane = lanesRef.current[next];
    if (row === null) {
      if (lane === nextLane) hit(next);
      else fail('wrong', next, lane);
      return;
    }
    // A little slack: a fast tile is often caught just above or below its row
    if (lane === nextLane && Math.abs(row - next) <= 1) return hit(next);
    // Before the first tile, other taps do nothing
    if (!startedRef.current) return;
    // Tiles further up, or ones already played, don't count as a wrong tap
    if (row > next && lanesRef.current[row] === lane) return;
    if (playedRef.current.has(row) && lanesRef.current[row] === lane) return;
    fail('wrong', row, lane);
  };

  // Keys: D F J K for the lanes, Space / Enter from the start card
  const tapRef = useRef(tap);
  tapRef.current = tap;
  const startRef = useRef(handleStartGame);
  startRef.current = handleStartGame;
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (isPausedRef.current || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code in KEYS && gameStateRef.current === 'PLAYING') {
        e.preventDefault();
        if (!e.repeat) tapRef.current(KEYS[e.code], null);
        return;
      }
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (gameStateRef.current === 'PLAYING') {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur?.();
      } else if (gameStateRef.current === 'IDLE' && !(e.target as HTMLElement | null)?.closest?.('button, select')) {
        e.preventDefault();
        startRef.current();
      }
    };
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
  }, []);

  // Main loop: scrolling while playing, effects always, drawing every frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixelRatio = Math.min(3, Math.max(1, window.devicePixelRatio || 1) * 1.25);
    canvas.width = Math.round(CW * pixelRatio);
    canvas.height = Math.round(CH * pixelRatio);
    const P = dark ? BOARD.dark : BOARD.light;

    const tileRect = (row: number, lane: number) => ({ x: lane * LW + 5, y: CH - (row + 1 - posRef.current) * RH + 5, w: LW - 10, h: RH - 10 });

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
      else ctx.rect(x, y, w, h);
    };

    const loop = (time: number) => {
      const dt = Math.min(0.05, Math.max(0, (time - lastTimeRef.current) / 1000));
      lastTimeRef.current = time;
      const paused = isPausedRef.current;
      const end = endRef.current;

      if (!paused) {
        if (isPlayingRef.current && startedRef.current && !end) {
          posRef.current += speedNow() * dt;
          // The next tile slid off the bottom
          const next = nextRef.current;
          if (posRef.current >= next + 1) fail('miss', next, lanesRef.current[next]);
        }
        // A missed tile: the board slides back so it shows
        if (end?.cause === 'miss') posRef.current += (end.row - 0.6 - posRef.current) * Math.min(1, dt * 10);
        if (end && gameStateRef.current === 'PLAYING' && performance.now() - end.at > END_MS) finishRound(end.cause);

        for (const b of bitsRef.current) {
          b.x += b.vx;
          b.y += b.vy;
          b.vy += 0.35;
          b.rot += 0.1;
          b.life += 1;
        }
        bitsRef.current = bitsRef.current.filter((b) => b.life < 40);
        for (const f of floatsRef.current) f.life += 1;
        floatsRef.current = floatsRef.current.filter((f) => f.life < 110);
      }

      // ───────── drawing ─────────
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      for (let l = 0; l < LANES; l++) {
        ctx.fillStyle = l % 2 ? P.alt : P.bg;
        ctx.fillRect(l * LW, 0, LW, CH);
      }
      ctx.strokeStyle = P.line;
      ctx.lineWidth = 2;
      for (let l = 1; l < LANES; l++) {
        ctx.beginPath();
        ctx.moveTo(l * LW, 0);
        ctx.lineTo(l * LW, CH);
        ctx.stroke();
      }

      const now = performance.now();
      const blink = end ? Math.floor((now - end.at) / 140) % 2 === 0 : false;
      const skin = live.current.settings.suikaSkin;
      const first = Math.max(0, Math.floor(posRef.current) - 1);
      for (let row = first; row < first + 7 && row < lanesRef.current.length; row++) {
        const lane = lanesRef.current[row];
        if (lane < 0) continue;
        const r = tileRect(row, lane);
        const note = notesRef.current[row] ?? 60;
        const fruit = fruitOf(note);
        const color = TILE[fruit];
        const playedAt = playedRef.current.get(row);
        if (playedAt !== undefined) {
          // Played: a faint print of the tile, with the fruit popping away
          ctx.fillStyle = P.done;
          roundRect(r.x, r.y, r.w, r.h, 18);
          ctx.fill();
          const t = Math.min(1, (now - playedAt) / 220);
          if (t < 1) {
            ctx.save();
            ctx.globalAlpha = 1 - t;
            drawEmoji(ctx, skinPiece(skin, PIANO_FRUITS, fruit), r.x + r.w / 2, r.y + r.h / 2, 56 * (1 + t * 0.6));
            ctx.restore();
          }
          continue;
        }
        const missed = end?.cause === 'miss' && end.row === row;
        ctx.fillStyle = missed && blink ? '#ff3b30' : color.fill;
        ctx.strokeStyle = P.outline;
        ctx.lineWidth = 3;
        roundRect(r.x, r.y, r.w, r.h, 18);
        ctx.fill();
        ctx.stroke();
        // A darker base gives the tile some depth
        ctx.fillStyle = color.deep;
        roundRect(r.x + 3, r.y + r.h - 14, r.w - 6, 10, 6);
        ctx.fill();
        drawEmoji(ctx, skinPiece(skin, PIANO_FRUITS, fruit), r.x + r.w / 2, r.y + r.h / 2 - 6, 56);
        if (row === 0 && !startedRef.current) {
          ctx.font = '700 20px Fredoka, Jua, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 5;
          ctx.strokeStyle = P.outline;
          ctx.strokeText('시작', r.x + r.w / 2, r.y + r.h - 30);
          ctx.fillStyle = '#ffffff';
          ctx.fillText('시작', r.x + r.w / 2, r.y + r.h - 30);
        }
      }

      // A wrong tap lights up the empty spot
      if (end?.cause === 'wrong' && blink) {
        const r = tileRect(end.row, end.lane);
        ctx.fillStyle = 'rgba(255, 59, 48, 0.85)';
        roundRect(r.x, r.y, r.w, r.h, 18);
        ctx.fill();
      }

      for (const b of bitsRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - b.life / 40);
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        drawEmoji(ctx, b.emoji, 0, 0, 22);
        ctx.restore();
      }

      // Lap messages, middle of the board
      for (const f of floatsRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, (110 - f.life) / 30));
        ctx.font = '700 26px Fredoka, Jua, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 6;
        ctx.strokeStyle = P.outline;
        const y = CH * 0.4 - f.life * 0.4;
        ctx.strokeText(f.text, CW / 2, y);
        ctx.fillStyle = '#ffd23f';
        ctx.fillText(f.text, CW / 2, y);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark, finishRound]);

  // ───────── taps (every finger counts) ─────────

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameStateRef.current !== 'PLAYING') return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CW / rect.width);
    const y = (e.clientY - rect.top) * (CH / rect.height);
    const lane = Math.max(0, Math.min(LANES - 1, Math.floor(x / LW)));
    tap(lane, Math.floor(posRef.current + (CH - y) / RH));
  };

  const songPicker = (
    <label className="block text-left">
      <span className="mb-1 block text-xs font-bold text-ink-2">🎵 곡 고르기</span>
      <select
        value={(challengeSong ?? song).id}
        disabled={!!challengeSong || gameState === 'PLAYING'}
        onChange={(e) => pickSong(e.target.value)}
        className="h-11 w-full rounded-xl border-2 border-line bg-surface px-2 text-sm font-bold outline-none focus:border-berry"
      >
        {SONGS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} · {s.by} ({songLevel(s)})
          </option>
        ))}
      </select>
    </label>
  );

  const playing = challengeSong ?? song;

  return (
    <>
      <GameFrame
        hud={
          <Hud>
            <HudStat label="점수" value={formatNumber(score)} />
            <HudStat label="최고" value={formatNumber(Math.max(best, score))} tone={best > 0 && score > best ? 'hot' : 'default'} />
            <HudStat label="바퀴" value={`${laps + 1}`} />
            <HudStat label="속도" value={`×${speed.toFixed(1)}`} />
          </Hud>
        }
        board={
          <div className="board-fit w-full" style={{ maxWidth: 'calc((100dvh - var(--board-offset)) * 0.7333)' }}>
            <div className="relative aspect-[440/600] w-full overflow-hidden rounded-[28px] border-2 border-line bg-surface-2 shadow-pop">
              <canvas
                ref={canvasRef}
                aria-label={`과일 피아노 판 · ${playing.name}`}
                onPointerDown={handlePointerDown}
                className="block h-full w-full cursor-pointer touch-none select-none"
              />
              {gameState === 'IDLE' && (
                <BoardOverlay>
                  <StartCard meta={GAMES.piano} best={best} onStart={handleStartGame} onHelp={onHelp}>
                    {songPicker}
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
                  🍓
                </span>
                <span>
                  내려오는 과일 타일을 <b>아래부터 차례로</b> 눌러요
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-mango-soft text-base shadow-none" aria-hidden="true">
                  🎵
                </span>
                <span>
                  누를 때마다 <b>{playing.name}</b>{josa(playing.name, '이', '가')} 한 음씩 연주돼요
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-grape-soft text-base shadow-none" aria-hidden="true">
                  🔁
                </span>
                <span>
                  한 곡을 다 치면 <b>더 빨라져서</b> 다시 시작
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-soda-soft text-base shadow-none" aria-hidden="true">
                  ⚠️
                </span>
                <span>
                  빈 칸을 누르거나 타일을 <b>놓치면 끝</b>
                </span>
              </li>
            </ul>
            {gameState !== 'IDLE' && songPicker}
            <div className="flex items-center justify-between gap-2">
              <p className="hidden text-xs text-ink-3 sm:block short:hidden">터치 · 키보드 D F J K</p>
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
            game="piano"
            emoji="🎹"
            title={ending === 'wrong' ? '삐빅!' : '놓쳤어요'}
            subtitle={ending === 'wrong' ? '빈 칸을 눌렀어요' : '과일 타일이 지나갔어요'}
            tone={ending === 'wrong' ? 'berry' : 'grape'}
            score={score}
            stats={[
              { label: '곡', value: playing.name },
              { label: '완주', value: laps > 0 ? `${laps}바퀴` : '아직' },
              { label: '최고 속도', value: `×${speed.toFixed(1)}` },
              { label: '플레이 시간', value: formatTime(elapsed) },
            ]}
            reward={reward}
            shareText={`🎹 과일 피아노 ${formatNumber(score)}점! ${playing.name}${laps > 0 ? ` ${laps}바퀴 완주` : ''}`}
            onRetry={handleStartGame}
            onExit={onExit}
          />
        </ScreenOverlay>
      )}
    </>
  );
};
