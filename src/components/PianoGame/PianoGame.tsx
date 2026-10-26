import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, ChevronRight, RotateCcw, X } from 'lucide-react';
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
import { Emoji } from '../ui/Emoji';
import { Lap, SONGS, Song, songById, songLap, songLevel } from './songs';
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
/** Extra rows per second for every point */
const RAMP = 0.003;
/** Where the board rests before the first tap (the first tile sits a little above the bottom) */
const START_POS = -0.55;
/** How long a wrong tap or a missed tile shows before the result */
const END_MS = 1100;
const SONG_KEY = 'fruit_arcade_piano_song';
/** D F J K play the four lanes */
const KEYS: Record<string, number> = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3 };
/** Left-hand notes play softer than the tune */
const LEFT_GAIN = 0.3;

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
  light: { bg: '#fff8ec', alt: '#fff1db', line: 'rgba(43, 33, 64, 0.12)', outline: '#2b2140', done: 'rgba(43, 33, 64, 0.06)' },
  dark: { bg: '#211a45', alt: '#1c163d', line: 'rgba(255, 244, 228, 0.1)', outline: '#07050c', done: 'rgba(255, 244, 228, 0.06)' },
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

/** Each song's first lap: how hard, how many tiles, about how long, and its first fruit */
const SONG_INFO = new Map(
  SONGS.map((s) => {
    const lap = songLap(s);
    return [s.id, { level: songLevel(s), tiles: lap.tiles.length, seconds: Math.round(lap.rows / s.speed), fruit: fruitOf(lap.tiles[0].note) }];
  })
);
const LEVELS = ['쉬움', '보통', '어려움'] as const;
const LEVEL_CHIP: Record<string, string> = { 쉬움: 'bg-melon text-on-bright', 보통: 'bg-mango text-on-bright', 어려움: 'bg-berry-deep text-white' };

