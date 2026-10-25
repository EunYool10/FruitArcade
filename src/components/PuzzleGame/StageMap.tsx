import React, { useState } from 'react';
import { Lock, Play, X } from 'lucide-react';
import { Emoji } from '../ui/Emoji';
import { FRUIT } from './engine';
import { STAGES, STAGE_COUNT, Stage, StageGoal, StageProgress, goalText, isUnlocked, nextStage } from './stages';

/** Six chapters of five stages, getting harder (the stages' tiers) */
const CHAPTERS = [
  { emoji: '🍓', name: '딸기 들판', tone: 'bg-berry-soft' },
  { emoji: '🍊', name: '귤 언덕', tone: 'bg-mango-soft' },
  { emoji: '🍇', name: '포도 계곡', tone: 'bg-grape-soft' },
  { emoji: '🍑', name: '복숭아 숲', tone: 'bg-peach-soft' },
  { emoji: '🍍', name: '파인애플 섬', tone: 'bg-melon-soft' },
  { emoji: '🍉', name: '수박 성', tone: 'bg-soda-soft' },
];

/** The goal at a glance: a fruit to collect, a star for points, sparkles for specials, fire for cascades */
const goalIcon = (g: StageGoal) => (g.type === 'collect' ? FRUIT[g.kind] : g.type === 'score' ? '⭐' : g.type === 'specials' ? '✨' : '🔥');

const Stars: React.FC<{ n: number; className?: string }> = ({ n, className = '' }) => (
  <span className={`tracking-[-0.05em] ${className}`} aria-label={`별 ${n}개`}>
    <span className="text-mango">{'★'.repeat(n)}</span>
    <span className="text-ink-3 opacity-40">{'★'.repeat(3 - n)}</span>
  </span>
);

/** Every stage by chapter; pick one to see its goal, then start it */
export const StageMap: React.FC<{ progress: StageProgress; onPlay: (st: Stage) => void; onClose: () => void }> = ({ progress, onPlay, onClose }) => {
  const next = nextStage(progress);
  const [picked, setPicked] = useState<Stage>(STAGES[next - 1]);
  const totalStars = STAGES.reduce((n, s) => n + (progress[s.no] || 0), 0);
  const cleared = Object.keys(progress).filter((k) => progress[k] > 0).length;
  const pickedStars = progress[picked.no] || 0;

  return (
    <div className="panel w-full max-w-[380px] p-4 animate-pop-in">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl">🗺️ 스테이지 지도</h2>
          <p className="text-xs text-ink-3">
            {cleared}/{STAGE_COUNT} 클리어 · ⭐ {totalStars}/{STAGE_COUNT * 3}
          </p>
        </div>
        <button type="button" className="btn btn-icon btn-sm" onClick={onClose} aria-label="닫기">
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
      <div className="mb-3 h-2.5 overflow-hidden rounded-full border-2 border-line bg-surface-3">
        <div className="h-full rounded-full bg-mango transition-[width] duration-500" style={{ width: `${(totalStars / (STAGE_COUNT * 3)) * 100}%` }} />
      </div>

      <div className="space-y-3">
        {CHAPTERS.map((ch, c) => {
          const stages = STAGES.slice(c * 5, c * 5 + 5);
          const stars = stages.reduce((n, s) => n + (progress[s.no] || 0), 0);
          const open = isUnlocked(progress, stages[0].no);
          return (
            <section key={ch.name} className={`rounded-2xl border-2 border-line p-2.5 ${open ? ch.tone : 'bg-surface-3 opacity-70'}`}>
              <p className="mb-2 flex items-center justify-between gap-2 text-sm font-bold">
                <span>
                  <Emoji e={ch.emoji} /> {c + 1}장 · {ch.name}
                </span>
                <span className="text-xs tabular-nums text-ink-2">⭐ {stars}/15</span>
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {stages.map((st) => {
                  const s = progress[st.no] || 0;
                  const unlocked = isUnlocked(progress, st.no);
                  const isNext = st.no === next && unlocked && !s;
                  const on = picked.no === st.no;
                  return (
                    <button
                      key={st.no}
                      type="button"
                      disabled={!unlocked}
                      aria-pressed={on}
                      onClick={() => setPicked(st)}
                      aria-label={`스테이지 ${st.no}${s ? ` 별 ${s}개` : ''}${unlocked ? '' : ' 잠김'}`}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-line transition-all ${
                        on ? '-translate-y-0.5 bg-surface shadow-hard-sm ring-2 ring-grape' : unlocked ? 'bg-surface hover:-translate-y-0.5' : 'bg-surface-3'
                      }`}
                    >
                      {unlocked ? (
                        <>
                          <span className="text-base leading-none" aria-hidden="true">
                            <Emoji e={goalIcon(st.goal)} />
                          </span>
                          <span className="font-display text-xs leading-tight">{st.no}</span>
                          <Stars n={s} className="text-[9px] leading-none" />
                        </>
                      ) : (
                        <Lock className="h-4 w-4 text-ink-3" strokeWidth={2.5} />
                      )}
                      {isNext && <span className="absolute -right-1 -top-1.5 rounded-full bg-berry px-1 text-[8px] font-bold text-white animate-pulse">NEXT</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* The picked stage, kept in view at the bottom */}
      <div className="sticky bottom-0 -mx-1 mt-3 rounded-2xl border-2 border-line bg-surface p-3 shadow-hard-sm">
        <div className="flex items-center gap-3">
          <span className="sticker h-12 w-12 shrink-0 bg-grape text-2xl shadow-none" aria-hidden="true">
            <Emoji e={goalIcon(picked.goal)} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-xs font-bold text-ink-3">
              스테이지 {picked.no} · 이동 {picked.moves}번 <Stars n={pickedStars} className="text-xs" />
            </p>
            <p className="font-display text-base leading-tight">{goalText(picked.goal)}</p>
          </div>
        </div>
        <button type="button" className="btn btn-grape mt-2.5 w-full" onClick={() => onPlay(picked)}>
          <Play className="h-4 w-4 fill-current" /> {pickedStars ? '다시 도전' : '시작하기'}
        </button>
      </div>
    </div>
  );
};
