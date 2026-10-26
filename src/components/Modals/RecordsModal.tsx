import React, { useState } from 'react';
import { GameType, HistoryEntry, UserStatistics } from '../../types';
import { GAMES, GAME_ORDER, TONE } from '../../constants';
import { bestKey, playsKey } from '../../utils/progress';
import { formatNumber, formatTime } from '../../utils/format';
import { DayStats, lastDays } from '../../utils/dailyStats';
import { Modal } from '../ui/Modal';
import { BarChart } from '../ui/BarChart';
import { HistoryRow } from '../HistoryRow';
import { Emoji } from '../ui/Emoji';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStatistics;
  history: HistoryEntry[];
  /** Per-day totals on this device */
  days: DayStats;
}

type Filter = 'all' | GameType;

/** Short numbers for narrow bars: 13,769 → 13.8k */
const compact = (v: number) => (v >= 10_000 ? `${(v / 1000).toFixed(v >= 100_000 ? 0 : 1)}k` : formatNumber(v));

export const RecordsModal: React.FC<Props> = ({ isOpen, onClose, stats, history, days }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const points = lastDays(days, 7);
  const played = points.some((p) => p.plays > 0);
  const FILTERS: [Filter, string][] = [['all', '전체'], ...GAME_ORDER.map((g): [Filter, string] => [g, `${GAMES[g].emoji} ${GAMES[g].short}`])];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="내 기록" subtitle="최고 기록과 최근 플레이" icon="📊" tone="soda" size="lg">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="well px-3 py-2.5">
          <p className="text-[11px] font-bold text-ink-3">총 플레이</p>
          <p className="font-display text-2xl tabular-nums">{stats.totalPlayCount}판</p>
        </div>
        <div className="well px-3 py-2.5">
          <p className="text-[11px] font-bold text-ink-3">총 플레이 시간</p>
          <p className="font-display text-2xl tabular-nums">{formatTime(stats.totalPlayTime)}</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {GAME_ORDER.map((g) => {
          const meta = GAMES[g];
          return (
            <div
              key={g}
              className={`flex items-center gap-3 rounded-2xl border-2 border-line p-3 sm:flex-col sm:gap-1.5 sm:px-1.5 sm:py-2.5 sm:text-center ${TONE[meta.tone].soft}`}
            >
              <span className={`sticker h-11 w-11 shrink-0 text-2xl sm:h-10 sm:w-10 sm:text-xl ${TONE[meta.tone].bg}`} aria-hidden="true">
                <Emoji e={meta.emoji} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold sm:text-xs">{meta.name}</p>
                <p className="font-display text-xl tabular-nums sm:text-base">
                  {stats[bestKey(g)] > 0 ? `${formatNumber(stats[bestKey(g)])}점` : '기록 없음'}
                </p>
                <p className="text-[11px] font-bold text-ink-3">{stats[playsKey(g)]}판 플레이</p>
              </div>
            </div>
          );
        })}
      </div>

      <h3 className="mb-2 mt-5 font-display text-lg">📈 최근 7일</h3>
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="그래프 게임 선택">
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={`chip h-8 px-3 text-xs transition-colors ${filter === id ? 'bg-soda text-on-bright shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {played ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="well p-3.5">
            <p className="mb-2 text-sm font-bold">판 수</p>
            <BarChart
              data={points.map((p) => ({ label: p.label, value: filter === 'all' ? p.plays : p.playsBy[filter] ?? 0 }))}
              ariaLabel="최근 7일 판 수"
              tone="soda"
            />
          </div>
          <div className="well p-3.5">
            <p className="mb-2 text-sm font-bold">{filter === 'all' ? '플레이 시간 (분)' : '그날 최고 점수'}</p>
            <BarChart
              data={points.map((p) => ({
                label: p.label,
                value: filter === 'all' ? Math.round(p.seconds / 60) : p.best[filter] ?? 0,
              }))}
              ariaLabel={filter === 'all' ? '최근 7일 플레이 시간(분)' : `최근 7일 ${GAMES[filter].short} 최고 점수`}
              tone={filter === 'all' ? 'grape' : GAMES[filter].tone}
              format={compact}
            />
          </div>
        </div>
      ) : (
        <p className="well py-6 text-center text-sm text-ink-3">최근 7일 동안 플레이한 기록이 없어요.</p>
      )}

      <h3 className="mb-2 mt-5 font-display text-lg">최근 플레이</h3>
      {history.length === 0 ? (
        <p className="well py-8 text-center text-sm text-ink-3">아직 기록이 없어요. 한 판 해 볼까요? 🍓</p>
      ) : (
        <ul className="space-y-2">
          {history.map((h, i) => (
            <HistoryRow key={`${h.at}-${i}`} entry={h} />
          ))}
        </ul>
      )}
      <p className="mt-3 text-center text-[11px] text-ink-3">그래프와 최근 플레이 목록은 이 기기에만 저장돼요.</p>
    </Modal>
  );
};
