import React, { useId, useState } from 'react';
import { Check, Home, RotateCcw, Share2 } from 'lucide-react';
import { GameReward } from '../../types';
import { TONE, Tone } from '../../constants';
import { formatNumber } from '../../utils/format';

interface ResultCardProps {
  emoji: string;
  title: string;
  subtitle?: string;
  tone: Tone;
  score: number;
  stats: { label: string; value: string }[];
  reward: GameReward | null;
  shareText: string;
  onRetry: () => void;
  onExit: () => void;
  extraAction?: { label: string; onClick: () => void };
}

export const ResultCard: React.FC<ResultCardProps> = ({
  emoji,
  title,
  subtitle,
  tone,
  score,
  stats,
  reward,
  shareText,
  onRetry,
  onExit,
  extraAction,
}) => {
  const titleId = useId();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const text = `${shareText}\n${window.location.origin}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'FRUIT ARCADE', text });
      } catch {
        // cancelled
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="panel w-full max-w-sm p-5 text-center animate-pop-in sm:p-6">
      <div className="text-6xl animate-bounce-in" aria-hidden="true">
        {emoji}
      </div>
      <h2 id={titleId} className={`mt-1 font-display text-4xl ${TONE[tone].ink}`}>
        {title}
      </h2>
      {subtitle && <p className="text-sm text-ink-2">{subtitle}</p>}

      <div className="well relative mt-4 px-4 py-3">
        <p className="text-xs font-bold text-ink-3">최종 점수</p>
        <p className="mt-0.5 font-display text-5xl leading-none tabular-nums">{formatNumber(score)}</p>
        {reward?.newBest ? (
          <span className="chip absolute -right-2 -top-3 rotate-12 bg-berry-deep text-white">NEW BEST!</span>
        ) : (
          reward &&
          reward.prevBest > 0 && <p className="mt-1 text-xs text-ink-3">최고 기록 {formatNumber(reward.prevBest)}점</p>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-left">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border-2 border-line bg-surface-2 px-3 py-1.5">
            <dt className="text-[11px] font-bold text-ink-3">{s.label}</dt>
            <dd className="truncate font-display text-lg tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      {reward && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          <span className="chip bg-mango-soft">✨ +{reward.xpGained} XP</span>
          {reward.levelUp && <span className="chip bg-grape-deep text-white">🎉 레벨 업! Lv.{reward.levelUp}</span>}
          {reward.missions.map((m) => (
            <span key={m} className="chip bg-melon-soft">
              ✅ {m}
            </span>
          ))}
          {reward.achievements.map((a) => (
            <span key={a} className="chip bg-grape-soft">
              {a}
            </span>
          ))}
          {reward.stamp && <span className="chip bg-mango text-on-bright">🏅 오늘의 도장!</span>}
        </div>
      )}

      <div className="mt-5 space-y-2">
        <button type="button" className="btn btn-lg btn-primary w-full" onClick={onRetry} autoFocus>
          <RotateCcw className="h-5 w-5" strokeWidth={2.5} /> 다시 하기
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn" onClick={share}>
            {copied ? <Check className="h-4 w-4" strokeWidth={3} /> : <Share2 className="h-4 w-4" strokeWidth={2.5} />}
            {copied ? '복사됨' : '공유'}
          </button>
          {extraAction ? (
            <button type="button" className="btn" onClick={extraAction.onClick}>
              {extraAction.label}
            </button>
          ) : (
            <button type="button" className="btn" onClick={onExit}>
              <Home className="h-4 w-4" strokeWidth={2.5} /> 로비
            </button>
          )}
        </div>
        {extraAction && (
          <button type="button" className="btn btn-ghost w-full" onClick={onExit}>
            <Home className="h-4 w-4" strokeWidth={2.5} /> 로비로
          </button>
        )}
      </div>
    </div>
  );
};
