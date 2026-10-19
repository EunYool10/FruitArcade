import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Lightbulb, RotateCcw } from 'lucide-react';
import { GameResult, GameReward, GameSettings } from '../../types';
import { GAMES } from '../../constants';
import { playSound } from '../../utils/audio';
import { HAPTIC, vibrate } from '../../utils/haptics';
import { celebrate } from '../../utils/fx';
import { formatNumber, formatTime } from '../../utils/format';
import { Rng, randomSeed, seededRandom } from '../../utils/rng';
import { BoardOverlay, GameFrame, Hud, HudStat, ScreenOverlay } from '../game/GameFrame';
import { StartCard } from '../game/StartCard';
import { ResultCard, appUrl } from '../game/ResultCard';
import { Segmented } from '../ui/Segmented';
import { STAGES, STAGE_COUNT, Stage, StageProgress, goalProgress, goalTarget, goalText, isUnlocked, nextStage, starsFor } from './stages';
import {
  CLASSIC_MOVES,
  FRUIT,
  FRUIT_COLOR,
  FRUIT_NAME,
  Grid,
  H,
  W,
  adjacent,
  clearStep,
  collapse,
  findMove,
  findRuns,
  generate,
  idx,
  pos,
  reshuffle,
  stepPoints,
  swapped,
} from './engine';
import { Emoji } from '../ui/Emoji';

const SWAP_MS = 170;
const POP_MS = 220;
const FALL_MS = 300;
const HINT_AFTER_MS = 7000;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SPECIAL_BADGE = { row: '↔', col: '↕', bomb: '💥' } as const;

interface Props {
  settings: GameSettings;
  best: number;
  isPaused: boolean;
  autoStart?: boolean;
  /** Same seed → same boards and refills (challenge links) */
  seed?: string;
  onUnlockAchieve: (id: string) => void;
  onGameComplete: (result: GameResult) => GameReward;
  onRoundChange: (active: boolean) => void;
  onExit: () => void;
  onHelp?: () => void;
  onRoundSeed?: (seed: string) => void;
  /** Best stars per stage (stage mode) */
  stageProgress?: StageProgress;
  onStageClear?: (no: number, stars: number) => void;
}

