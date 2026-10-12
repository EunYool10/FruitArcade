import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { GameType } from '../../types';
import { GAMES, TONE } from '../../constants';
import { Modal } from '../ui/Modal';

const SEEN_KEY = 'fruit_arcade_tutorials';

export function tutorialSeen(game: GameType): boolean {
  try {
    return (JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') as string[]).includes(game);
  } catch {
    return true;
  }
}

export function markSeen(game: GameType): void {
  try {
    const seen = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') as string[]);
    seen.add(game);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // ignore
  }
}

/** Step-by-step "how to play" shown on a game's first visit (and from the help button). */
export const Tutorial: React.FC<{ game: GameType | null; onClose: () => void }> = ({ game, onClose }) => {
  const [step, setStep] = useState(0);
  useEffect(() => setStep(0), [game]);
  if (!game) return null;

  const meta = GAMES[game];
  const steps = meta.tutorial;
  const s = steps[step];
  const last = step === steps.length - 1;
  const close = () => {
    markSeen(game);
    onClose();
  };

  return (
    <Modal isOpen onClose={close} title={`${meta.name} 하는 법`} subtitle={`${step + 1} / ${steps.length}`} icon={meta.emoji} tone={meta.tone} size="sm">
      <div className={`grid h-36 place-items-center rounded-2xl border-2 border-line ${TONE[meta.tone].soft}`}>
        <span key={step} className="text-6xl animate-bounce-in" aria-hidden="true">
          {s.emoji}
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl">{s.title}</h3>
      <p className="mt-1 text-sm text-ink-2">{s.text}</p>

      <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
        {steps.map((_, i) => (
          <span key={i} className={`h-2 rounded-full border border-line transition-all ${i === step ? 'w-6 bg-ink' : 'w-2 bg-surface-3'}`} />
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        {step > 0 && (
          <button type="button" className="btn btn-icon" onClick={() => setStep(step - 1)} aria-label="이전">
            <ArrowLeft className="h-5 w-5" strokeWidth={3} />
          </button>
        )}
        {last ? (
          <button type="button" className={`btn flex-1 ${TONE[meta.tone].btn}`} onClick={close} autoFocus>
            <Play className="h-4 w-4 fill-current" /> 알겠어요!
          </button>
        ) : (
          <button type="button" className="btn btn-primary flex-1" onClick={() => setStep(step + 1)} autoFocus>
            다음 <ArrowRight className="h-4 w-4" strokeWidth={3} />
          </button>
        )}
      </div>
    </Modal>
  );
};
