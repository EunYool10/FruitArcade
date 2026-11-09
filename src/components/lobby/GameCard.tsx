import React from 'react';
import { ChevronRight } from 'lucide-react';
import { GameMeta, KIND_LABEL, TONE } from '../../constants';
import { formatNumber } from '../../utils/format';
import { Emoji } from '../ui/Emoji';

interface GameCardProps {
  meta: GameMeta;
  best: number;
  plays: number;
  /** The game played last, marked with a stamp */
  recent?: boolean;
  onPlay: () => void;
}

/**
 * A little market stall: an awning in the game's colour (the same one its start card has), the
 * game in a crate on a shelf, and below it what the player cares about: their best, like a price.
 * The whole stall plays. Two to a row on phones, three from `sm` up.
 */
export const GameCard: React.FC<GameCardProps> = ({ meta, best, plays, recent = false, onPlay }) => {
  const tone = TONE[meta.tone];
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`${meta.name} 플레이${recent ? ' (최근에 한 게임)' : ''}`}
      className="panel group flex h-full w-full flex-col max-sm:last:odd:col-span-2 overflow-hidden text-left transition-[transform,box-shadow] duration-150 hover:-translate-y-1 hover:shadow-pop-lg focus-visible:-translate-y-1 active:translate-y-0.5 active:shadow-hard-sm"
    >
      <span className="awning z-10 block h-3.5 w-full shrink-0 [--stripe:1.25rem]" style={{ '--awning-a': `var(--${meta.tone})` } as React.CSSProperties} aria-hidden="true" />

      {/* Inside the stall */}
      <span className={`relative block h-[6.25rem] w-full shrink-0 overflow-hidden sm:h-[7.25rem] ${tone.soft}`}>
        <span className="price-tag absolute left-0 top-4 text-[11px] sm:top-5 sm:text-xs">{KIND_LABEL[meta.kind]}</span>
        {recent && (
          <span className={`stamp absolute right-2 top-4 bg-surface/60 text-[11px] sm:right-3 sm:top-5 sm:text-xs ${tone.ink}`} style={{ '--tilt': '7deg' } as React.CSSProperties}>
            방금 한 판
          </span>
        )}
        {/* The game sits in its crate; the crate is drawn after it and hides its lower edge */}
        <span
          className="absolute bottom-[1.45rem] left-1/2 -translate-x-1/2 text-[3rem] leading-none drop-shadow-[0_3px_3px_rgb(0_0_0/0.2)] transition-transform duration-200 group-hover:-translate-y-1.5 group-hover:-rotate-6 sm:bottom-[1.75rem] sm:text-[3.75rem]"
          aria-hidden="true"
        >
          <Emoji e={meta.emoji} />
        </span>
        <span className="crate absolute bottom-1.5 left-1/2 h-6 w-[58%] max-w-40 -translate-x-1/2 rounded-b-none sm:h-7" aria-hidden="true" />
        {/* The shelf */}
        <span className="absolute inset-x-0 bottom-0 h-1.5 bg-crate-deep" aria-hidden="true" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1 px-3 pb-2.5 pt-2.5 sm:px-3.5 sm:pt-3">
        <span className="truncate font-display text-[1.2rem] leading-tight sm:text-[1.4rem]">{meta.name}</span>
        <span className="hidden text-xs leading-snug text-ink-2 sm:line-clamp-1">{meta.desc}</span>
        <span className="mt-auto flex items-baseline justify-between gap-2 border-t border-dashed border-line pt-1.5">
          {plays > 0 ? (
            <span className="flex min-w-0 items-baseline gap-1">
              <span className="shrink-0 text-[11px] font-bold text-ink-3">최고</span>
              <span className={`truncate font-display text-base leading-none tabular-nums sm:text-lg ${tone.ink}`}>
                {formatNumber(best)}
                {meta.unit ?? '점'}
              </span>
            </span>
          ) : (
            <span className="hand truncate text-sm text-ink-3">첫 판을 기다려요</span>
          )}
          <span className="flex shrink-0 items-center text-[11px] font-bold text-ink-3">
            {plays > 0 && <span className="hidden sm:inline">{formatNumber(plays)}판</span>}
            <ChevronRight className={`h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 ${tone.ink}`} strokeWidth={3} aria-hidden="true" />
          </span>
        </span>
      </span>
    </button>
  );
};
