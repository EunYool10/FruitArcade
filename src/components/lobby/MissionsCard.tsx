import React from 'react';
import { DailyState, missionProgressLabel, missionsFor } from '../../utils/missions';
import { XP } from '../../utils/progress';
import { untilMidnight } from '../../utils/format';
import { Meter } from '../ui/Meter';

export const MissionsCard: React.FC<{ daily: DailyState }> = ({ daily }) => {
  const missions = missionsFor(daily.date);
  const doneCount = missions.filter((m) => (daily.progress[m.id] || 0) >= m.target).length;

  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="missions-title">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="missions-title" className="font-display text-xl">
          📋 오늘의 미션
        </h2>
        <span className="chip bg-surface-2 text-ink-2">{untilMidnight()} 뒤 새 미션</span>
      </header>

      <ul className="space-y-2.5">
        {missions.map((m) => {
          const value = daily.progress[m.id] || 0;
          const done = value >= m.target;
          return (
            <li
              key={m.id}
              className={`flex items-center gap-3 rounded-2xl border-2 border-line p-3 ${done ? 'bg-melon-soft' : 'bg-surface-2'}`}
            >
              <span className="text-2xl" aria-hidden="true">
                {done ? '✅' : m.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${done ? 'text-ink-2 line-through decoration-2' : ''}`}>{m.text}</p>
                <Meter className="mt-1.5 h-3" value={value} max={m.target} label={m.text} tone={done ? 'melon' : 'soda'} />
              </div>
              <span className="whitespace-nowrap text-xs font-bold tabular-nums text-ink-2">{missionProgressLabel(m, value)}</span>
            </li>
          );
        })}
      </ul>

      <div
        className={`mt-4 flex items-center gap-3 rounded-2xl border-2 border-dashed border-line p-3 ${
          daily.stamped ? 'bg-mango-soft' : ''
        }`}
      >
        <span
          className={`sticker h-11 w-11 shrink-0 text-xl ${daily.stamped ? '-rotate-12 bg-mango' : 'bg-surface-2 opacity-60 grayscale'}`}
          aria-hidden="true"
        >
          🏅
        </span>
        <p className="text-sm">
          {daily.stamped ? (
            <>
              <b>오늘의 도장 획득!</b> 내일 또 만나요.
            </>
          ) : (
            <>
              미션 3개를 모두 깨면 <b>도장 +{XP.stamp} XP</b> <span className="text-ink-3">({doneCount}/3)</span>
            </>
          )}
        </p>
      </div>
    </section>
  );
};
