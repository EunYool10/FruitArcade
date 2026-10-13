import React from 'react';
import type { TitleDef } from '../../utils/titles';

const STAFF_BADGE = 'bg-[linear-gradient(135deg,#1e3a8a,#3b82f6)] text-white';

/**
 * A worn title. `chip` sits next to the name (player card), `line` goes under a name in lists.
 * 운영진 titles get a blue badge so everyone can tell staff apart.
 */
export const TitleTag: React.FC<{ title: TitleDef; variant?: 'chip' | 'line' }> = ({ title, variant = 'chip' }) => {
  const label = title.staff ? `운영진 칭호 ${title.label}` : `칭호 ${title.label}`;
  if (variant === 'line') {
    return title.staff ? (
      <span className={`mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-bold ${STAFF_BADGE}`} aria-label={label}>
        <span aria-hidden="true">{title.icon}</span>
        <span className="truncate">{title.label}</span>
      </span>
    ) : (
      <span className="block truncate text-[11px] font-semibold text-grape-ink" aria-label={label}>
        {title.icon} {title.label}
      </span>
    );
  }
  return (
    <span className={`chip ${title.staff ? `border-[#1e3a8a] ${STAFF_BADGE}` : 'bg-grape-soft'}`} aria-label={label}>
      {title.icon} {title.label}
    </span>
  );
};
