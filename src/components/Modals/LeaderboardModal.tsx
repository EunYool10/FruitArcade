import React, { useEffect, useRef, useState } from 'react';
import { Ban, Loader2, LogIn, RotateCcw, Shield, Trash2 } from 'lucide-react';
import { GameType } from '../../types';
import { GAMES, GAME_ORDER } from '../../constants';
import { formatNumber } from '../../utils/format';
import { PERIOD_LABEL, RANK_PERIODS, RankEntry, RankPeriod, rankErrorKind } from '../../utils/ranking';
import type { BanEntry } from '../../utils/leaderboardService';
import { Modal } from '../ui/Modal';
import { ConfirmButton } from '../ui/ConfirmButton';

const rankApi = () => import('../../utils/leaderboardService');

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Game whose boards are shown first */
  game: GameType;
  uid: string | null;
  /** Shows moderation tools (the server rules decide what actually goes through) */
  isAdmin: boolean;
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

interface ModTools {
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onBan: () => void;
}

const Row: React.FC<{ entry: RankEntry; place: number; mine: boolean; mod?: ModTools }> = ({ entry, place, mine, mod }) => (
  <li
    className={`rounded-2xl border-2 px-3 py-2 ${mine ? 'border-line bg-mango-soft shadow-hard-sm' : 'border-transparent bg-surface-2'}`}
    aria-current={mine ? 'true' : undefined}
  >
    <div className="flex items-center gap-3">
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
      {mod && (
        <button
          type="button"
          className="btn btn-sm btn-icon shrink-0"
          aria-label={`${entry.name} 기록 관리`}
          aria-expanded={mod.open}
          onClick={mod.onToggle}
        >
          <Shield className="h-4 w-4" strokeWidth={2.5} />
        </button>
      )}
    </div>
    {mod?.open &&
      (mod.busy ? (
        <p className="mt-2 flex items-center justify-center gap-2 text-sm font-bold text-ink-2">
          <Loader2 className="h-4 w-4 animate-spin" /> 처리하는 중...
        </p>
      ) : (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <ConfirmButton
            className="btn btn-sm w-full"
            question={`${entry.name}님의 이 기록을 지울까요?`}
            confirmLabel="지우기"
            onConfirm={mod.onDelete}
          >
            <Trash2 className="h-4 w-4" strokeWidth={2.5} /> 기록 삭제
          </ConfirmButton>
          <ConfirmButton
            className="btn btn-sm btn-primary w-full"
            question={`${entry.name}님을 랭킹에서 차단할까요? 지금 순위표에 있는 기록도 모두 지워져요.`}
            confirmLabel="차단하기"
            onConfirm={mod.onBan}
          >
            <Ban className="h-4 w-4" strokeWidth={2.5} /> 차단
          </ConfirmButton>
        </div>
      ))}
  </li>
);

