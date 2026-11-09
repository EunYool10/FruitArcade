import React from 'react';
import { emojiSrc } from '../../utils/emoji';
import { RGB_AVATARS } from '../../utils/shop';

/**
 * An emoji that looks the same on every device: the bundled picture when there is one,
 * sized like text (1em), otherwise the emoji itself.
 */
export const Emoji: React.FC<{ e: string; className?: string }> = ({ e, className = '' }) => {
  const src = emojiSrc(e);
  // The RGB avatars' colours keep running
  if (RGB_AVATARS.has(e)) className = `rgb-hue ${className}`;
  if (!src) return <span className={className}>{e}</span>;
  return <img src={src} alt={e} draggable={false} className={`inline-block h-[1em] w-[1em] select-none align-[-0.125em] ${className}`} />;
};
