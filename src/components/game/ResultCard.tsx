import React, { useId, useState } from 'react';
import { Check, Crown, Download, Home, Loader2, RotateCcw, Share2 } from 'lucide-react';
import { GameReward, GameType } from '../../types';
import { GAMES, TONE, Tone } from '../../constants';
import { formatNumber } from '../../utils/format';
import { downloadBlob, renderResultImage } from '../../utils/shareImage';
import { usePlayer } from '../PlayerContext';
import { useChallenge } from '../ChallengeContext';
import { useRank } from '../RankContext';

const TONE_HEX: Record<Tone, string> = { berry: '#ff4778', melon: '#2ec27e', mango: '#ffb627', grape: '#7a5cff', soda: '#2ea9ff' };

/** Link to this app (works under a sub-path such as /FruitArcade/) */
export const appUrl = () => window.location.origin + window.location.pathname;

interface ResultCardProps {
  game: GameType;
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
  /** Replaces the plain app link in shared text (e.g. a challenge link) */
  shareUrl?: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  game,
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
  shareUrl,
}) => {
  const titleId = useId();
  const player = usePlayer();
  const { linkFor } = useChallenge();
  const rank = useRank();
  const myRank = rank.result?.game === game ? rank.result : null;
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<'share' | 'image' | null>(null);

  const makeImage = () =>
    renderResultImage({
      emoji: GAMES[game].emoji,
      title,
      gameName: GAMES[game].name,
      color: TONE_HEX[GAMES[game].tone],
      score,
      stats,
      newBest: !!reward?.newBest,
      player: player.name,
    }).catch(() => null);

  const saveImage = async () => {
    setBusy('image');
    const blob = await makeImage();
    setBusy(null);
    if (blob) downloadBlob(blob, `fruit-arcade-${game}-${Math.round(score)}.png`);
  };

  // Phones: share sheet with the score image; elsewhere: copy the text
  const share = async () => {
    const text = `${shareText}\n같은 판으로 내 점수를 넘어 봐! 🥊\n${shareUrl ?? linkFor(game, score)}`;
    if (navigator.share) {
      setBusy('share');
      const blob = await makeImage();
      setBusy(null);
      const file = blob ? new File([blob], 'fruit-arcade.png', { type: 'image/png' }) : null;
      try {
        if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ title: 'FRUIT ARCADE', text, files: [file] });
        else await navigator.share({ title: 'FRUIT ARCADE', text });
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

      {reward?.challenge && (
        <p className={`mt-3 rounded-2xl border-2 border-line px-3 py-2 text-sm font-bold ${reward.challenge.won ? 'bg-melon-soft' : 'bg-berry-soft'}`}>
          {reward.challenge.won
            ? `🥊 도전 성공! ${reward.challenge.name}님의 ${formatNumber(reward.challenge.target)}점을 넘었어요`
            : `😤 아깝다! ${reward.challenge.name}님까지 ${formatNumber(reward.challenge.target - score + 1)}점 남았어요`}
        </p>
      )}

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

      {reward && (rank.signedIn ? myRank && myRank.status !== 'error' : score > 0) && (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1.5 rounded-full border-2 border-line bg-mango-soft px-3 py-1 text-sm font-bold hover:bg-mango"
          onClick={() => rank.open(game)}
        >
          <Crown className="h-4 w-4" strokeWidth={2.5} />
          {!rank.signedIn ? (
            '로그인하면 랭킹에 올라가요'
          ) : myRank?.status === 'pending' ? (
            <>
              순위 확인 중 <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </>
          ) : (
            <span className="tabular-nums">
              오늘 {formatNumber(myRank?.day ?? 0)}위 · 전체 {formatNumber(myRank?.all ?? 0)}위
            </span>
          )}
        </button>
      )}

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
          {reward.streak && <span className="chip bg-berry-soft">🔥 {reward.streak}일 연속!</span>}
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
          <button type="button" className="btn" onClick={share} disabled={busy !== null}>
            {busy === 'share' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : copied ? (
              <Check className="h-4 w-4" strokeWidth={3} />
            ) : (
              <Share2 className="h-4 w-4" strokeWidth={2.5} />
            )}
            {copied ? '복사됨' : '공유'}
          </button>
          <button type="button" className="btn" onClick={saveImage} disabled={busy !== null}>
            {busy === 'image' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" strokeWidth={2.5} />}
            이미지
          </button>
        </div>
        <div className={`grid gap-2 ${extraAction ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {extraAction && (
            <button type="button" className="btn btn-ghost" onClick={extraAction.onClick}>
              {extraAction.label}
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onExit}>
            <Home className="h-4 w-4" strokeWidth={2.5} /> 로비로
          </button>
        </div>
      </div>
    </div>
  );
};
