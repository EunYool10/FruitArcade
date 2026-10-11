import React from 'react';

export interface SegmentOption<T> {
  value: T;
  label: React.ReactNode;
  sub?: React.ReactNode;
}

interface SegmentedProps<T> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  columns?: 2 | 3 | 4 | 5;
}

const COLS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4', 5: 'grid-cols-5' };

/** Row of toggle buttons where exactly one is selected. */
export function Segmented<T extends string | number>({ value, options, onChange, ariaLabel, columns = 3 }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={`grid gap-2 ${COLS[columns]}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`rounded-2xl border-2 border-line px-2 py-2.5 text-center transition-all ${
              active ? '-translate-y-0.5 bg-mango text-on-bright shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'
            }`}
          >
            <span className="block font-display text-base leading-tight">{o.label}</span>
            {o.sub && (
              <span className={`mt-0.5 block text-[11px] font-semibold ${active ? 'text-on-bright/75' : 'text-ink-3'}`}>
                {o.sub}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
