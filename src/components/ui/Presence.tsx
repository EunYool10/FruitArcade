import React from 'react';
import { isOnline, presenceText } from '../../utils/presence';

/** A green dot and "온라인", or a grey dot and when they were last here */
export const PresenceTag: React.FC<{ at: number | null | undefined; className?: string }> = ({ at, className = '' }) => {
  const on = isOnline(at);
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${on ? 'text-melon-ink' : 'text-ink-3'} ${className}`}>
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full border border-line ${on ? 'bg-melon' : 'bg-surface-3'}`} />
      {presenceText(at)}
    </span>
  );
};
