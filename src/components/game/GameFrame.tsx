import React from 'react';
import { useAnyModalOpen } from '../ui/modalStack';

/**
 * Game screen layout.
 * Phones: HUD → board → panel, stacked.
 * Desktop: board on the left, HUD and panel in a side column.
 */
export const GameFrame: React.FC<{ hud: React.ReactNode; board: React.ReactNode; panel?: React.ReactNode }> = ({
  hud,
  board,
  panel,
}) => (
  <div className="mx-auto grid w-full max-w-[1080px] grid-cols-1 items-start gap-3 py-1 short:grid-cols-[minmax(0,1fr)_250px] short:grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-[auto_1fr] lg:gap-6">
    <div className="short:col-start-2 short:row-start-1 lg:col-start-2 lg:row-start-1">{hud}</div>
    <div className="flex min-w-0 justify-center short:col-start-1 short:row-span-2 short:row-start-1 lg:col-start-1 lg:row-span-2 lg:row-start-1">{board}</div>
    {panel && <div className="space-y-3 short:col-start-2 short:row-start-2 lg:col-start-2 lg:row-start-2">{panel}</div>}
  </div>
);

export const Hud: React.FC<{ children: React.ReactNode; footer?: React.ReactNode }> = ({ children, footer }) => (
  <div className="panel p-2.5 sm:p-3">
    <div className="grid grid-cols-4 gap-2 short:grid-cols-2 lg:grid-cols-2">{children}</div>
    {footer}
  </div>
);

type StatTone = 'default' | 'hot' | 'warn';

export const HudStat: React.FC<{ label: string; value: React.ReactNode; tone?: StatTone }> = ({
  label,
  value,
  tone = 'default',
}) => (
  <div
    className={`min-w-0 rounded-xl border-2 border-line px-1.5 py-1.5 text-center lg:px-3 lg:py-2 lg:text-left ${
      tone === 'warn' ? 'animate-pulse bg-berry-soft' : tone === 'hot' ? 'bg-mango-soft' : 'bg-surface-2'
    }`}
  >
    <p className="truncate text-[10px] font-bold text-ink-3 sm:text-[11px]">{label}</p>
    <p
      className={`truncate font-display text-lg leading-tight tabular-nums sm:text-xl lg:text-2xl ${
        tone === 'warn' ? 'text-berry-ink' : ''
      }`}
    >
      {value}
    </p>
  </div>
);

// Both overlays centre their card with an auto margin rather than grid centring: when the card
// is taller than the space (small phones, phones held sideways) it then starts at the top and
// scrolls, instead of spilling over both edges with its top cut off.

/** Covers the board (used for the start card). Start cards shrink to fit short boards (board-short / board-tiny). */
export const BoardOverlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="absolute inset-0 z-20 flex overflow-y-auto bg-surface/70 p-3 backdrop-blur-[2px] animate-fade-in [container:board/size]">
    <div className="m-auto flex w-full justify-center">{children}</div>
  </div>
);

/**
 * Covers the whole screen (used for result cards). Hidden, not closed, while a window such as
 * the leaderboard is open on top of it, so the two never show at once.
 */
export const ScreenOverlay: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const covered = useAnyModalOpen();
  return (
    <div className={`fixed inset-0 z-40 overflow-y-auto bg-[rgb(18_12_28/0.5)] p-4 animate-fade-in ${covered ? 'hidden' : 'flex'}`}>
      <div className="m-auto flex w-full justify-center">{children}</div>
    </div>
  );
};
