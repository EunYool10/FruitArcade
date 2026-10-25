import React from 'react';
import { Tone } from '../../constants';

const FILL: Record<Tone, string> = {
  berry: 'bg-berry',
  melon: 'bg-melon',
  mango: 'bg-mango',
  grape: 'bg-grape',
  soda: 'bg-soda',
  peach: 'bg-peach',
};

interface MeterProps {
  value: number;
  max: number;
  label: string;
  tone?: Tone;
  className?: string;
}

/** Chunky striped progress bar. */
export const Meter: React.FC<MeterProps> = ({ value, max, label, tone = 'mango', className = 'h-4' }) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className={`overflow-hidden rounded-full border-2 border-line bg-surface-3 ${className}`}
    >
      <div className={`stripes h-full rounded-full transition-[width] duration-500 ${FILL[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
};
