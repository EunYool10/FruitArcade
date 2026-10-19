import React from 'react';
import { Play } from 'lucide-react';
import { GameMeta, TONE } from '../../constants';
import { formatNumber } from '../../utils/format';
import { Emoji } from '../ui/Emoji';

interface GameCardProps {
  meta: GameMeta;
  best: number;
  plays: number;
  onPlay: () => void;
  /** Grid placement from the lobby */
  className?: string;
}

/** Side-by-side on phones, art on top from `sm` up. */
export const GameCard: React.FC<GameCardProps> = ({ meta, best, plays, onPlay, className = '' }) => {
  const tone = TONE[meta.tone];
  return (
    <article className={`panel group flex overflow-hidden transition-transform duration-200 hover:-translate-y-1 sm:flex-col ${className}`}>
      <div
        className={`dots relative grid w-28 shrink-0 place-items-center border-r-2 border-line sm:h-36 sm:w-auto sm:border-b-2 sm:border-r-0 ${tone.bg}`}
      >
        <span className="chip absolute left-2 top-2 -rotate-6 bg-surface px-1.5 text-[10px] sm:left-3 sm:top-3 sm:px-2.5 sm:text-xs">
          {meta.tag}
        </span>
        <span
          className="text-5xl drop-shadow-[3px_4px_0_rgb(0_0_0/0.18)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 sm:text-7xl"
          aria-hidden="true"
        >
          <Emoji e={meta.emoji} />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3.5 sm:gap-3 sm:p-4">
        <div>
          <h3 className="font-display text-xl leading-tight sm:text-2xl">{meta.name}</h3>
          <p className="mt-1 text-xs text-ink-2 sm:text-sm">{meta.desc}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="chip bg-surface-2">🏆 {best > 0 ? `${formatNumber(best)}점` : '기록 없음'}</span>
          <span className="chip bg-surface-2">🎮 {plays}판</span>
        </div>
        <button
          type="button"
          className={`btn mt-auto h-11 w-full sm:h-14 sm:rounded-[1.2rem] sm:text-[1.2rem] ${tone.btn}`}
          onClick={onPlay}
          aria-label={`${meta.name} 플레이`}
        >
          플레이 <Play className="h-4 w-4 fill-current" />
        </button>
      </div>
    </article>
  );
};
