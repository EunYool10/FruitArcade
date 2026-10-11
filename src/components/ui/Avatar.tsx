import React from 'react';
import { User } from 'firebase/auth';

const SIZES = {
  sm: 'h-8 w-8 text-base',
  md: 'h-12 w-12 text-2xl',
  lg: 'h-16 w-16 text-3xl',
};

/** Google photo when signed in, otherwise the player's level fruit. */
export const Avatar: React.FC<{ user: User | null; emoji: string; size?: keyof typeof SIZES }> = ({
  user,
  emoji,
  size = 'md',
}) =>
  user?.photoURL ? (
    <img
      src={user.photoURL}
      alt=""
      referrerPolicy="no-referrer"
      className={`${SIZES[size]} shrink-0 rounded-full border-2 border-line bg-surface-2 object-cover`}
    />
  ) : (
    <span className={`${SIZES[size]} grid shrink-0 place-items-center rounded-full border-2 border-line bg-mango-soft`} aria-hidden="true">
      {emoji}
    </span>
  );
