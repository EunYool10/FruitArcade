import React, { useState } from 'react';
import type { TitleDef } from '../../utils/titles';
import { FRAME_CLASS } from '../../utils/shop';
import { Emoji } from './Emoji';

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
  /** Avatar frame bought in the shop (item id) */
  frame?: string;
  /** Name put on things the player shares (challenge links, result images): never the Google name */
  shareName?: string;
}

/** Colored ring from the shop around an avatar or sticker (nothing when no frame) */
export const Framed: React.FC<{ frame?: string; shape?: 'circle' | 'sticker'; children: React.ReactNode }> = ({
  frame,
  shape = 'circle',
  children,
}) => {
  const ring = frame ? FRAME_CLASS[frame] : undefined;
  if (!ring) return <>{children}</>;
  return <span className={`inline-grid shrink-0 p-[3px] ${shape === 'circle' ? 'rounded-full' : 'rounded-[1.2rem]'} ${ring}`}>{children}</span>;
};

/**
 * Another player's face: their Google photo when they show one, otherwise their emoji.
 * `className` sets the size and shape; a photo that fails to load falls back to the emoji.
 */
export const AvatarFace: React.FC<{ emoji: string; photo?: string; className: string }> = ({ emoji, photo, className }) => {
  const [broken, setBroken] = useState('');
  return photo && broken !== photo ? (
    <span className={`${className} overflow-hidden p-0`} aria-hidden="true">
      <img src={photo} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-full w-full object-cover" onError={() => setBroken(photo)} />
    </span>
  ) : (
    <span className={className} aria-hidden="true">
      <Emoji e={emoji} />
    </span>
  );
};

export const Avatar: React.FC<{ player: PlayerView; size?: keyof typeof SIZES }> = ({ player, size = 'md' }) => {
  // A Google photo that no longer loads (changed or removed) falls back to the fruit
  const [broken, setBroken] = useState('');
  return (
  <Framed frame={player.frame}>
    {player.photo && broken !== player.photo ? (
      <img
        src={player.photo}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(player.photo ?? '')}
        className={`${SIZES[size]} shrink-0 rounded-full border-2 border-line bg-surface-2 object-cover`}
      />
    ) : (
      <span className={`${SIZES[size]} grid shrink-0 place-items-center rounded-full border-2 border-line bg-mango-soft`} aria-hidden="true">
        <Emoji e={player.emoji} />
      </span>
    )}
  </Framed>
  );
};
