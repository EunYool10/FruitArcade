import React from 'react';
import { Play } from 'lucide-react';
import { GameMeta, TONE } from '../../constants';
import { formatNumber } from '../../utils/format';

interface StartCardProps {
  meta: GameMeta;
  best: number;
  onStart: () => void;
  /** Extra options shown above the start button (e.g. difficulty) */
  children?: React.ReactNode;
  onHelp?: () => void;
}

export const StartCard: React.FC<StartCardProps> = ({ meta, best, onStart, children, onHelp }) => (
  <div className="panel w-full max-w-[300px] p-5 text-center animate-pop-in">
    <span className={`sticker h-20 w-20 -rotate-6 text-5xl ${TONE[meta.tone].bg}`} aria-hidden="true">
      {meta.emoji}
    </span>
    <h2 className="mt-3 font-display text-3xl">{meta.name}</h2>
    <ol className="mt-3 space-y-1.5 text-left text-sm text-ink-2">
      {meta.how.map((line, i) => (
        <li key={line} className="flex gap-2">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-line bg-surface-2 font-display text-[11px] text-ink">
            {i + 1}
          </span>
          {line}
        </li>
      ))}
    </ol>
    <p className="mt-3 text-xs font-bold text-ink-3">🏆 최고 기록 {best > 0 ? `${formatNumber(best)}점` : '없음'}</p>
    {children && <div className="mt-3">{children}</div>}
    <button type="button" className={`btn btn-lg mt-4 w-full ${TONE[meta.tone].btn}`} onClick={onStart}>
      <Play className="h-5 w-5 fill-current" /> 시작하기
    </button>
    <p className="mt-2.5 hidden text-[11px] text-ink-3 sm:block">{meta.startHint}</p>
    {onHelp && (
      <button type="button" className="btn btn-ghost btn-sm mt-1 text-ink-2" onClick={onHelp}>
        ❓ 게임 방법 보기
      </button>
    )}
  </div>
);
