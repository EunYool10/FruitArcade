import React, { useState } from 'react';
import { ACHIEVEMENT_COUNT, ACHIEVEMENT_DEFINITIONS, countUnlocked, getUnlockedAchievements } from '../../utils/achievements';
import { XP } from '../../utils/progress';
import { Achievement } from '../../types';
import { Modal } from '../ui/Modal';
import { Meter } from '../ui/Meter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Filter = 'every' | NonNullable<Achievement['game']>;

const TABS: { id: Filter; label: string }[] = [
  { id: 'every', label: '전체' },
  { id: 'memory', label: '🍓 메모리' },
  { id: 'suika', label: '🍉 수박' },
  { id: 'dash', label: '🏃 대시' },
  { id: 'puzzle', label: '🧩 퍼즐' },
  { id: 'all', label: '🏅 기타' },
];

export const AchievementsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [filter, setFilter] = useState<Filter>('every');
  const [lockedOnly, setLockedOnly] = useState(false);

  const unlocked = getUnlockedAchievements();
  const unlockedCount = countUnlocked(unlocked);
  const list = ACHIEVEMENT_DEFINITIONS.filter(
    (a) => (filter === 'every' || a.game === filter) && !(lockedOnly && unlocked[a.id])
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="업적" subtitle={`하나 달성할 때마다 +${XP.achievement} XP`} icon="🏆" tone="mango" size="lg">
      <div className="well mb-4 p-3.5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-bold">달성 현황</span>
          <span className="font-display text-lg tabular-nums">
            {unlockedCount} / {ACHIEVEMENT_COUNT}
          </span>
        </div>
        <Meter value={unlockedCount} max={ACHIEVEMENT_COUNT} label="업적 달성 현황" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={filter === t.id}
            onClick={() => setFilter(t.id)}
            className={`chip h-8 px-3 text-xs transition-colors ${filter === t.id ? 'bg-mango text-on-bright shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'}`}
          >
            {t.label}
          </button>
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs font-bold text-ink-2">
          <input type="checkbox" checked={lockedOnly} onChange={(e) => setLockedOnly(e.target.checked)} className="h-4 w-4 accent-[var(--mango)]" />
          미달성만
        </label>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {list.map((a) => {
          const date = unlocked[a.id];
          return (
            <li
              key={a.id}
              className={`relative flex flex-col items-center rounded-2xl border-2 border-line p-3 text-center ${
                date ? 'bg-mango-soft shadow-hard-sm' : 'bg-surface-2'
              }`}
            >
              <span
                className={`sticker h-14 w-14 text-3xl ${date ? '-rotate-6 bg-surface' : 'bg-surface-3 shadow-none'}`}
                aria-hidden="true"
              >
                <span className={date ? '' : 'opacity-30 grayscale'}>{a.icon}</span>
              </span>
              {!date && (
                <span className="absolute right-2 top-2 text-sm" aria-hidden="true">
                  🔒
                </span>
              )}
              <p className="mt-2 text-sm font-bold leading-tight">{a.title}</p>
              <p className="mt-1 text-[11px] leading-snug text-ink-2">{a.desc}</p>
              <p className="mt-auto pt-1.5 text-[10px] font-bold text-ink-3">{date ? `✓ ${date}` : '잠김'}</p>
            </li>
          );
        })}
        {list.length === 0 && (
          <li className="col-span-full py-10 text-center text-sm text-ink-3">이 분류의 업적을 모두 달성했어요! 🎉</li>
        )}
      </ul>
    </Modal>
  );
};
