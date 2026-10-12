import React, { useEffect, useRef, useState } from 'react';
import { Loader2, LogIn, RotateCcw } from 'lucide-react';
import { GameType } from '../../types';
import { GAMES, GAME_ORDER } from '../../constants';
import { formatNumber } from '../../utils/format';
import { PERIOD_LABEL, RANK_PERIODS, RankEntry, RankPeriod, rankErrorKind } from '../../utils/ranking';
import { Modal } from '../ui/Modal';

const rankApi = () => import('../../utils/leaderboardService');

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Game whose boards are shown first */
  game: GameType;
  uid: string | null;
  onLogin: () => void;
}

interface Board {
  entries: RankEntry[];
  /** The player's own entry and place when outside the list */
  me: { entry: RankEntry; place: number } | null;
}

type Status = 'loading' | 'ready' | 'denied' | 'offline' | 'other';

const MEDAL = ['🥇', '🥈', '🥉'];

const ERRORS: Record<Exclude<Status, 'loading' | 'ready'>, { icon: string; text: string }> = {
  denied: { icon: '🛠️', text: '랭킹을 준비하고 있어요. 조금만 기다려 주세요!' },
  offline: { icon: '📡', text: '랭킹은 인터넷에 연결되어 있을 때 볼 수 있어요.' },
  other: { icon: '😵', text: '랭킹을 불러오지 못했어요.' },
};

/** Places with ties sharing a number (1, 2, 2, 4 ...) */
function placesOf(entries: RankEntry[]): number[] {
  return entries.map((e, i) => {
    let p = i;
    while (p > 0 && entries[p - 1].score === e.score) p--;
    return p + 1;
  });
}

