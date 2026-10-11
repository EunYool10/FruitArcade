import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 border-line transition-colors disabled:opacity-45 ${
      checked ? 'bg-melon' : 'bg-surface-3'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 rounded-full border-2 border-line bg-surface shadow-[0_2px_0_0_var(--shadow)] transition-transform ${
        checked ? 'translate-x-[29px]' : 'translate-x-[3px]'
      }`}
    />
  </button>
);

/** Label + description on the left, control on the right. */
export const SettingRow: React.FC<{ title: string; desc?: string; children: React.ReactNode }> = ({
  title,
  desc,
  children,
}) => (
  <div className="flex items-center justify-between gap-4">
    <div className="min-w-0">
      <p className="text-sm font-bold">{title}</p>
      {desc && <p className="text-xs text-ink-3">{desc}</p>}
    </div>
    {children}
  </div>
);