export const PuzzleGame: React.FC<Props> = ({
  settings,
  best,
  isPaused,
  autoStart = false,
  seed,
  onUnlockAchieve,
  onGameComplete,
  onRoundChange,
  onExit,
  onHelp,
  onRoundSeed,
  stageProgress = {},
  onStageClear,
}) => {
  const rngRef = useRef<Rng>(seededRandom(randomSeed()));
  const [grid, setGrid] = useState<Grid>(() => generate(rngRef.current));
  const gridRef = useRef(grid);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'OVER'>('IDLE');
  const [selected, setSelected] = useState<number | null>(null);
  const [popping, setPopping] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(CLASSIC_MOVES);
  const [maxCombo, setMaxCombo] = useState(0);
  const [specials, setSpecials] = useState(0);
  const [popped, setPopped] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [banner, setBanner] = useState<{ id: number; text: string } | null>(null);
  const [reward, setReward] = useState<GameReward | null>(null);

  // Stage mode: the stage being played, progress toward its goal, and how it ended
  const [mode, setMode] = useState<'classic' | 'stage'>('classic');
  const [stage, setStage] = useState<Stage | null>(null);
  const stageRef = useRef<Stage | null>(null);
  const [goalValue, setGoalValue] = useState(0);
  const goalRef = useRef(0);
  const [outcome, setOutcome] = useState<{ won: boolean; stars: number } | null>(null);
  const outcomeRef = useRef<{ won: boolean; stars: number } | null>(null);

  const scoreRef = useRef(0);
  const movesRef = useRef(CLASSIC_MOVES);
  // Classic rounds keep their seed and swaps so the score server can replay them
  const replayRef = useRef<{ seed: string; moves: [number, number][] } | null>(null);
  const aliveRef = useRef(true);
  const lastActionRef = useRef(Date.now());
  const dragRef = useRef<{ i: number; x: number; y: number } | null>(null);
  const live = useRef({ settings, isPaused, onUnlockAchieve });
  live.current = { settings, isPaused, onUnlockAchieve };

  const commit = (g: Grid) => {
    gridRef.current = g;
    setGrid(g);
  };

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    onRoundChange(gameState === 'PLAYING');
  }, [gameState, onRoundChange]);

  // Report the finished round once
  useEffect(() => {
    if (gameState !== 'OVER') return;
    const st = stageRef.current;
    const out = outcomeRef.current;
    if (!st && scoreRef.current >= 3000) onUnlockAchieve('puzzle_3000');
    if (st && out?.won) {
      onStageClear?.(st.no, out.stars);
      if (st.no >= 10) onUnlockAchieve('puzzle_stage_10');
      if (st.no >= STAGE_COUNT) onUnlockAchieve('puzzle_stage_all');
    }
    const r = onGameComplete({
      game: 'puzzle',
      score: scoreRef.current,
      seconds: elapsed,
      ...(st ? { stage: st.no, won: !!out?.won } : replayRef.current ? { replay: replayRef.current } : {}),
    });
    setReward(r);
    if (r.newBest && settings.celebrateEffect) celebrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // Play time
  useEffect(() => {
    if (gameState !== 'PLAYING' || isPaused) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [gameState, isPaused]);

  // Show a possible move after a while without input
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const t = setInterval(() => {
      if (!live.current.isPaused && Date.now() - lastActionRef.current > HINT_AFTER_MS) setHint(findMove(gridRef.current));
    }, 1000);
    return () => clearInterval(t);
  }, [gameState]);

  const flash = (text: string) => {
    const id = Date.now();
    setBanner({ id, text });
    setTimeout(() => setBanner((b) => (b?.id === id ? null : b)), 900);
  };

  /** null = classic (30 moves, leaderboard); a stage = its own moves and goal */
  const handleStartGame = (st: Stage | null = null) => {
    const s = st ? randomSeed() : seed ?? randomSeed();
    rngRef.current = seededRandom(s);
    if (!st) onRoundSeed?.(s);
    stageRef.current = st;
    setStage(st);
    replayRef.current = st ? null : { seed: s, moves: [] };
    goalRef.current = 0;
    setGoalValue(0);
    outcomeRef.current = null;
    setOutcome(null);
    const total = st ? st.moves : CLASSIC_MOVES;
    commit(generate(rngRef.current));
    scoreRef.current = 0;
    movesRef.current = total;
    setScore(0);
    setMoves(total);
    setMaxCombo(0);
    setSpecials(0);
    setPopped(0);
    setElapsed(0);
    setSelected(null);
    setHint(null);
    setReward(null);
    setBusy(false);
    lastActionRef.current = Date.now();
    setGameState('PLAYING');
    playSound('click', settings);
  };

  useEffect(() => {
    if (autoStart) handleStartGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Clear matches, drop fruit, repeat until the board settles */
  const resolve = async (start: Grid, focus: number[]) => {
    let g = start;
    let cascade = 0;
    for (let step = clearStep(g, focus); step; step = clearStep(g, [])) {
      cascade++;
      const { settings: s } = live.current;
      setPopping(new Set(step.cleared.map((c) => g[c]!.id)));
      playSound(cascade > 1 ? 'combo' : 'match', s);
      vibrate(HAPTIC.match, s);
      if (step.bombs || step.lines) playSound('merge', s, { level: 7 });
      if (cascade >= 2) flash(`${cascade}연쇄! 🔥`);
      if (step.created.some((c) => c.special === 'bomb')) live.current.onUnlockAchieve('puzzle_bomb');
      if (cascade >= 5) live.current.onUnlockAchieve('puzzle_combo_5');

      const gained = stepPoints(step, cascade);
      scoreRef.current += gained;
      setScore(scoreRef.current);
      setPopped((p) => p + step.cleared.length);
      const st = stageRef.current;
      if (st) {
        const goal = st.goal;
        if (goal.type === 'collect') goalRef.current += step.cleared.filter((c) => g[c]?.kind === goal.kind).length;
        else if (goal.type === 'specials') goalRef.current += step.created.length;
        else if (goal.type === 'combo') goalRef.current = Math.max(goalRef.current, cascade);
        setGoalValue(goal.type === 'score' ? scoreRef.current : goalRef.current);
      }
      setSpecials((n) => n + step.created.length);
      setMaxCombo((m) => Math.max(m, cascade));

      await wait(POP_MS);
      if (!aliveRef.current) return;
      setPopping(new Set());
      g = collapse(step.grid, rngRef.current);
      commit(g);
      await wait(FALL_MS);
      if (!aliveRef.current) return;
    }

    if (!findMove(g)) {
      flash('섞는 중… 🔀');
      await wait(450);
      g = reshuffle(g, rngRef.current);
      commit(g);
      await wait(FALL_MS);
    }
    if (!aliveRef.current) return;
    const st = stageRef.current;
    if (st) {
      const value = st.goal.type === 'score' ? scoreRef.current : goalRef.current;
      if (value >= goalTarget(st.goal)) {
        outcomeRef.current = { won: true, stars: starsFor(st, movesRef.current) };
        setOutcome(outcomeRef.current);
        playSound('victory', live.current.settings);
        setGameState('OVER');
        return;
      }
    }
    if (movesRef.current <= 0) {
      if (st) {
        outcomeRef.current = { won: false, stars: 0 };
        setOutcome(outcomeRef.current);
        playSound('over', live.current.settings);
      } else {
        playSound('victory', live.current.settings);
      }
      setGameState('OVER');
    }
  };

  const trySwap = useCallback(
    async (a: number, b: number) => {
      if (busy || gameState !== 'PLAYING' || live.current.isPaused || !adjacent(a, b)) return;
      lastActionRef.current = Date.now();
      setSelected(null);
      setHint(null);
      setBusy(true);
      const before = gridRef.current;
      const after = swapped(before, a, b);
      commit(after);
      playSound('flip', live.current.settings);
      await wait(SWAP_MS);
      if (!aliveRef.current) return;

      if (!findRuns(after).length) {
        commit(before);
        playSound('wrong', live.current.settings);
        vibrate(HAPTIC.wrong, live.current.settings);
        await wait(SWAP_MS);
        setBusy(false);
        return;
      }

      movesRef.current -= 1;
      setMoves(movesRef.current);
      replayRef.current?.moves.push([a, b]);
      await resolve(after, [a, b]);
      if (aliveRef.current) setBusy(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, gameState]
  );

  const tap = (i: number) => {
    if (busy || gameState !== 'PLAYING' || isPaused) return;
    lastActionRef.current = Date.now();
    if (selected === null || selected === i) setSelected(selected === i ? null : i);
    else if (adjacent(selected, i)) trySwap(selected, i);
    else setSelected(i);
  };

  const onPointerDown = (i: number, e: React.PointerEvent) => {
    if (busy || gameState !== 'PLAYING') return;
    dragRef.current = { i, x: e.clientX, y: e.clientY };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
    dragRef.current = null;
    const { x, y } = pos(d.i);
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const tx = x + (horizontal ? Math.sign(dx) : 0);
    const ty = y + (horizontal ? 0 : Math.sign(dy));
    if (tx >= 0 && tx < W && ty >= 0 && ty < H) trySwap(d.i, idx(tx, ty));
  };
  const onPointerUp = () => {
    if (dragRef.current) tap(dragRef.current.i);
    dragRef.current = null;
  };

  const onKey = (i: number, e: React.KeyboardEvent) => {
    const dir: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const d = dir[e.key];
    if (!d) return;
    e.preventDefault();
    const { x, y } = pos(i);
    const tx = x + d[0];
    const ty = y + d[1];
    if (tx < 0 || tx >= W || ty < 0 || ty >= H) return;
    if (selected === i) trySwap(i, idx(tx, ty));
    else (document.querySelector(`[data-cell="${idx(tx, ty)}"]`) as HTMLElement | null)?.focus();
  };

  const showHint = () => {
    lastActionRef.current = Date.now();
    setHint(findMove(gridRef.current));
    playSound('click', settings);
  };

  return (
    <>
      <GameFrame
        hud={
          <Hud>
            <HudStat label="점수" value={formatNumber(score)} />
            <HudStat label="남은 이동" value={moves} tone={gameState === 'PLAYING' && moves <= 5 ? 'warn' : 'default'} />
            {stage ? (
              <>
                <HudStat
                  label="목표"
                  value={goalProgress(stage.goal, goalValue)}
                  tone={goalValue >= goalTarget(stage.goal) ? 'hot' : 'default'}
                />
                <HudStat label="스테이지" value={stage.no} />
              </>
            ) : (
              <>
                <HudStat label="최대 연쇄" value={maxCombo > 1 ? `${maxCombo}🔥` : '–'} tone={maxCombo >= 3 ? 'hot' : 'default'} />
                <HudStat label="최고" value={formatNumber(Math.max(best, score))} tone={best > 0 && score > best ? 'hot' : 'default'} />
              </>
            )}
          </Hud>
        }
        board={
          <div className="board-fit w-full" style={{ maxWidth: 'calc(100dvh - var(--board-offset))' }}>
            <div className="relative aspect-square w-full touch-none rounded-[26px] border-2 border-line bg-surface-2 p-1.5 shadow-pop sm:p-2.5">
              <div className="relative h-full w-full overflow-hidden rounded-[18px]" role="grid" aria-label="과일 퍼즐 판" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
                {grid.map((t, i) => {
                  if (!t) return null;
                  const { x, y } = pos(i);
                  const isSel = selected === i;
                  const isHint = !!hint && (hint[0] === i || hint[1] === i);
                  const isPop = popping.has(t.id);
                  return (
                    <div
                      key={t.id}
                      className="absolute left-0 top-0 p-[2px] transition-transform duration-200 ease-out sm:p-1"
                      style={{ width: `${100 / W}%`, height: `${100 / H}%`, transform: `translate(${x * 100}%, ${y * 100}%)` }}
                    >
                      <button
                        type="button"
                        data-cell={i}
                        aria-label={`${y + 1}행 ${x + 1}열 ${FRUIT_NAME[t.kind]}${t.special ? ' 특수 과일' : ''}`}
                        aria-pressed={isSel}
                        onPointerDown={(e) => onPointerDown(i, e)}
                        onClick={(e) => e.detail === 0 && tap(i)}
                        onKeyDown={(e) => onKey(i, e)}
                        className={`relative grid h-full w-full place-items-center rounded-xl border-2 border-line leading-none transition-[transform,opacity] duration-200 ${
                          t.drop ? 'animate-tile-drop' : t.special ? 'animate-pop-in' : ''
                        } ${isPop ? 'scale-0 opacity-0' : ''} ${isSel ? 'z-10 scale-110 shadow-hard ring-4 ring-soda' : ''} ${
                          isHint && !isSel ? 'animate-wiggle' : ''
                        } ${t.special ? 'shadow-[0_0_0_3px_var(--mango)]' : ''}`}
                        style={
                          {
                            '--from': `${-t.drop * 100}%`,
                            backgroundColor: `color-mix(in srgb, ${FRUIT_COLOR[t.kind]} 30%, var(--surface))`,
                          } as React.CSSProperties
                        }
                      >
                        <span className="text-[clamp(20px,6.6vw,30px)] lg:text-[44px]">
                          <Emoji e={FRUIT[t.kind]} />
                        </span>
                        {t.special && (
                          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-line bg-mango text-[10px] font-black text-on-bright sm:h-6 sm:w-6 sm:text-xs">
                            {SPECIAL_BADGE[t.special]}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {banner && (
                <div key={banner.id} className="pointer-events-none absolute inset-x-0 top-1/3 z-20 flex justify-center">
                  <span className="chip animate-pop-in bg-mango px-4 py-1.5 font-display text-xl text-on-bright shadow-hard">{banner.text}</span>
                </div>
              )}

              {gameState === 'IDLE' && (
                <BoardOverlay>
                  <StartCard
                    meta={GAMES.puzzle}
                    best={best}
                    onStart={() => handleStartGame(mode === 'stage' ? STAGES[nextStage(stageProgress) - 1] : null)}
                    onHelp={onHelp}
                  >
                    {!seed && (
                      <>
                        <Segmented<'classic' | 'stage'>
                          ariaLabel="모드"
                          columns={2}
                          value={mode}
                          onChange={setMode}
                          options={[
                            { value: 'classic', label: '클래식', sub: '30번 · 랭킹' },
                            { value: 'stage', label: '스테이지', sub: `${Object.keys(stageProgress).length}/${STAGE_COUNT} 클리어` },
                          ]}
                        />
                        {mode === 'stage' && (
                          <div className="mt-2.5 grid max-h-40 grid-cols-6 gap-1.5 overflow-y-auto p-0.5" role="group" aria-label="스테이지 고르기">
                            {STAGES.map((st) => {
                              const stars = stageProgress[st.no] || 0;
                              const open = isUnlocked(stageProgress, st.no);
                              return (
                                <button
                                  key={st.no}
                                  type="button"
                                  disabled={!open}
                                  onClick={() => handleStartGame(st)}
                                  aria-label={`스테이지 ${st.no}${stars ? ` 별 ${stars}개` : ''}${open ? '' : ' 잠김'}`}
                                  className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-line ${
                                    stars ? 'bg-grape-soft' : open ? 'bg-surface hover:bg-surface-3' : 'bg-surface-3 opacity-50'
                                  }`}
                                >
                                  <span className="font-display text-sm leading-none">{open ? st.no : '🔒'}</span>
                                  <span className="h-2 text-[8px] leading-none text-mango-ink">{'★'.repeat(stars)}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </StartCard>
                </BoardOverlay>
              )}
            </div>
          </div>
        }
        panel={
          <div className="panel space-y-3 p-4">
            {stage && gameState === 'PLAYING' && (
              <div className="rounded-2xl border-2 border-line bg-grape-soft p-3">
                <p className="text-[11px] font-bold text-ink-3">스테이지 {stage.no} 목표</p>
                <p className="font-display text-lg leading-tight">{goalText(stage.goal)}</p>
                <p className="mt-0.5 text-xs text-ink-2">이동 {stage.moves}번 안에 · 남은 이동이 많을수록 별이 많아요</p>
              </div>
            )}
            <h3 className="font-display text-lg">특수 과일</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-line bg-mango font-black text-on-bright">↔</span>
                <span>
                  4개 맞추기 → <b>줄 폭탄</b> (한 줄 지우기)
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-line bg-mango">💥</span>
                <span>
                  5개 · ㄱ자 맞추기 → <b>큰 폭탄</b> (주변 9칸)
                </span>
              </li>
            </ul>
            <div className="flex gap-2">
              <button type="button" className="btn btn-sm flex-1" onClick={showHint} disabled={gameState !== 'PLAYING' || busy}>
                <Lightbulb className="h-4 w-4" strokeWidth={2.5} /> 힌트
              </button>
              <button
                type="button"
                className="btn btn-sm flex-1"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleStartGame(stageRef.current);
                }}
                disabled={gameState === 'IDLE' || busy}
              >
                <RotateCcw className="h-4 w-4" strokeWidth={2.5} /> 다시 시작
              </button>
            </div>
          </div>
        }
      />

      {gameState === 'OVER' && stage && (
        <ScreenOverlay>
          <ResultCard
            game="puzzle"
            emoji={outcome?.won ? '🌟' : '😢'}
            title={outcome?.won ? '스테이지 클리어!' : '아쉬워요'}
            subtitle={
              outcome?.won
                ? `스테이지 ${stage.no} · ${'★'.repeat(outcome.stars)}${'☆'.repeat(3 - outcome.stars)}`
                : `스테이지 ${stage.no} · ${goalText(stage.goal)}`
            }
            tone={outcome?.won ? 'grape' : 'berry'}
            score={score}
            stats={[
              { label: '목표', value: goalProgress(stage.goal, goalValue) },
              { label: '남은 이동', value: `${moves}번` },
              { label: '최대 연쇄', value: `${maxCombo}연쇄` },
              { label: '플레이 시간', value: formatTime(elapsed) },
            ]}
            reward={reward}
            shareText={
              outcome?.won
                ? `🧩 과일 퍼즐 스테이지 ${stage.no} 클리어! ${'★'.repeat(outcome.stars)}`
                : `🧩 과일 퍼즐 스테이지 ${stage.no}에 도전 중!`
            }
            shareUrl={appUrl()}
            ranked={false}
            onRetry={() => handleStartGame(stage)}
            onExit={onExit}
            extraAction={
              outcome?.won && stage.no < STAGE_COUNT
                ? { label: '다음 스테이지 ▶', onClick: () => handleStartGame(STAGES[stage.no]) }
                : {
                    label: '스테이지 고르기',
                    onClick: () => {
                      setMode('stage');
                      setGameState('IDLE');
                    },
                  }
            }
          />
        </ScreenOverlay>
      )}

      {gameState === 'OVER' && !stage && (
        <ScreenOverlay>
          <ResultCard
            game="puzzle"
            emoji="🧩"
            title="끝!"
            subtitle={`이동 ${CLASSIC_MOVES}번을 모두 썼어요`}
            tone="grape"
            score={score}
            stats={[
              { label: '최대 연쇄', value: `${maxCombo}연쇄` },
              { label: '특수 과일', value: `${specials}개` },
              { label: '터뜨린 과일', value: `${popped}개` },
              { label: '플레이 시간', value: formatTime(elapsed) },
            ]}
            reward={reward}
            shareText={`🧩 과일 퍼즐 ${formatNumber(score)}점! 최대 ${maxCombo}연쇄`}
            onRetry={() => handleStartGame(null)}
            onExit={onExit}
          />
        </ScreenOverlay>
      )}
    </>
  );
};