const Row: React.FC<{ entry: RankEntry; place: number; mine: boolean }> = ({ entry, place, mine }) => (
  <li
    className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-2 ${
      mine ? 'border-line bg-mango-soft shadow-hard-sm' : 'border-transparent bg-surface-2'
    }`}
    aria-current={mine ? 'true' : undefined}
  >
    <span className="w-8 shrink-0 text-center font-display text-lg tabular-nums">
      {place <= 3 ? <span aria-label={`${place}위`}>{MEDAL[place - 1]}</span> : place}
    </span>
    <span className="sticker h-9 w-9 shrink-0 bg-surface text-xl shadow-none" aria-hidden="true">
      {entry.avatar}
    </span>
    <span className="min-w-0 flex-1 truncate font-bold">
      {entry.name}
      {mine && <span className="ml-1.5 text-xs text-ink-3">(나)</span>}
    </span>
    <span className="shrink-0 font-display text-lg tabular-nums">{formatNumber(entry.score)}</span>
  </li>
);

export const LeaderboardModal: React.FC<Props> = ({ isOpen, onClose, game: initialGame, uid, onLogin }) => {
  const [game, setGame] = useState<GameType>(initialGame);
  const [period, setPeriod] = useState<RankPeriod>('day');
  const [status, setStatus] = useState<Status>('loading');
  const [board, setBoard] = useState<Board>({ entries: [], me: null });
  const [reload, setReload] = useState(0);
  const request = useRef(0);

  // Opening from a result card jumps to that game
  useEffect(() => {
    if (isOpen) setGame(initialGame);
  }, [isOpen, initialGame]);

  useEffect(() => {
    if (!isOpen) return;
    const id = ++request.current;
    setStatus('loading');
    (async () => {
      try {
        const api = await rankApi();
        const entries = await api.topScores(game, period);
        let me: Board['me'] = null;
        if (uid && !entries.some((e) => e.uid === uid)) {
          const entry = await api.myEntry(game, period, uid);
          if (entry) me = { entry, place: await api.rankOf(game, period, entry.score) };
        }
        if (id !== request.current) return;
        setBoard({ entries, me });
        setStatus('ready');
      } catch (err) {
        if (id !== request.current) return;
        console.warn('Failed to load leaderboard:', err);
        setStatus(rankErrorKind(err));
      }
    })();
  }, [isOpen, game, period, uid, reload]);

  const places = placesOf(board.entries);
  const meta = GAMES[game];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="랭킹"
      subtitle="오늘 · 이번 주 · 전체 최고 점수"
      icon="🏆"
      tone="mango"
      footer={
        !uid && (
          <div className="flex items-center gap-3 rounded-2xl border-2 border-line bg-soda-soft p-3">
            <p className="flex-1 text-sm font-bold">로그인하면 내 점수도 랭킹에 올라가요!</p>
            <button type="button" className="btn btn-sm btn-soda" onClick={onLogin}>
              <LogIn className="h-4 w-4" strokeWidth={2.5} /> 로그인
            </button>
          </div>
        )
      }
    >
      <div role="tablist" aria-label="게임" className="mb-2 grid grid-cols-4 gap-1.5">
        {GAME_ORDER.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={g === game}
            onClick={() => setGame(g)}
            className={`flex flex-col items-center rounded-2xl border-2 border-line px-1 py-1.5 transition-all ${
              g === game ? '-translate-y-0.5 bg-mango text-on-bright shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'
            }`}
          >
            <span className="text-xl" aria-hidden="true">
              {GAMES[g].emoji}
            </span>
            <span className="font-display text-sm leading-tight">{GAMES[g].short}</span>
          </button>
        ))}
      </div>
      <div role="tablist" aria-label="기간" className="mb-4 flex gap-1.5">
        {RANK_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={p === period}
            onClick={() => setPeriod(p)}
            className={`chip h-8 flex-1 justify-center text-xs transition-colors ${
              p === period ? 'bg-grape text-white shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'
            }`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="min-h-[260px]" aria-live="polite" aria-busy={status === 'loading'}>
        {status === 'loading' ? (
          <div className="grid h-[260px] place-items-center text-ink-3">
            <Loader2 className="h-7 w-7 animate-spin" aria-label="불러오는 중" />
          </div>
        ) : status !== 'ready' ? (
          <div className="well grid h-[260px] place-items-center p-6 text-center">
            <div>
              <p className="text-4xl" aria-hidden="true">
                {ERRORS[status].icon}
              </p>
              <p className="mt-2 text-sm font-bold text-ink-2">{ERRORS[status].text}</p>
              <button type="button" className="btn btn-sm mt-3" onClick={() => setReload((r) => r + 1)}>
                <RotateCcw className="h-4 w-4" strokeWidth={2.5} /> 다시 시도
              </button>
            </div>
          </div>
        ) : board.entries.length === 0 ? (
          <div className="well grid h-[260px] place-items-center p-6 text-center">
            <div>
              <p className="text-4xl" aria-hidden="true">
                {meta.emoji}
              </p>
              <p className="mt-2 text-sm font-bold text-ink-2">
                {period === 'all' ? '아직 기록이 없어요.' : `${PERIOD_LABEL[period]} 기록이 아직 없어요.`}
                <br />첫 번째 주인공이 되어 보세요!
              </p>
            </div>
          </div>
        ) : (
          <>
            <ol className="space-y-1.5">
              {board.entries.map((e, i) => (
                <Row key={e.uid} entry={e} place={places[i]} mine={e.uid === uid} />
              ))}
            </ol>
            {board.me && (
              <>
                <p className="my-2 text-center text-xs font-bold text-ink-3" aria-hidden="true">
                  ···
                </p>
                <ol>
                  <Row entry={board.me.entry} place={board.me.place} mine />
                </ol>
              </>
            )}
          </>
        )}
      </div>
      <p className="mt-3 text-center text-[11px] text-ink-3">
        한 사람당 최고 점수 하나만 올라가요 · 오늘 순위는 매일 자정, 이번 주 순위는 월요일에 새로 시작해요 (한국 시간)
      </p>
    </Modal>
  );
};
