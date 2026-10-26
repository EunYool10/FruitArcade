import React from 'react';
import { RotateCcw } from 'lucide-react';
import { GameType, HistoryEntry } from '../../types';
import { GAMES, TONE } from '../../constants';
import { formatNumber, formatTime, relativeTime } from '../../utils/format';
import { Emoji } from '../ui/Emoji';

const SHOWN = 5;

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

export const RecentPlays: React.FC<{ history: HistoryEntry[]; onOpenRecords: () => void; onPlay: (game: GameType) => void }> = ({
  history,
  onOpenRecords,
  onPlay,
}) => {
  const now = Date.now();
  const today = history.filter((h) => sameDay(h.at, now));
  const todaySeconds = today.reduce((n, h) => n + h.seconds, 0);
  const todayBests = today.filter((h) => h.best).length;
  return (
    <section className="panel flex flex-col p-5 sm:p-6" aria-labelledby="recent-title">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 id="recent-title" className="font-display text-xl">
          🕹️ 최근 플레이
        </h2>
        <button type="button" className="btn btn-sm" onClick={onOpenRecords}>
          전체 기록
        </button>
      </header>

      {history.length === 0 ? (
        <div className="well grid flex-1 place-items-center gap-1 px-4 py-8 text-center">
          <span className="text-4xl" aria-hidden="true">
            <Emoji e="🧺" />
          </span>
          <p className="font-bold">아직 플레이 기록이 없어요</p>
          <p className="text-sm text-ink-3">첫 게임을 시작해 보세요!</p>
          <button type="button" className="btn btn-sm btn-primary mt-2" onClick={() => onPlay('suika')}>
            🍉 수박 게임 시작
          </button>
        </div>
      ) : (
        <>
          {/* Today at a glance */}
          <dl className="mb-3 grid grid-cols-3 gap-2 text-center">
            {[
              ['오늘', `${today.length}판`],
              ['플레이 시간', formatTime(todaySeconds)],
              ['신기록', `${todayBests}번`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border-2 border-line bg-surface-2 px-2 py-1.5">
                <dt className="text-[10px] font-bold text-ink-3">{label}</dt>
                <dd className="font-display text-base tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <ul className="space-y-2">
            {history.slice(0, SHOWN).map((h, i) => {
              const meta = GAMES[h.game];
              return (
                <li key={`${h.at}-${i}`} className="flex items-center gap-3 rounded-2xl border-2 border-line bg-surface-2 py-2 pl-2 pr-2.5">
                  <span className={`sticker h-10 w-10 shrink-0 text-xl shadow-none ${TONE[meta.tone].bg}`} aria-hidden="true">
                    <Emoji e={meta.emoji} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-1.5 text-sm font-bold">
                      <span className="truncate">{meta.name}</span>
                      {h.best && <span className="chip h-5 shrink-0 bg-mango px-1.5 text-[10px] text-on-bright">NEW BEST</span>}
                    </p>
                    <p className="truncate text-xs text-ink-3">
                      {relativeTime(h.at)} · {formatTime(h.seconds)}
                      {h.stage ? ` · 스테이지 ${h.stage}${h.won ? ' 클리어' : ''}` : h.game === 'memory' && h.won !== undefined ? (h.won ? ' · 클리어' : ' · 실패') : ''}
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-lg leading-tight tabular-nums">
                    {formatNumber(h.score)}
                    {meta.unit === '%' && <span className="text-sm">%</span>}
                  </p>
                  <button type="button" className="btn btn-icon btn-sm shrink-0" onClick={() => onPlay(h.game)} aria-label={`${meta.name} 다시 하기`}>
                    <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
};
