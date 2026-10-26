import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { ACHIEVEMENT_COUNT, ACHIEVEMENT_DEFINITIONS, countUnlocked, getUnlockedAchievements } from '../../utils/achievements';
import { XP } from '../../utils/progress';
import { Achievement } from '../../types';
import { GAMES, TONE, Tone } from '../../constants';
import { formatNumber } from '../../utils/format';
import { Modal } from '../ui/Modal';
import { Emoji } from '../ui/Emoji';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Category = 'every' | NonNullable<Achievement['game']>;
type Show = 'all' | 'done' | 'todo';

const CATEGORIES: { id: Category; emoji: string; label: string }[] = [
  { id: 'every', emoji: '🏆', label: '전체' },
  { id: 'memory', emoji: '🍓', label: '메모리' },
  { id: 'suika', emoji: '🍉', label: '수박' },
  { id: 'dash', emoji: '🏃', label: '대시' },
  { id: 'puzzle', emoji: '🧩', label: '퍼즐' },
  { id: 'slice', emoji: '🔪', label: '자르기' },
  { id: 'piano', emoji: '🎹', label: '피아노' },
  { id: 'jump', emoji: '🦘', label: '점프' },
  { id: 'juice', emoji: '🧃', label: '주스' },
  { id: 'draw', emoji: '🎨', label: '그리기' },
  { id: 'all', emoji: '🏅', label: '기타' },
];

/** A game's colour for its achievements (기타 is grape) */
const toneOf = (a: Achievement): Tone => (a.game && a.game !== 'all' ? GAMES[a.game].tone : 'grape');

const shortDate = (d: string) => d.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, day) => `${y}. ${Number(m)}. ${Number(day)}.`);

/** Share of achievements done, as a ring */
const Ring: React.FC<{ value: number; max: number }> = ({ value, max }) => {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <span className="relative grid h-20 w-20 shrink-0 place-items-center" role="img" aria-label={`업적 ${max}개 중 ${value}개 달성`}>
      <svg viewBox="0 0 76 76" className="absolute inset-0 -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="9" />
        {value > 0 && <circle cx="38" cy="38" r={r} fill="none" stroke="var(--mango)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(c * value) / max} ${c}`} />}
      </svg>
      <span className="text-center leading-none">
        <span className="block font-display text-xl tabular-nums">{pct}%</span>
      </span>
    </span>
  );
};

export const AchievementsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [category, setCategory] = useState<Category>('every');
  const [show, setShow] = useState<Show>('all');

  const unlocked = getUnlockedAchievements();
  const unlockedCount = countUnlocked(unlocked);
  const inCategory = (c: Category) => ACHIEVEMENT_DEFINITIONS.filter((a) => c === 'every' || a.game === c);
  const list = inCategory(category)
    .filter((a) => (show === 'done' ? unlocked[a.id] : show === 'todo' ? !unlocked[a.id] : true))
    // Done ones first, newest first; then the rest in order
    .sort((a, b) => (unlocked[b.id] ?? '').localeCompare(unlocked[a.id] ?? ''));
  const recent = ACHIEVEMENT_DEFINITIONS.filter((a) => unlocked[a.id])
    .sort((a, b) => unlocked[b.id].localeCompare(unlocked[a.id]))
    .slice(0, 3);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="업적" subtitle={`하나 달성할 때마다 +${XP.achievement} XP · 칭호로 달 수 있어요`} icon="🏆" tone="mango" size="lg">
      {/* Summary: how far, what it gave, the latest ones */}
      <section className="well mb-4 flex flex-wrap items-center gap-4 p-4">
        <Ring value={unlockedCount} max={ACHIEVEMENT_COUNT} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl tabular-nums">
            {unlockedCount} <span className="text-base text-ink-3">/ {ACHIEVEMENT_COUNT}</span>
          </p>
          <p className="text-xs text-ink-2">
            업적으로 받은 경험치 <b>{formatNumber(unlockedCount * XP.achievement)} XP</b> · 남은 업적 {ACHIEVEMENT_COUNT - unlockedCount}개
          </p>
          {recent.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-ink-3">최근</span>
              {recent.map((a) => (
                <span key={a.id} className={`chip h-7 px-2 text-[11px] ${TONE[toneOf(a)].soft}`}>
                  <Emoji e={a.icon} /> {a.title}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories with their counts */}
      <div role="tablist" aria-label="업적 분류" className="mb-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {CATEGORIES.map((c) => {
          const all = inCategory(c.id);
          const done = all.filter((a) => unlocked[a.id]).length;
          if (!all.length) return null;
          const on = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setCategory(c.id)}
              className={`flex flex-col items-center rounded-2xl border-2 border-line px-1 py-1.5 transition-all ${
                on ? '-translate-y-0.5 bg-mango text-on-bright shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'
              }`}
            >
              <span className="text-lg leading-none">
                <Emoji e={c.emoji} />
              </span>
              <span className="mt-0.5 text-[11px] font-bold">{c.label}</span>
              <span className={`text-[10px] font-bold tabular-nums ${on ? '' : 'text-ink-3'}`}>
                {done}/{all.length}
              </span>
            </button>
          );
        })}
      </div>
      <div role="group" aria-label="보기" className="mb-3 flex gap-1.5">
        {(
          [
            ['all', '전체'],
            ['done', '✓ 달성'],
            ['todo', '🔒 미달성'],
          ] as [Show, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            aria-pressed={show === v}
            onClick={() => setShow(v)}
            className={`chip h-8 px-3 text-xs ${show === v ? 'bg-grape text-white shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="grid gap-2.5 sm:grid-cols-2">
        {list.map((a) => {
          const date = unlocked[a.id];
          const tone = TONE[toneOf(a)];
          // A hidden one stays a question mark until it's found
          const secret = a.hidden && !date;
          return (
            <li key={a.id} className={`relative flex items-start gap-3 rounded-2xl border-2 border-line p-3 ${date ? `${tone.soft} shadow-hard-sm` : 'bg-surface-2'}`}>
              <span
                className={`sticker h-12 w-12 shrink-0 text-2xl ${date ? `-rotate-6 ${tone.bg}` : 'bg-surface-3 shadow-none'}`}
                aria-hidden="true"
              >
                <span className={date ? '' : 'opacity-30 grayscale'}>
                  <Emoji e={secret ? '❔' : a.icon} />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-bold leading-tight">
                  {secret ? '숨은 업적' : a.title}
                  {!date && <Lock className="h-3.5 w-3.5 shrink-0 text-ink-3" strokeWidth={2.5} aria-label="잠김" />}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-ink-2">{secret ? '어딘가에 숨어 있어요. 찾아보세요!' : a.desc}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                  <span className="chip h-5 bg-surface px-1.5">+{XP.achievement} XP</span>
                  <span className="chip h-5 bg-surface px-1.5">🏷️ 칭호</span>
                  {date && <span className="text-ink-3">✓ {shortDate(date)}</span>}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {list.length === 0 && (
        <p className="py-10 text-center text-sm text-ink-3">{show === 'todo' ? '이 분류의 업적을 모두 달성했어요! 🎉' : '아직 달성한 업적이 없어요.'}</p>
      )}
    </Modal>
  );
};
