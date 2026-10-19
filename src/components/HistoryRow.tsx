import React from 'react';
import { HistoryEntry } from '../types';
import { GAMES, TONE } from '../constants';
import { formatNumber, formatTime, relativeTime } from '../utils/format';
import { Emoji } from './ui/Emoji';

export const HistoryRow: React.FC<{ entry: HistoryEntry }> = ({ entry }) => {
  const meta = GAMES[entry.game];
  return (
    <li className="flex items-center gap-3 rounded-2xl border-2 border-line bg-surface-2 px-3 py-2.5">
      <span className={`sticker h-10 w-10 shrink-0 text-xl ${TONE[meta.tone].bg}`} aria-hidden="true">
        <Emoji e={meta.emoji} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">
          {meta.name}
          {entry.stage && <span className="text-grape-ink"> · 스테이지 {entry.stage}{entry.won ? ' 클리어' : ''}</span>}
          {entry.game === 'memory' && entry.won !== undefined && (
            <span className={entry.won ? 'text-melon-ink' : 'text-ink-3'}>{entry.won ? ' · 클리어' : ' · 실패'}</span>
          )}
        </p>
        <p className="text-xs text-ink-3">
          {relativeTime(entry.at)} · {formatTime(entry.seconds)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <p className="font-display text-lg leading-tight tabular-nums">{formatNumber(entry.score)}점</p>
        {entry.best && <span className="chip bg-mango px-1.5 py-0 text-[10px] text-on-bright">BEST</span>}
      </div>
    </li>
  );
};
