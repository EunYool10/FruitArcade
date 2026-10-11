import React from 'react';
import { HistoryEntry, UserStatistics } from '../../types';
import { GAMES, GAME_ORDER, TONE } from '../../constants';
import { bestKey, playsKey } from '../../utils/progress';
import { formatNumber, formatTime } from '../../utils/format';
import { Modal } from '../ui/Modal';
import { HistoryRow } from '../HistoryRow';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStatistics;
  history: HistoryEntry[];
}

export const RecordsModal: React.FC<Props> = ({ isOpen, onClose, stats, history }) => (
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

    <div className="grid gap-2 sm:grid-cols-3">
      {GAME_ORDER.map((g) => {
        const meta = GAMES[g];
        return (
          <div key={g} className={`flex items-center gap-3 rounded-2xl border-2 border-line p-3 sm:flex-col sm:text-center ${TONE[meta.tone].soft}`}>
            <span className={`sticker h-11 w-11 shrink-0 text-2xl ${TONE[meta.tone].bg}`} aria-hidden="true">
              {meta.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">{meta.name}</p>
              <p className="font-display text-xl tabular-nums">
                {stats[bestKey(g)] > 0 ? `${formatNumber(stats[bestKey(g)])}점` : '기록 없음'}
              </p>
              <p className="text-[11px] font-bold text-ink-3">{stats[playsKey(g)]}판 플레이</p>
            </div>
          </div>
        );
      })}
    </div>

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
    <p className="mt-3 text-center text-[11px] text-ink-3">최근 플레이 목록은 이 기기에만 저장돼요.</p>
  </Modal>
);
