import React from 'react';
import { HistoryEntry } from '../../types';
import { HistoryRow } from '../HistoryRow';

export const RecentPlays: React.FC<{ history: HistoryEntry[]; onOpenRecords: () => void }> = ({ history, onOpenRecords }) => (
  <section className="panel flex flex-col p-5 sm:p-6" aria-labelledby="recent-title">
    <header className="mb-4 flex items-center justify-between gap-2">
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
          🧺
        </span>
        <p className="font-bold">아직 플레이 기록이 없어요</p>
        <p className="text-sm text-ink-3">첫 게임을 시작해 보세요!</p>
      </div>
    ) : (
      <ul className="space-y-2">
        {history.slice(0, 4).map((h, i) => (
          <HistoryRow key={`${h.at}-${i}`} entry={h} />
        ))}
      </ul>
    )}
  </section>
);
