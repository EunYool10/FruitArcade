import React from 'react';
import { Check, Play } from 'lucide-react';
import { GameType } from '../../types';
import { GAMES, TONE } from '../../constants';
import { DailyState, missionProgressLabel, missionsFor } from '../../utils/missions';
import { XP } from '../../utils/progress';
import { formatNumber, untilMidnight } from '../../utils/format';
import { Meter } from '../ui/Meter';
import { Emoji } from '../ui/Emoji';

/** Coins a stamp adds to the round that earns it (coinsFor in shop.ts) */
const STAMP_COINS = 50;

/** How many of today's three are done, as a ring */
const Ring: React.FC<{ done: number; total: number }> = ({ done, total }) => {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid h-14 w-14 shrink-0 place-items-center" role="img" aria-label={`미션 ${total}개 중 ${done}개 완료`}>
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="7" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={done >= total ? 'var(--melon)' : 'var(--mango)'}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(c * done) / total} ${c}`}
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <span className="font-display text-base tabular-nums">
        {done}/{total}
      </span>
    </span>
  );
};

interface Props {
  daily: DailyState;
  streak: number;
  /** Stamps collected so far (statistics.missionStamps) */
  stamps: number;
  onPlay: (game: GameType) => void;
}

export const MissionsCard: React.FC<Props> = ({ daily, streak, stamps, onPlay }) => {
  const missions = missionsFor(daily.date);
  const doneCount = missions.filter((m) => (daily.progress[m.id] || 0) >= m.target).length;

  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="missions-title">
      <header className="mb-4 flex items-center gap-3">
        <Ring done={doneCount} total={missions.length} />
        <div className="min-w-0 flex-1">
          <h2 id="missions-title" className="font-display text-xl">
            📋 오늘의 미션
          </h2>
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-ink-3">
            <span>⏰ {untilMidnight()} 뒤 새 미션</span>
            {streak > 0 && <span className="font-bold text-berry-ink">🔥 {streak}일 연속</span>}
          </p>
        </div>
      </header>

      <ul className="space-y-2.5">
        {missions.map((m) => {
          const value = daily.progress[m.id] || 0;
          const done = value >= m.target;
          const meta = m.game ? GAMES[m.game] : null;
          const tone = TONE[meta?.tone ?? 'grape'];
          const pct = Math.min(100, Math.round((value / m.target) * 100));
          return (
            <li key={m.id} className={`relative overflow-hidden rounded-2xl border-2 border-line ${done ? 'bg-melon-soft' : 'bg-surface-2'}`}>
              <div className="flex items-center gap-3 p-3">
                <span className={`sticker h-11 w-11 shrink-0 text-xl shadow-none ${done ? 'bg-melon' : tone.bg}`} aria-hidden="true">
                  {done ? <Check className="h-6 w-6 text-white" strokeWidth={3.5} /> : <Emoji e={m.icon} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] font-bold text-ink-3">
                    {meta ? (
                      <>
                        <Emoji e={meta.emoji} /> {meta.name}
                      </>
                    ) : (
                      '🎮 아무 게임'
                    )}
                  </p>
                  <p className={`text-sm font-bold ${done ? 'text-ink-2 line-through decoration-2' : ''}`}>{m.text}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Meter className="h-2.5 flex-1" value={value} max={m.target} label={m.text} tone={done ? 'melon' : (meta?.tone ?? 'grape')} />
                    <span className="shrink-0 text-[11px] font-bold tabular-nums text-ink-2">{done ? '완료!' : `${missionProgressLabel(m, value)} · ${pct}%`}</span>
                  </div>
                </div>
                {!done && m.game && (
                  <button type="button" className={`btn btn-sm shrink-0 ${tone.btn}`} onClick={() => onPlay(m.game!)} aria-label={`${meta?.name} 하러 가기`}>
                    <Play className="h-4 w-4 fill-current" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Stamp board: today's three slots, and what a full board pays */}
      <div className={`mt-4 rounded-2xl border-2 border-dashed border-line p-3 ${daily.stamped ? 'bg-mango-soft' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 gap-1.5" aria-hidden="true">
            {missions.map((m, i) => {
              const done = (daily.progress[m.id] || 0) >= m.target;
              return (
                <span
                  key={m.id}
                  className={`grid h-9 w-9 place-items-center rounded-full border-2 border-line text-base transition-transform ${
                    done ? 'bg-mango' : 'bg-surface-2 opacity-60'
                  }`}
                  style={done ? { transform: `rotate(${(i - 1) * 10}deg)` } : undefined}
                >
                  {done ? <Emoji e="🏅" /> : <span className="text-xs font-bold text-ink-3">{i + 1}</span>}
                </span>
              );
            })}
          </div>
          <p className="min-w-0 flex-1 text-sm">
            {daily.stamped ? (
              <>
                <b>오늘의 도장 획득!</b> <span className="text-ink-3">내일 또 만나요.</span>
              </>
            ) : (
              <>
                모두 깨면 <b>도장</b> · <b>+{XP.stamp} XP</b> · <b>🪙 +{STAMP_COINS}</b>
              </>
            )}
          </p>
        </div>
        <p className="mt-2 text-[11px] font-bold text-ink-3">🏅 지금까지 모은 도장 {formatNumber(stamps)}개</p>
      </div>
    </section>
  );
};
