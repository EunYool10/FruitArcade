import React from 'react';
import { ArrowRight } from 'lucide-react';
import { GameMeta, TONE } from '../../constants';
import { formatNumber } from '../../utils/format';
import { Emoji } from '../ui/Emoji';

interface GameCardProps {
  meta: GameMeta;
  best: number;
  plays: number;
  onPlay: () => void;
}

/**
 * A compact tile laid out like a fruit-crate label: a printed colour band with the fruit, a price
 * tag hanging off the corner, and the name below. The whole card plays. Two to a row on phones,
 * three from `sm` up.
 */
export const GameCard: React.FC<GameCardProps> = ({ meta, best, plays, onPlay }) => {
  const tone = TONE[meta.tone];
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`${meta.name} 플레이`}
      className="panel group flex h-full w-full flex-col overflow-hidden p-1.5 text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-pop-lg focus-visible:-translate-y-1 sm:p-2"
    >
      <span className={`dots relative grid h-[5.25rem] w-full place-items-center overflow-hidden rounded-[0.8rem] sm:h-28 ${tone.bg}`}>
        {/* A soft spotlight behind the fruit, like a label printed around it */}
        <span className="absolute h-[4.6rem] w-[4.6rem] rounded-full bg-white/25 sm:h-24 sm:w-24" aria-hidden="true" />
        <span className="price-tag absolute left-0 top-2 text-[10px] sm:top-2.5 sm:text-[11px]">{meta.tag}</span>
        <span
          className="relative text-[2.6rem] drop-shadow-[0_6px_6px_rgb(0_0_0/0.22)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 sm:text-[3.5rem]"
          aria-hidden="true"
        >
          <Emoji e={meta.emoji} />
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 px-1.5 pb-1 pt-2.5 sm:px-2 sm:pt-3">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-display text-[1.15rem] leading-tight sm:text-[1.35rem]">{meta.name}</span>
          <ArrowRight
            className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 sm:h-5 sm:w-5 ${tone.ink}`}
            strokeWidth={2.75}
            aria-hidden="true"
          />
        </span>
        <span className="hidden text-xs leading-snug text-ink-2 sm:line-clamp-2">{meta.desc}</span>
        <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-dashed border-line pt-1.5 text-[11px] font-bold text-ink-3">
          <span className={best > 0 ? 'text-ink-2' : ''}>최고 {best > 0 ? `${formatNumber(best)}${meta.unit ?? '점'}` : '—'}</span>
          <span aria-hidden="true">·</span>
          <span>{plays}판</span>
        </span>
      </span>
    </button>
  );
};
