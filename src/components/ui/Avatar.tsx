import React from 'react';
import type { TitleDef } from '../../utils/titles';

const SIZES = {
  sm: 'h-8 w-8 text-base',
  md: 'h-12 w-12 text-2xl',
  lg: 'h-16 w-16 text-3xl',
};

/** How the current player is shown everywhere (nickname, fruit avatar or Google photo). */
export interface PlayerView {
  name: string;
  emoji: string;
  photo: string | null;
  isGuest: boolean;
  /** Worn title, shown next to the name */
  title?: TitleDef | null;
}

export const Avatar: React.FC<{ player: PlayerView; size?: keyof typeof SIZES }> = ({ player, size = 'md' }) =>
  player.photo ? (
    <img
      src={player.photo}
      alt=""
      referrerPolicy="no-referrer"
      className={`${SIZES[size]} shrink-0 rounded-full border-2 border-line bg-surface-2 object-cover`}
    />
  ) : (
    <span className={`${SIZES[size]} grid shrink-0 place-items-center rounded-full border-2 border-line bg-mango-soft`} aria-hidden="true">
      {player.emoji}
    </span>
  );
