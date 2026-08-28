import React from 'react';
import { Clock } from 'lucide-react';

interface GameTimerProps {
  seconds: number;
  showIcon?: boolean;
  showMilliseconds?: boolean;
  warning?: boolean;
  className?: string;
  id?: string;
}

/**
 * Format seconds into mm:ss or mm:ss.s format
 */
export const formatTime = (sec: number, showMs = false): string => {
  if (isNaN(sec) || sec < 0) sec = 0;
  const mins = Math.floor(sec / 60);
  const remainingSecs = sec % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (showMs) {
    const wholeSecs = Math.floor(remainingSecs);
    const tenths = Math.floor((remainingSecs - wholeSecs) * 10);
    return `${pad(mins)}:${pad(wholeSecs)}.${tenths}`;
  }

  return `${pad(mins)}:${pad(Math.floor(remainingSecs))}`;
};

export const GameTimer: React.FC<GameTimerProps> = ({
  seconds,
  showIcon = true,
  showMilliseconds = false,
  warning = false,
  className = '',
  id = 'game-timer',
}) => {
  const formatted = formatTime(seconds, showMilliseconds);

  return (
    <div
      id={id}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 font-mono font-bold text-xs sm:text-sm transition-colors ${
        warning
          ? 'text-rose-400 border-rose-500/50 bg-rose-950/30 animate-pulse'
          : 'text-slate-200'
      } ${className}`}
    >
      {showIcon && (
        <Clock
          className={`w-3.5 h-3.5 ${
            warning ? 'text-rose-400' : 'text-slate-400'
          }`}
        />
      )}
      <span>{formatted}</span>
    </div>
  );
};
