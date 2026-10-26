import React from 'react';
import { Swords } from 'lucide-react';
import { GAMES, TONE } from '../../constants';
import { Challenge } from '../../utils/challenge';
import { formatNumber } from '../../utils/format';
import { DASH_LABEL, MEMORY_LABEL, SLICE_LABEL } from '../challengeLabels';
import { Modal } from '../ui/Modal';
import { Emoji } from '../ui/Emoji';

interface Props {
  challenge: Challenge | null;
  onAccept: () => void;
  onDismiss: () => void;
}

export const ChallengeModal: React.FC<Props> = ({ challenge, onAccept, onDismiss }) => {
  if (!challenge) return null;
  const meta = GAMES[challenge.g];
  const details = [
    challenge.m && `${MEMORY_LABEL[challenge.m.mode]} · 기억 ${challenge.m.previewTime / 1000}초`,
    // Old 과일 자르기 links carry no difficulty: they were played on 중간
    challenge.g === 'slice' ? `난이도 ${SLICE_LABEL[challenge.d ?? 'normal']}` : challenge.d && `난이도 ${DASH_LABEL[challenge.d]}`,
  ].filter(Boolean);

  return (
    <Modal isOpen onClose={onDismiss} title="도전장이 도착했어요!" subtitle="같은 판으로 점수를 겨뤄요" icon="🥊" tone="berry" size="sm">
      <div className={`rounded-2xl border-2 border-line p-4 text-center ${TONE[meta.tone].soft}`}>
        <span className={`sticker h-16 w-16 -rotate-6 text-4xl ${TONE[meta.tone].bg}`} aria-hidden="true">
          <Emoji e={meta.emoji} />
        </span>
        <p className="mt-3 text-sm">
          <b>{challenge.n}</b>님이 <b>{meta.name}</b>에서
        </p>
        <p className="font-display text-4xl tabular-nums">{formatNumber(challenge.sc)}점</p>
        <p className="text-sm text-ink-2">을 기록했어요. 넘어 볼까요?</p>
        {details.length > 0 && <p className="mt-2 text-xs font-bold text-ink-3">{details.join(' · ')}</p>}
      </div>
      <div className="mt-4 flex gap-2">
        <button type="button" className="btn" onClick={onDismiss}>
          다음에
        </button>
        <button type="button" className="btn btn-primary flex-1" onClick={onAccept} autoFocus>
          <Swords className="h-4 w-4" strokeWidth={2.5} /> 도전하기
        </button>
      </div>
    </Modal>
  );
};