export const LeaderboardModal: React.FC<Props> = ({ isOpen, onClose, game: initialGame, uid, isAdmin, onLogin }) => {
  const [game, setGame] = useState<GameType>(initialGame);
  const [period, setPeriod] = useState<RankPeriod>('day');
  const [status, setStatus] = useState<Status>('loading');
  const [board, setBoard] = useState<Board>({ entries: [], me: null });
  const [reload, setReload] = useState(0);
  const request = useRef(0);

  // Admin moderation
  const [modRow, setModRow] = useState<string | null>(null);
  const [modBusy, setModBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [bans, setBans] = useState<BanEntry[] | null>(null);

  // Opening from a result card jumps to that game
  useEffect(() => {
    if (isOpen) {
      setGame(initialGame);
      setNotice(null);
    }
  }, [isOpen, initialGame]);

  useEffect(() => setModRow(null), [game, period, isOpen]);

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

  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    let alive = true;
    rankApi()
      .then((api) => api.listBans())
      .then((list) => alive && setBans(list))
      .catch(() => alive && setBans([]));
    return () => {
      alive = false;
    };
  }, [isOpen, isAdmin, reload]);

  const moderate = async (kind: 'delete' | 'ban', e: RankEntry) => {
    if (!uid) return;
    setModBusy(true);
    setNotice(null);
    try {
      const api = await rankApi();
      if (kind === 'delete') await api.deleteEntry(game, period, e.uid);
      else await api.banPlayer(uid, e.uid, e.name);
      setNotice({ text: kind === 'delete' ? `${e.name}님의 기록을 지웠어요.` : `${e.name}님을 랭킹에서 차단했어요.`, ok: true });
      setModRow(null);
      setReload((r) => r + 1);
    } catch (err) {
      console.warn('Moderation failed:', err);
      setNotice({ text: '처리하지 못했어요. 관리자 권한과 인터넷 연결을 확인해 주세요.', ok: false });
    } finally {
      setModBusy(false);
    }
  };

  const liftBan = async (b: BanEntry) => {
    try {
      await (await rankApi()).unban(b.uid);
      setNotice({ text: `${b.name}님의 차단을 풀었어요.`, ok: true });
      setReload((r) => r + 1);
    } catch (err) {
      console.warn('Unban failed:', err);
      setNotice({ text: '차단을 풀지 못했어요.', ok: false });
    }
  };

  const modFor = (e: RankEntry): ModTools | undefined =>
    isAdmin
      ? {
          open: modRow === e.uid,
          busy: modBusy,
          onToggle: () => setModRow((r) => (r === e.uid ? null : e.uid)),
          onDelete: () => moderate('delete', e),
          onBan: () => moderate('ban', e),
        }
      : undefined;

  const places = placesOf(board.entries);
  const meta = GAMES[game];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="랭킹"
      subtitle={isAdmin ? '🛡️ 관리자 모드 · 방패 버튼으로 기록을 관리해요' : '오늘 · 이번 주 · 전체 최고 점수'}
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

      {notice && (
        <p
          role="status"
          className={`mb-3 rounded-2xl border-2 border-line px-3 py-2 text-sm font-bold ${notice.ok ? 'bg-melon-soft' : 'bg-berry-soft'}`}
        >
          {notice.text}
        </p>
      )}

      <div aria-live="polite" aria-busy={status === 'loading'}>
        {status === 'loading' ? (
          <div className="grid h-[200px] place-items-center text-ink-3">
            <Loader2 className="h-7 w-7 animate-spin" aria-label="불러오는 중" />
          </div>
        ) : status !== 'ready' ? (
          <div className="well grid min-h-[200px] place-items-center p-6 text-center">
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
          <div className="well grid min-h-[200px] place-items-center p-6 text-center">
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
                <Row key={e.uid} entry={e} place={places[i]} mine={e.uid === uid} mod={modFor(e)} />
              ))}
            </ol>
            {board.me && (
              <>
                <p className="my-2 text-center text-xs font-bold text-ink-3" aria-hidden="true">
                  ···
                </p>
                <ol>
                  <Row entry={board.me.entry} place={board.me.place} mine mod={modFor(board.me.entry)} />
                </ol>
              </>
            )}
          </>
        )}
      </div>
      <p className="mt-3 text-center text-[11px] text-ink-3">
        한 사람당 최고 점수 하나만 올라가요 · 오늘 순위는 매일 자정, 이번 주 순위는 월요일에 새로 시작해요 (한국 시간)
      </p>

      {isAdmin && (
        <details className="mt-4 rounded-2xl border-2 border-line bg-surface-2 p-3">
          <summary className="cursor-pointer text-sm font-bold">🚫 차단 목록{bans ? ` (${bans.length})` : ''}</summary>
          {!bans ? (
            <Loader2 className="mx-auto mt-2 h-5 w-5 animate-spin text-ink-3" aria-label="불러오는 중" />
          ) : bans.length === 0 ? (
            <p className="mt-2 text-sm text-ink-3">차단된 사람이 없어요.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {bans.map((b) => (
                <li key={b.uid} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate font-bold">{b.name}</span>
                  {b.at > 0 && <span className="shrink-0 text-xs text-ink-3">{new Date(b.at).toLocaleDateString('ko-KR')}</span>}
                  <button type="button" className="btn btn-sm shrink-0" onClick={() => liftBan(b)}>
                    해제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </details>
      )}
    </Modal>
  );
};
