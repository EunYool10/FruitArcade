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
}

/** A compact tile: the whole card plays. Two to a row on phones, three from `sm` up, so many games stay short. */
export const GameCard: React.FC<GameCardProps> = ({ meta, best, plays, onPlay }) => {
  const tone = TONE[meta.tone];
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`${meta.name} 플레이`}
      className="panel group flex h-full w-full flex-col overflow-hidden text-left transition-transform duration-200 hover:-translate-y-1 focus-visible:-translate-y-1"
    >
      <span className={`dots relative grid h-20 w-full place-items-center border-b-2 border-line sm:h-24 ${tone.bg}`}>
        <span className="chip absolute left-2 top-2 -rotate-6 bg-surface px-1.5 text-[10px] sm:left-2.5 sm:top-2.5 sm:px-2 sm:text-[11px]">{meta.tag}</span>
        <span
          className="text-[2.6rem] drop-shadow-[3px_4px_0_rgb(0_0_0/0.18)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 sm:text-[3.4rem]"
          aria-hidden="true"
        >
          <Emoji e={meta.emoji} />
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:p-3.5">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-display text-lg leading-tight sm:text-xl">{meta.name}</span>
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-line bg-surface-2 ${tone.ink}`} aria-hidden="true">
            <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
          </span>
        </span>
        <span className="hidden text-xs leading-snug text-ink-2 sm:line-clamp-2">{meta.desc}</span>
        <span className="mt-auto flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] font-bold text-ink-3">
          <span>🏆 {best > 0 ? `${formatNumber(best)}${meta.unit ?? '점'}` : '기록 없음'}</span>
          <span>🎮 {plays}판</span>
        </span>
      </span>
    </button>
  );
};
