import React, { useState } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { GameSettings, LifeLimit, MemoryConfig, MemoryMode } from '../../types';
import { playSound } from '../../utils/audio';
import { Segmented } from '../ui/Segmented';

interface Props {
  initial: MemoryConfig;
  settings: GameSettings;
  onStart: (config: MemoryConfig) => void;
  onBack: () => void;
}

const MODES: { value: MemoryMode; label: string; sub: string; emoji: string }[] = [
  { value: '4', label: '4×4', sub: '쉬움 · 16장', emoji: '🍒' },
  { value: '6', label: '6×6', sub: '어려움 · 36장', emoji: '🍇' },
  { value: '8', label: '8×8 타임어택', sub: '3분 제한 · 특수 카드', emoji: '⏱️' },
  { value: '8-joker', label: '8×8 조커', sub: '조커 8장이 숨어 있어요', emoji: '🃏' },
];

const RECOMMENDED_PREVIEW: Record<MemoryMode, number> = { '4': 2000, '6': 3000, '8': 5000, '8-joker': 5000 };
const PREVIEWS = [2000, 3000, 5000, 7000, 10000];

const Field: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h2 className="mb-2 font-display text-lg">{title}</h2>
    {children}
  </div>
);

export const MemorySetup: React.FC<Props> = ({ initial, settings, onStart, onBack }) => {
  const [mode, setMode] = useState<MemoryMode>(initial.mode);
  const [previewTime, setPreviewTime] = useState(initial.previewTime);
  const [lifeLimit, setLifeLimit] = useState<LifeLimit>(initial.lifeLimit);

  const isBig = mode === '8' || mode === '8-joker';
  const showWarning = isBig && previewTime < 5000;

  const pickMode = (m: MemoryMode) => {
    setMode(m);
    setPreviewTime(RECOMMENDED_PREVIEW[m]);
    playSound('click', settings);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 py-1">
      <div className="text-center">
        <span className="sticker h-14 w-14 -rotate-6 bg-berry text-3xl" aria-hidden="true">
          🍓
        </span>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">과일 메모리</h1>
        <p className="mt-1 text-ink-2">난이도를 고르고 시작하세요</p>
      </div>

      <div className="panel space-y-5 p-4 sm:p-5">
        <Field title="모드">
          <div className="grid grid-cols-2 gap-3" role="group" aria-label="모드">
            {MODES.map((m) => {
              const active = m.value === mode;
              return (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pickMode(m.value)}
                  className={`flex items-center gap-3 rounded-2xl border-2 border-line p-3 text-left transition-all ${
                    active ? '-translate-y-0.5 bg-berry-soft shadow-hard' : 'bg-surface-2 hover:bg-surface-3'
                  }`}
                >
                  <span
                    className={`sticker h-11 w-11 shrink-0 text-2xl ${active ? '-rotate-6 bg-berry' : 'bg-surface shadow-none'}`}
                    aria-hidden="true"
                  >
                    {m.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-lg leading-tight">{m.label}</span>
                    <span className="block text-xs text-ink-3">{m.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field title="처음에 보여주는 시간">
          <Segmented<number>
            ariaLabel="처음에 보여주는 시간"
            columns={5}
            value={previewTime}
            onChange={setPreviewTime}
            options={PREVIEWS.map((v) => ({
              value: v,
              label: `${v / 1000}초`,
              sub: v === RECOMMENDED_PREVIEW[mode] ? '추천' : undefined,
            }))}
          />
          {showWarning && (
            <p className="mt-2.5 rounded-xl border-2 border-line bg-mango-soft px-3 py-2 text-sm font-semibold">
              ⚠️ 8×8은 카드가 많아서 5초 이상을 추천해요.
            </p>
          )}
        </Field>

        <Field title="목숨">
          <Segmented<LifeLimit>
            ariaLabel="목숨"
            columns={3}
            value={lifeLimit}
            onChange={setLifeLimit}
            options={[
              { value: 'infinite', label: '무제한', sub: '편하게' },
              { value: '10', label: '10번', sub: '적당히' },
              { value: '5', label: '5번', sub: '하드코어' },
            ]}
          />
        </Field>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          className="btn btn-lg"
          onClick={() => {
            playSound('click', settings);
            onBack();
          }}
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={3} /> 로비
        </button>
        <button
          type="button"
          className="btn btn-lg btn-primary flex-1"
          onClick={() => {
            playSound('click', settings);
            onStart({ mode, previewTime, lifeLimit });
          }}
        >
          <Play className="h-5 w-5 fill-current" /> 시작!
        </button>
      </div>
    </div>
  );
};
