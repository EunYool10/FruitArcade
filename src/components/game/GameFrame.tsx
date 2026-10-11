import React from 'react';

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
  <div className="mx-auto grid w-full max-w-[1080px] grid-cols-1 items-start gap-3 py-1 lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-[auto_1fr] lg:gap-6">
    <div className="lg:col-start-2 lg:row-start-1">{hud}</div>
    <div className="flex min-w-0 justify-center lg:col-start-1 lg:row-span-2 lg:row-start-1">{board}</div>
    {panel && <div className="space-y-3 lg:col-start-2 lg:row-start-2">{panel}</div>}
  </div>
);

export const Hud: React.FC<{ children: React.ReactNode; footer?: React.ReactNode }> = ({ children, footer }) => (
  <div className="panel p-2.5 sm:p-3">
    <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">{children}</div>
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

/** Covers the board (used for the start card). */
export const BoardOverlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="absolute inset-0 z-20 grid place-items-center overflow-y-auto bg-surface/70 p-3 backdrop-blur-[2px] animate-fade-in">
    {children}
  </div>
);

/** Covers the whole screen (used for result cards). */
export const ScreenOverlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[rgb(18_12_28/0.5)] p-4 animate-fade-in">
    {children}
  </div>
);
