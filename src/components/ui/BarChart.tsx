import React from 'react';
import { TONE, Tone } from '../../constants';

export interface Bar {
  label: string;
  value: number;
}

interface BarChartProps {
  data: Bar[];
  /** Screen readers get the values in this sentence form */
  ariaLabel: string;
  format?: (value: number) => string;
  tone?: Tone;
  /** Height of the bar area in px */
  height?: number;
}

/** Small column chart without a chart library */
export const BarChart: React.FC<BarChartProps> = ({ data, ariaLabel, format = (v) => String(v), tone = 'mango', height = 96 }) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  const summary = `${ariaLabel}: ${data.map((d) => `${d.label} ${format(d.value)}`).join(', ')}`;
  return (
    <figure role="img" aria-label={summary} className="m-0">
      <div className="flex items-end gap-1.5" style={{ height: height + 16 }} aria-hidden="true">
        {data.map((d) => (
          <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5">
            <span className="text-[10px] font-bold tabular-nums leading-none text-ink-2">{d.value > 0 ? format(d.value) : ''}</span>
            <div
              className={`w-full max-w-[44px] rounded-t-lg border-2 border-line ${d.value > 0 ? TONE[tone].bg : 'bg-surface-3'}`}
              style={{ height: Math.max(d.value > 0 ? 6 : 3, Math.round((d.value / max) * height)) }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5" aria-hidden="true">
        {data.map((d) => (
          <span key={d.label} className="min-w-0 flex-1 truncate text-center text-[10px] text-ink-3">
            {d.label}
          </span>
        ))}
      </div>
    </figure>
  );
};
