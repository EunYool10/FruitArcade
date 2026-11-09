import React, { useEffect, useId, useState } from 'react';
import { Check, Crown, Download, Home, Loader2, RotateCcw, Share2 } from 'lucide-react';
import { GameReward, GameType } from '../../types';
import { GAMES, TONE, Tone } from '../../constants';
import { formatNumber } from '../../utils/format';
import { downloadBlob, renderResultImage } from '../../utils/shareImage';
import { usePlayer } from '../PlayerContext';
import { useChallenge } from '../ChallengeContext';
import { useRank } from '../RankContext';
import { Emoji } from '../ui/Emoji';

/**
 * The total rings up like a till: it counts from 0 to `target` over a moment (at once when the
 * player asked for less motion). Whole numbers only while counting, the exact value at the end.
 */
function useCountUp(target: number, ms = 700): number {
  const [shown, setShown] = useState(() => (matchMedia('(prefers-reduced-motion: reduce)').matches ? target : 0));
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || target <= 0) {
      setShown(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(t < 1 ? Math.floor(target * eased) : target);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return shown;
}

const TONE_HEX: Record<Tone, string> = { berry: '#e5483d', melon: '#4aa364', mango: '#f4b63a', grape: '#8257b8', soda: '#3f8fd0', peach: '#f0895a' };

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
  /** false for rounds that never reach the leaderboard (puzzle stages, party games) */
  ranked?: boolean;
  /** What the big number is ("최종 점수") and its unit ("점") */
  scoreLabel?: string;
  unit?: string;
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
  ranked = true,
  scoreLabel = '최종 점수',
  unit = '점',
}) => {
  const titleId = useId();
  const shownScore = useCountUp(score);
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
      player: player.shareName ?? player.name,
    }).catch(() => null);

  const saveImage = async () => {
    setBusy('image');
    const blob = await makeImage();
    setBusy(null);
    if (blob) downloadBlob(blob, `fruit-arcade-${game}-${Math.round(score)}.png`);
  };

  // Phones: share sheet with the score image; elsewhere: copy the text
  const share = async () => {
    const dare = ranked ? '\n같은 판으로 내 점수를 넘어 봐! 🥊' : '';
    const text = `${shareText}${dare}\n${shareUrl ?? linkFor(game, score)}`;
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
    // Laid out like a shop receipt: the game at the top, the items on dotted lines, the total, and a
    // red stamp for a new best
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="panel relative w-full max-w-sm px-5 pb-5 pt-4 text-center animate-pop-in sm:px-6 sm:pb-6">
      <p className="font-display text-xs tracking-[0.3em] text-ink-3">FRUIT ARCADE · 계산서</p>
      {reward?.newBest && (
        <span className="stamp absolute right-5 top-14 bg-surface/70 text-lg text-berry-deep animate-stamp" style={{ '--tilt': '12deg' } as React.CSSProperties}>
          최고 기록!
        </span>
      )}
      <div className="mt-2 text-6xl animate-bounce-in" aria-hidden="true">
        <Emoji e={emoji} />
      </div>
      <h2 id={titleId} className={`mt-1 font-display text-4xl ${TONE[tone].ink}`}>
        {title}
      </h2>
      {subtitle && <p className="text-sm text-ink-2">{subtitle}</p>}

      {reward?.challenge && (
        <p className={`mt-3 rounded-xl border border-line px-3 py-2 text-sm font-bold ${reward.challenge.won ? 'bg-melon-soft' : 'bg-berry-soft'}`}>
          {reward.challenge.won
            ? `🥊 도전 성공! ${reward.challenge.name}님의 ${formatNumber(reward.challenge.target)}점을 넘었어요`
            : `😤 아깝다! ${reward.challenge.name}님까지 ${formatNumber(reward.challenge.target - score + 1)}점 남았어요`}
        </p>
      )}

      <dl className="mt-4 space-y-1 border-y border-dashed border-line py-3 text-left text-sm">
        {stats.map((s) => (
          <div key={s.label} className="flex items-baseline gap-2">
            <dt className="shrink-0 text-ink-2">{s.label}</dt>
            <span className="mb-1 min-w-4 flex-1 border-b border-dotted border-ink-3/50" aria-hidden="true" />
            <dd className="truncate font-display text-lg tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="relative mt-3 flex items-end justify-between gap-3 text-left">
        <div>
          <p className="text-xs font-bold text-ink-3">{scoreLabel}</p>
          {reward && !reward.newBest && reward.prevBest > 0 && (
            <p className="mt-0.5 text-xs text-ink-3">
              최고 기록 {formatNumber(reward.prevBest)}
              {unit}
            </p>
          )}
        </div>
        <p className="font-display text-5xl leading-none tabular-nums">
          {formatNumber(shownScore)}
          {unit !== '점' && <span className="text-3xl">{unit}</span>}
        </p>
      </div>

      {ranked && reward && (rank.signedIn ? myRank : score > 0) && (
        <button
          type="button"
          className={`mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1 text-sm font-bold ${
            myRank?.status === 'rejected' || myRank?.status === 'error' ? 'bg-berry-soft' : 'bg-mango-soft hover:bg-mango'
          }`}
          onClick={() => rank.open(game)}
        >
          <Crown className="h-4 w-4" strokeWidth={2.5} />
          {!rank.signedIn ? (
            '로그인하면 랭킹에 올라가요'
          ) : myRank?.status === 'pending' ? (
            <>
              순위 확인 중 <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </>
          ) : myRank?.status === 'queued' ? (
            '점수 서버가 깨어나는 중이에요 · 잠시 뒤 자동으로 랭킹에 올라가요'
          ) : myRank?.status === 'rejected' ? (
            '점수 확인에 실패해 랭킹에는 안 올라가요'
          ) : myRank?.status === 'error' ? (
            '랭킹에 올리지 못했어요 · 인터넷 연결을 확인해 주세요'
          ) : (
            <span className="tabular-nums">
              오늘 {formatNumber(myRank?.day ?? 0)}위 · 전체 {formatNumber(myRank?.all ?? 0)}위
            </span>
          )}
        </button>
      )}

      {reward && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          <span className="chip bg-mango-soft">✨ +{reward.xpGained} XP</span>
          {reward.coins > 0 && <span className="chip bg-mango text-on-bright">🪙 +{reward.coins}</span>}
          {reward.streak && <span className="chip bg-berry-soft">🔥 {reward.streak}일 연속!</span>}
          {reward.levelUp && <span className="chip bg-grape-deep text-white">🎉 레벨 업! Lv.{reward.levelUp}</span>}
          {reward.levelReward && reward.levelReward.coins > 0 && <span className="chip bg-mango-soft">🎁 레벨 보상 🪙 +{reward.levelReward.coins}</span>}
          {reward.levelReward?.items.map((name) => (
            <span key={name} className="chip bg-grape-soft">
              🎖️ {name} 획득
            </span>
          ))}
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
        {rank.feedback && (
          <button type="button" className="w-full pt-1 text-center text-xs font-bold text-ink-3 underline-offset-2 hover:underline" onClick={rank.feedback}>
            🐞 이상한 점이 있었나요? 의견 · 버그 보내기
          </button>
        )}
      </div>
    </div>
  );
};