/** The chosen song on the start card; tapping it opens the list */
const SongButton: React.FC<{ song: Song; locked: boolean; onClick: () => void }> = ({ song, locked, onClick }) => {
  const info = SONG_INFO.get(song.id)!;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      aria-label={`곡: ${song.name}. 다른 곡 고르기`}
      className="flex w-full items-center gap-2.5 rounded-2xl border-2 border-line bg-surface-2 p-2 text-left transition-colors hover:bg-surface-3 disabled:cursor-default disabled:hover:bg-surface-2"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-line bg-peach-soft text-2xl" aria-hidden="true">
        <Emoji e={info.fruit} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{song.name}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-ink-3">
          <span className={`chip h-5 shrink-0 px-1.5 text-[10px] ${LEVEL_CHIP[info.level]}`}>{info.level}</span>
          <span className="truncate">{song.by}</span>
        </span>
      </span>
      {!locked && (
        <span className="chip h-7 shrink-0 bg-surface pl-2 pr-1 text-xs">
          바꾸기 <ChevronRight className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
};

/** Every song, by difficulty */
const SongList: React.FC<{ current: string; onPick: (id: string) => void; onClose: () => void }> = ({ current, onPick, onClose }) => (
  <div className="panel w-full max-w-[360px] p-4 animate-pop-in">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="font-display text-2xl">🎵 곡 고르기</h2>
      <button type="button" className="btn btn-icon btn-sm" onClick={onClose} aria-label="닫기">
        <X className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
    <div className="space-y-3">
      {LEVELS.map((level) => {
        const songs = SONGS.filter((s) => SONG_INFO.get(s.id)!.level === level);
        if (!songs.length) return null;
        return (
          <section key={level}>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-ink-2">
              <span className={`chip h-5 px-1.5 text-[10px] ${LEVEL_CHIP[level]}`}>{level}</span> {songs.length}곡
            </p>
            <ul className="space-y-1.5">
              {songs.map((s) => {
                const info = SONG_INFO.get(s.id)!;
                const on = s.id === current;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => onPick(s.id)}
                      className={`flex w-full items-center gap-2.5 rounded-xl border-2 border-line p-2 text-left transition-all ${
                        on ? '-translate-y-0.5 bg-peach-soft shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'
                      }`}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 border-line bg-surface text-lg" aria-hidden="true">
                        <Emoji e={info.fruit} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{s.name}</span>
                        <span className="block truncate text-[11px] text-ink-3">
                          {s.by} · {s.tempo} · 타일 {info.tiles}개 · 한 바퀴 {info.seconds}초
                        </span>
                      </span>
                      {on && <Check className="h-5 w-5 shrink-0 text-peach-ink" strokeWidth={3} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  </div>
);

type EndCause = 'wrong' | 'miss';

/** A tile on the board: rows from the start of the round, lane, and whether it ends a lap */
interface BoardTile {
  row: number;
  len: number;
  note: number;
  sound: number;
  lane: number;
  lapEnd: boolean;
}

/** A long tile being held: by which finger (or key), from where, and how far it got */
interface Hold {
  tile: number;
  by: string;
  from: number;
  rows: number;
  note: { release: () => void };
}

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
  const songIdRef = useRef(songId);

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'OVER'>('IDLE');
  const [score, setScore] = useState(0);
  const [laps, setLaps] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState<EndCause | null>(null);
  const [reward, setReward] = useState<GameReward | null>(null);
  /** The song list is open (instead of the start card) */
  const [picking, setPicking] = useState(false);

  // Mutable round state for the animation loop and taps
  const rngRef = useRef<Rng>(Math.random);
  /** The song this round plays, and one lap of it */
  const roundSongRef = useRef<Song>(song);
  const lapRef = useRef<Lap>({ rows: 0, tiles: [], left: [] });
  /** Every tile laid out so far, and the left hand's notes for every row */
  const tilesRef = useRef<BoardTile[]>([]);
  const leftRef = useRef<number[][]>([]);
  /** Tile index → when it was played (performance.now) */
  const playedRef = useRef<Map<number, number>>(new Map());
  /** The lowest tile still to play */
  const nextRef = useRef(0);
  const holdRef = useRef<Hold | null>(null);
  /** Left-hand notes waiting for their moment (performance.now) */
  const pendingRef = useRef<{ at: number; notes: number[] }[]>([]);
  const posRef = useRef(START_POS);
  const startedRef = useRef(false);
  const lapsRef = useRef(0);
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
      holdRef.current?.note.release();
    },
    []
  );

  // A pause lets go of a long tile and drops the waiting left-hand notes
  useEffect(() => {
    if (!isPaused) return;
    pendingRef.current = [];
    holdRef.current?.note.release();
    holdRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused]);

  /** Lay out laps of the song until there are at least `count` rows; a tile never repeats the last tile's lane */
  const growRows = (count: number) => {
    const tiles = tilesRef.current;
    const left = leftRef.current;
    const lap = lapRef.current;
    while (left.length < count) {
      const base = left.length;
      let last = tiles.length ? tiles[tiles.length - 1].lane : -1;
      lap.tiles.forEach((t, i) => {
        let lane = Math.floor(rngRef.current() * (last < 0 ? LANES : LANES - 1));
        if (last >= 0 && lane >= last) lane++;
        last = lane;
        tiles.push({ ...t, row: base + t.row, lane, lapEnd: i === lap.tiles.length - 1 });
      });
      left.push(...lap.left);
    }
  };

  const speedNow = () => Math.min(MAX_SPEED, roundSongRef.current.speed * (1 + LAP_SPEEDUP * lapsRef.current) + RAMP * scoreRef.current);

  const addScore = (points: number) => {
    scoreRef.current += points;
    setScore(scoreRef.current);
  };

  // Dev server only (compiled out of real builds): lets browser tests play the tiles
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__pianoTest = {
      next: () => {
        const t = tilesRef.current[nextRef.current];
        return { row: t?.row, lane: t?.lane, len: t?.len, pos: posRef.current, holding: !!holdRef.current };
      },
      end: () => endRef.current,
      score: () => scoreRef.current,
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
    const chosen = challengeSong ?? songById(songIdRef.current) ?? SONGS[0];
    const roundSeed = seed ?? `${chosen.id}.${randomSeed()}`;
    rngRef.current = seededRandom(roundSeed);
    onRoundSeed?.(roundSeed);
    holdRef.current?.note.release();
    roundSongRef.current = chosen;
    lapRef.current = songLap(chosen);
    tilesRef.current = [];
    leftRef.current = [];
    playedRef.current = new Map();
    pendingRef.current = [];
    holdRef.current = null;
    nextRef.current = 0;
    posRef.current = START_POS;
    startedRef.current = false;
    lapsRef.current = 0;
    scoreRef.current = 0;
    timeRef.current = 0;
    endRef.current = null;
    bitsRef.current = [];
    floatsRef.current = [];
    growRows(lapRef.current.rows * 2);

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
    songIdRef.current = id;
    setSongId(id);
    try {
      localStorage.setItem(SONG_KEY, id);
    } catch {
      // ignore
    }
  };

  /** Stop the round and open the song list (a pick starts the next round) */
  const chooseAgain = () => {
    isPlayingRef.current = false;
    holdRef.current?.note.release();
    holdRef.current = null;
    pendingRef.current = [];
    endRef.current = null;
    setEnding(null);
    setPicking(!challengeSong);
    setGameState('IDLE');
  };

  const finishRound = useCallback((cause: EndCause) => {
    const { settings: s, onUnlockAchieve: unlock, onGameComplete: complete } = live.current;
    setEnding(cause);
    setElapsed(timeRef.current);
    setGameState('OVER');
    playSound('over', s);
    if (scoreRef.current >= 200) unlock('piano_200');
    const r = complete({ game: 'piano', score: scoreRef.current, seconds: timeRef.current, won: lapsRef.current >= 1 });
    setReward(r);
    if (r.newBest && s.celebrateEffect) celebrate();
  }, []);

  /** A wrong tap or a missed tile: show it for a moment, then the result */
  const fail = (cause: EndCause, row: number, lane: number) => {
    if (endRef.current) return;
    endRef.current = { cause, row, lane, at: performance.now() };
    isPlayingRef.current = false;
    pendingRef.current = [];
    holdRef.current?.note.release();
    holdRef.current = null;
    playSound('wrong', live.current.settings);
    vibrate(HAPTIC.wrong, live.current.settings);
  };

  /** Fruit bits fly out of a tile's bottom row */
  const burst = (tile: BoardTile, count: number) => {
    const s = live.current.settings;
    if (!s.animEnabled) return;
    const x = tile.lane * LW + LW / 2;
    const y = CH - (tile.row + 0.5 - posRef.current) * RH;
    const emoji = skinPiece(s.suikaSkin, PIANO_FRUITS, fruitOf(tile.note));
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const v = 3 + Math.random() * 3;
      bitsRef.current.push({ emoji, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, life: 0 });
    }
  };

  /** A long tile let go (or held to its top): no more points; its note rings out its length */
  const endHold = () => {
    holdRef.current = null;
  };

  const hit = (index: number, by: string) => {
    const s = live.current.settings;
    const tile = tilesRef.current[index];
    const v = speedNow();
    playedRef.current.set(index, performance.now());
    if (holdRef.current) endHold();
    const note = playNote(tile.note, s, { sustain: tile.sound / v });
    if (tile.len > 1) holdRef.current = { tile: index, by, from: posRef.current, rows: 0, note };
    vibrate(HAPTIC.tap, s);
    startedRef.current = true;
    addScore(1);
    burst(tile, 4);

    // More song further up, and the next tile
    if (leftRef.current.length < tile.row + tile.len + 32) growRows(tile.row + tile.len + 32 + lapRef.current.rows);
    nextRef.current = index + 1;

    // The left hand plays this tile's rows and the empty ones after it, in time
    const now = performance.now();
    const until = tilesRef.current[index + 1].row;
    pendingRef.current = [];
    playLeft(leftRef.current[tile.row]);
    for (let r = tile.row + 1; r < until; r++) if (leftRef.current[r].length) pendingRef.current.push({ at: now + ((r - tile.row) / v) * 1000, notes: leftRef.current[r] });

    if (tile.lapEnd) {
      lapsRef.current += 1;
      setLaps(lapsRef.current);
      floatsRef.current.push({ text: `🎉 ${lapsRef.current}바퀴 완주! 더 빨라져요`, life: 0 });
      playSound('levelup', s);
      if (lapsRef.current === 1) live.current.onUnlockAchieve('piano_song');
      if (lapsRef.current === 3) live.current.onUnlockAchieve('piano_lap_3');
    }
    setSpeed(speedNow() / roundSongRef.current.speed);
  };

  const playLeft = (notes: number[]) => {
    const s = live.current.settings;
    const gain = LEFT_GAIN / Math.sqrt(Math.max(1, notes.length));
    for (const n of notes) playNote(n, s, { gain, sustain: 0.35 });
  };

  /** A press on a lane (row null = a key, which always means the next tile) */
  const press = (lane: number, row: number | null, by: string) => {
    if (gameStateRef.current !== 'PLAYING' || isPausedRef.current || endRef.current) return;
    const next = nextRef.current;
    const t = tilesRef.current[next];
    if (row === null) {
      if (lane === t.lane) hit(next, by);
      else if (startedRef.current) fail('wrong', t.row, lane);
      return;
    }
    // A little slack: a fast tile is often caught just below it or just above
    if (lane === t.lane && row >= t.row - 1 && row <= t.row + t.len) return hit(next, by);
    if (!startedRef.current) return;
    // Tiles further up, the long tile being held, and played ones don't count as a wrong press
    for (let i = Math.max(0, next - 3); i < next + 8; i++) {
      const o = tilesRef.current[i];
      if (o && o.lane === lane && row >= o.row && row < o.row + o.len) return;
    }
    fail('wrong', row, lane);
  };

  const letGo = (by: string) => {
    if (holdRef.current?.by === by) endHold();
  };

  // Keys: D F J K for the lanes (hold a key for a long tile), Space / Enter from the start card
  const pressRef = useRef(press);
  pressRef.current = press;
  const letGoRef = useRef(letGo);
  letGoRef.current = letGo;
  const startRef = useRef(handleStartGame);
  startRef.current = handleStartGame;
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (isPausedRef.current || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code in KEYS && gameStateRef.current === 'PLAYING') {
        e.preventDefault();
        if (!e.repeat) pressRef.current(KEYS[e.code], null, e.code);
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
    const onUp = (e: KeyboardEvent) => {
      if (e.code in KEYS) letGoRef.current(e.code);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
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

    const tileRect = (t: BoardTile) => ({
      x: t.lane * LW + 5,
      y: CH - (t.row + t.len - posRef.current) * RH + 5,
      w: LW - 10,
      h: t.len * RH - 10,
    });

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
      const now = performance.now();

      if (!paused) {
        if (isPlayingRef.current && startedRef.current && !end) {
          posRef.current += speedNow() * dt;
          // The next tile slid off the bottom
          const t = tilesRef.current[nextRef.current];
          if (posRef.current >= t.row + 1) fail('miss', t.row, t.lane);
        }

        // A long tile: a point for every row it is held, done at its top
        const h = holdRef.current;
        if (h && !endRef.current) {
          const tile = tilesRef.current[h.tile];
          const rows = Math.min(tile.len - 1, Math.floor(posRef.current - h.from));
          if (rows > h.rows) {
            addScore(rows - h.rows);
            h.rows = rows;
            if (rows >= tile.len - 1) {
              burst(tile, 6);
              endHold();
            }
          }
        }

        // Left-hand notes whose time has come
        while (pendingRef.current.length && pendingRef.current[0].at <= now) playLeft(pendingRef.current.shift()!.notes);

        // A missed tile: the board slides back so it shows
        if (end?.cause === 'miss') posRef.current += (end.row - 0.6 - posRef.current) * Math.min(1, dt * 10);
        if (end && gameStateRef.current === 'PLAYING' && now - end.at > END_MS) finishRound(end.cause);

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

      const blink = end ? Math.floor((now - end.at) / 140) % 2 === 0 : false;
      const skin = live.current.settings.suikaSkin;
      const pos = posRef.current;
      const hold = holdRef.current;
      for (let i = Math.max(0, nextRef.current - 6); i < tilesRef.current.length; i++) {
        const t = tilesRef.current[i];
        if (t.row > pos + 5) break;
        if (t.row + t.len < pos - 1) continue;
        const r = tileRect(t);
        const fruit = fruitOf(t.note);
        const emoji = skinPiece(skin, PIANO_FRUITS, fruit);
        const color = TILE[fruit];
        const playedAt = playedRef.current.get(i);
        const held = hold?.tile === i;

        if (playedAt !== undefined && !held) {
          // Played: a faint print of the tile, with the fruit popping away
          ctx.fillStyle = P.done;
          roundRect(r.x, r.y, r.w, r.h, 18);
          ctx.fill();
          const k = Math.min(1, (now - playedAt) / 220);
          if (k < 1) {
            ctx.save();
            ctx.globalAlpha = 1 - k;
            drawEmoji(ctx, emoji, r.x + r.w / 2, r.y + r.h - RH / 2 + 5, 56 * (1 + k * 0.6));
            ctx.restore();
          }
          continue;
        }

        const missed = end?.cause === 'miss' && end.row === t.row;
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

        if (t.len > 1) {
          // Long tile: diagonal stripes, an arrowed track up the middle and a "꾹" label, so it
          // never passes for a tap tile; the track fills and the tile glows while it's held
          const cx = r.x + r.w / 2;
          ctx.save();
          roundRect(r.x, r.y, r.w, r.h, 18);
          ctx.clip();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
          ctx.lineWidth = 10;
          for (let k = 0; k < r.w + r.h; k += 28) {
            ctx.beginPath();
            ctx.moveTo(r.x + k, r.y);
            ctx.lineTo(r.x + k - r.h, r.y + r.h);
            ctx.stroke();
          }
          ctx.restore();

          const trackTop = r.y + 18;
          const trackBottom = r.y + r.h - RH / 2 - 40;
          const tw = 24;
          const fill = held ? Math.min(1, (pos - hold!.from) / (t.len - 1)) : 0;
          if (held) {
            ctx.save();
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 24;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            roundRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 16);
            ctx.stroke();
            ctx.restore();
          }
          if (trackBottom > trackTop) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.strokeStyle = P.outline;
            ctx.lineWidth = 2.5;
            roundRect(cx - tw / 2, trackTop, tw, trackBottom - trackTop, tw / 2);
            ctx.fill();
            ctx.stroke();
            if (fill > 0) {
              const top = trackBottom - (trackBottom - trackTop) * fill;
              ctx.fillStyle = '#ffffff';
              roundRect(cx - tw / 2 + 2, top, tw - 4, trackBottom - top, tw / 2 - 2);
              ctx.fill();
            }
            // Arrows: keep pressing upwards
            ctx.fillStyle = color.deep;
            for (let ay = trackBottom - 16; ay > trackTop + 10; ay -= 30) {
              ctx.beginPath();
              ctx.moveTo(cx - 7, ay + 5);
              ctx.lineTo(cx, ay - 5);
              ctx.lineTo(cx + 7, ay + 5);
              ctx.closePath();
              ctx.fill();
            }
          }
          if (!held) {
            const label = i === 0 && !startedRef.current ? '꾹 눌러 시작' : '꾹 누르기';
            ctx.font = '700 15px Fredoka, Jua, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const lw = ctx.measureText(label).width + 18;
            const ly = r.y + r.h - 28;
            ctx.fillStyle = P.outline;
            roundRect(cx - lw / 2, ly - 11, lw, 22, 11);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, cx, ly + 1);
          }
        }
        // The fruit sits on a white plate, so any skin stands out from any tile colour
        const cy = r.y + r.h - RH / 2 - 1;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.strokeStyle = color.deep;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x + r.w / 2, cy, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        drawEmoji(ctx, emoji, r.x + r.w / 2, cy, 50);

        if (i === 0 && !startedRef.current && t.len === 1) {
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

      // A wrong press lights up the empty spot
      if (end?.cause === 'wrong' && blink) {
        ctx.fillStyle = 'rgba(255, 59, 48, 0.85)';
        roundRect(end.lane * LW + 5, CH - (end.row + 1 - pos) * RH + 5, LW - 10, RH - 10, 18);
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

  // ───────── presses (every finger counts; lifting one lets go of its long tile) ─────────

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameStateRef.current !== 'PLAYING') return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CW / rect.width);
    const y = (e.clientY - rect.top) * (CH / rect.height);
    const lane = Math.max(0, Math.min(LANES - 1, Math.floor(x / LW)));
    press(lane, Math.floor(posRef.current + (CH - y) / RH), `p${e.pointerId}`);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => letGo(`p${e.pointerId}`);

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
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="block h-full w-full cursor-pointer touch-none select-none"
              />
              {gameState === 'IDLE' && (
                <BoardOverlay>
                  {picking ? (
                    <SongList
                      current={playing.id}
                      onPick={(id) => {
                        pickSong(id);
                        setPicking(false);
                        handleStartGame();
                      }}
                      onClose={() => setPicking(false)}
                    />
                  ) : (
                    <StartCard meta={GAMES.piano} best={best} onStart={handleStartGame} onHelp={onHelp}>
                      <SongButton song={playing} locked={!!challengeSong} onClick={() => setPicking(true)} />
                    </StartCard>
                  )}
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
                  긴 타일은 <b>끝까지 꾹</b> 누르면 점수가 더 올라요
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-grape-soft text-base shadow-none" aria-hidden="true">
                  🎹
                </span>
                <span>
                  <b>{playing.name}</b>
                  {josa(playing.name, '이', '가')} 왼손 반주와 함께 연주돼요
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sticker h-8 w-8 shrink-0 bg-soda-soft text-base shadow-none" aria-hidden="true">
                  ⚠️
                </span>
                <span>
                  빈 칸을 누르거나 타일을 <b>놓치면 끝</b> · 완주하면 더 빨라져요
                </span>
              </li>
            </ul>
            <p className="flex min-w-0 items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-xs">
              <span aria-hidden="true">🎵</span>
              <b className="truncate">{playing.name}</b>
              <span className="shrink-0 text-ink-3">{playing.by}</span>
            </p>
            <div className="flex items-center justify-between gap-2">
              <p className="hidden text-xs text-ink-3 sm:block short:hidden">터치 · 키보드 D F J K</p>
              <button
                type="button"
                className="btn btn-sm ml-auto"
                onClick={(e) => {
                  e.currentTarget.blur();
                  chooseAgain();
                }}
                disabled={gameState === 'IDLE'}
              >
                <RotateCcw className="h-4 w-4" strokeWidth={2.5} /> 곡 고르고 다시 시작
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
            extraAction={
              challengeSong
                ? undefined
                : {
                    label: '🎵 다른 곡 고르기',
                    onClick: chooseAgain,
                  }
            }
          />
        </ScreenOverlay>
      )}
    </>
  );
};
