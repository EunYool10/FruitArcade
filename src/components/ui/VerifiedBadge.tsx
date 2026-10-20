import React from 'react';

// Eight round petals around a disc, like the familiar "verified" badge
const PETALS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4 - Math.PI / 2;
  return { cx: 12 + 6.4 * Math.cos(a), cy: 12 + 6.4 * Math.sin(a) };
});

/**
 * Blue check after the names of 운영진. Entries and cards carry `verified: true` for it, and
 * firestore.rules only let admins write that, so nobody else can show it.
 */
export const VerifiedBadge: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" role="img" aria-label="운영진 인증" className={`inline-block shrink-0 ${className}`}>
    <title>운영진 인증</title>
    <g fill="#1d9bf0">
      {PETALS.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={4.2} />
      ))}
      <circle cx={12} cy={12} r={7.6} />
    </g>
    <path d="M6.9 12.4 10.5 16l6.3-6.7" fill="none" stroke="#fff" strokeWidth={2.1} strokeLinejoin="miter" />
  </svg>
);
