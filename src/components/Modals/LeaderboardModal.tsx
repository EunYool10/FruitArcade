import React, { useEffect, useRef, useState } from 'react';
import { Ban, Flag, Loader2, LogIn, RotateCcw, Shield, Trash2 } from 'lucide-react';
import { GameType } from '../../types';
import { GAMES, GAME_ORDER } from '../../constants';
import { formatNumber } from '../../utils/format';
import { PERIOD_LABEL, RANK_PERIODS, RankEntry, RankPeriod, boardId, kstWeek, rankErrorKind, weekRangeLabel } from '../../utils/ranking';
import { titleDef } from '../../utils/titles';
import type { ReportReason } from '../../utils/communityService';
import { Modal } from '../ui/Modal';
import { ConfirmButton } from '../ui/ConfirmButton';
import { Framed } from '../ui/Avatar';
import { TitleTag } from '../ui/TitleTag';

const rankApi = () => import('../../utils/leaderboardService');
const communityApi = () => import('../../utils/communityService');

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

const REASONS: [ReportReason, string][] = [
  ['name', '부적절한 닉네임'],
  ['score', '의심스러운 점수'],
  ['other', '기타'],
];

/** Places with ties sharing a number (1, 2, 2, 4 ...) */
function placesOf(entries: RankEntry[]): number[] {
  return entries.map((e, i) => {
    let p = i;
    while (p > 0 && entries[p - 1].score === e.score) p--;
    return p + 1;
  });
}

interface RowProps {
  entry: RankEntry;
  place: number;
  mine: boolean;
  /** Won this game's weekly board last week */
  champion?: boolean;
  /** Small button at the end of the row (admin tools or report) */
  action?: React.ReactNode;
  /** Opens under the row */
  panel?: React.ReactNode;
}

/** Name with the 👑 for last week's winner and the worn title underneath */
const NameBlock: React.FC<{ entry: RankEntry; mine?: boolean; champion?: boolean }> = ({ entry, mine, champion }) => {
  const t = titleDef(entry.title);
  return (
    <span className="min-w-0 flex-1">
      <span className="flex min-w-0 items-center gap-1 font-bold">
        {champion && (
          <span role="img" aria-label="지난주 1위" title="지난주 1위">
            👑
          </span>
        )}
        <span className="truncate">{entry.name}</span>
        {mine && <span className="shrink-0 text-xs text-ink-3">(나)</span>}
      </span>
      {t && <TitleTag title={t} variant="line" />}
    </span>
  );
};

const Row: React.FC<RowProps> = ({ entry, place, mine, champion, action, panel }) => (
  <li
    className={`rounded-2xl border-2 px-3 py-2 ${mine ? 'border-line bg-mango-soft shadow-hard-sm' : 'border-transparent bg-surface-2'}`}
    aria-current={mine ? 'true' : undefined}
  >
    <div className="flex items-center gap-3">
      <span className="w-8 shrink-0 text-center font-display text-lg tabular-nums">
        {place <= 3 ? <span aria-label={`${place}위`}>{MEDAL[place - 1]}</span> : place}
      </span>
      <Framed frame={entry.frame} shape="sticker">
        <span className="sticker h-9 w-9 shrink-0 bg-surface text-xl shadow-none" aria-hidden="true">
          {entry.avatar}
        </span>
      </Framed>
      <NameBlock entry={entry} mine={mine} champion={champion} />
      <span className="shrink-0 font-display text-lg tabular-nums">{formatNumber(entry.score)}</span>
      {action}
    </div>
    {panel}
  </li>
);

const Busy = () => (
  <p className="mt-2 flex items-center justify-center gap-2 text-sm font-bold text-ink-2">
    <Loader2 className="h-4 w-4 animate-spin" /> 처리하는 중...
  </p>
);

/** Admin: delete this entry or ban the player */
const AdminTools: React.FC<{ entry: RankEntry; onDelete: () => void; onBan: () => void }> = ({ entry, onDelete, onBan }) => (
  <div className="mt-2 grid gap-2 sm:grid-cols-2">
    <ConfirmButton className="btn btn-sm w-full" question={`${entry.name}님의 이 기록을 지울까요?`} confirmLabel="지우기" onConfirm={onDelete}>
      <Trash2 className="h-4 w-4" strokeWidth={2.5} /> 기록 삭제
    </ConfirmButton>
    <ConfirmButton
      className="btn btn-sm btn-primary w-full"
      question={`${entry.name}님을 랭킹에서 차단할까요? 지금 순위표에 있는 기록도 모두 지워져요.`}
      confirmLabel="차단하기"
      onConfirm={onBan}
    >
      <Ban className="h-4 w-4" strokeWidth={2.5} /> 차단
    </ConfirmButton>
  </div>
);

/** Player: tell the admins what's wrong with this entry */
const ReportForm: React.FC<{ entry: RankEntry; onSend: (reason: ReportReason, note: string) => void; onCancel: () => void }> = ({
  entry,
  onSend,
  onCancel,
}) => {
  const [reason, setReason] = useState<ReportReason>('score');
  const [note, setNote] = useState('');
  return (
    <div className="mt-2 space-y-2 rounded-2xl border-2 border-line bg-surface p-3">
      <p className="text-sm font-bold">{entry.name}님을 신고하는 이유</p>
      <div role="group" aria-label="신고 이유" className="flex flex-wrap gap-1.5">
        {REASONS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={reason === value}
            onClick={() => setReason(value)}
            className={`chip h-8 px-3 text-xs transition-colors ${reason === value ? 'bg-berry text-white shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        value={note}
        maxLength={200}
        placeholder="자세한 내용 (선택)"
        aria-label="자세한 내용"
        onChange={(e) => setNote(e.target.value)}
        className="h-10 w-full select-text rounded-xl border-2 border-line bg-surface-2 px-3 text-sm outline-none focus:border-berry"
      />
      <div className="flex gap-2">
        <button type="button" className="btn btn-sm btn-primary flex-1" onClick={() => onSend(reason, note)}>
          <Flag className="h-4 w-4" strokeWidth={2.5} /> 신고하기
        </button>
        <button type="button" className="btn btn-sm" onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  );
};

export const LeaderboardModal: React.FC<Props> = ({ isOpen, onClose, game: initialGame, uid, isAdmin, onLogin }) => {
  const [game, setGame] = useState<GameType>(initialGame);
  const [period, setPeriod] = useState<RankPeriod>('day');
  const [status, setStatus] = useState<Status>('loading');
  const [board, setBoard] = useState<Board>({ entries: [], me: null });
  const [reload, setReload] = useState(0);
  const request = useRef(0);

  // 명예의 전당: weekly winners of the selected game; champs: last week's #1 per game (crowns)
  const [fame, setFame] = useState(false);
  const [hall, setHall] = useState<{ week: number; entry: RankEntry | null }[] | null>(null);
  const [champs, setChamps] = useState<Partial<Record<GameType, RankEntry>>>({});

  // Row with its admin tools or report form open
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  // Opening from a result card jumps to that game
  useEffect(() => {
    if (isOpen) {
      setGame(initialGame);
      setNotice(null);
    }
  }, [isOpen, initialGame]);

  useEffect(() => setOpenRow(null), [game, period, isOpen, fame]);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    rankApi()
      .then((api) => api.championsOfWeek(kstWeek() - 1))
      .then((c) => alive && setChamps(c))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !fame) return;
    let alive = true;
    setHall(null);
    const last = kstWeek() - 1;
    rankApi()
      .then((api) => api.hallOfFame(game, [...Array(8)].map((_, i) => last - i)))
      .then((h) => alive && setHall(h))
      .catch((err) => {
        console.warn('Failed to load hall of fame:', err);
        if (alive) setHall([]);
      });
    return () => {
      alive = false;
    };
  }, [isOpen, fame, game]);

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

  /** Runs a row action and shows how it went */
  const run = async (fn: () => Promise<string>, failText: string) => {
    setBusy(true);
    setNotice(null);
    try {
      setNotice({ text: await fn(), ok: true });
      setOpenRow(null);
    } catch (err) {
      console.warn('Leaderboard action failed:', err);
      setNotice({ text: failText, ok: false });
    } finally {
      setBusy(false);
    }
  };

  const moderate = (kind: 'delete' | 'ban', e: RankEntry) =>
    run(async () => {
      const api = await rankApi();
      if (kind === 'delete') await api.deleteEntry(game, period, e.uid);
      else await api.banPlayer(uid!, e.uid, e.name);
      setReload((r) => r + 1);
      return kind === 'delete' ? `${e.name}님의 기록을 지웠어요.` : `${e.name}님을 랭킹에서 차단했어요.`;
    }, '처리하지 못했어요. 관리자 권한과 인터넷 연결을 확인해 주세요.');

  const report = (e: RankEntry, reason: ReportReason, note: string) =>
    run(async () => {
      const result = await (await communityApi()).reportEntry(uid!, boardId(game, period), e, reason, note);
      return result === 'sent' ? '신고했어요. 관리자가 확인할게요.' : '이미 신고한 기록이에요.';
    }, '신고하지 못했어요. 인터넷 연결을 확인해 주세요.');

  /** Admins get a shield on every row; signed-in players can report other people's rows */
  const rowProps = (e: RankEntry): Pick<RowProps, 'action' | 'panel'> => {
    const open = openRow === e.uid;
    const toggle = () => setOpenRow((r) => (r === e.uid ? null : e.uid));
    if (isAdmin) {
      return {
        action: (
          <button type="button" className="btn btn-sm btn-icon shrink-0" aria-label={`${e.name} 기록 관리`} aria-expanded={open} onClick={toggle}>
            <Shield className="h-4 w-4" strokeWidth={2.5} />
          </button>
        ),
        panel: open && (busy ? <Busy /> : <AdminTools entry={e} onDelete={() => moderate('delete', e)} onBan={() => moderate('ban', e)} />),
      };
    }
    if (uid && e.uid !== uid) {
      return {
        action: (
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-berry-soft hover:text-berry-ink"
            aria-label={`${e.name} 신고`}
            aria-expanded={open}
            onClick={toggle}
          >
            <Flag className="h-4 w-4" strokeWidth={2.5} />
          </button>
        ),
        panel: open && (busy ? <Busy /> : <ReportForm entry={e} onSend={(reason, note) => report(e, reason, note)} onCancel={() => setOpenRow(null)} />),
      };
    }
    return {};
  };

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
      <div role="tablist" aria-label="게임" className="mb-2 grid grid-cols-5 gap-1.5">
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
            aria-selected={!fame && p === period}
            onClick={() => {
              setPeriod(p);
              setFame(false);
            }}
            className={`chip h-8 flex-1 justify-center text-xs transition-colors ${
              !fame && p === period ? 'bg-grape text-white shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'
            }`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={fame}
          onClick={() => setFame(true)}
          className={`chip h-8 flex-1 justify-center whitespace-nowrap text-xs transition-colors ${
            fame ? 'bg-mango text-on-bright shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'
          }`}
        >
          🏛️ 명예의 전당
        </button>
      </div>

      {notice && (
        <p
          role="status"
          className={`mb-3 rounded-2xl border-2 border-line px-3 py-2 text-sm font-bold ${notice.ok ? 'bg-melon-soft' : 'bg-berry-soft'}`}
        >
          {notice.text}
        </p>
      )}

      {fame ? (
        <div aria-live="polite" aria-busy={!hall}>
          {!hall ? (
            <div className="grid h-[200px] place-items-center text-ink-3">
              <Loader2 className="h-7 w-7 animate-spin" aria-label="불러오는 중" />
            </div>
          ) : hall.every((h) => !h.entry) ? (
            <div className="well grid min-h-[200px] place-items-center p-6 text-center">
              <div>
                <p className="text-4xl" aria-hidden="true">
                  🏛️
                </p>
                <p className="mt-2 text-sm font-bold text-ink-2">
                  아직 명예의 전당에 오른 사람이 없어요.
                  <br />
                  이번 주 1등이 첫 주인공이 돼요!
                </p>
              </div>
            </div>
          ) : (
            <ol className="space-y-1.5">
              {hall.map(({ week, entry }, i) => (
                <li
                  key={week}
                  className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-2 ${
                    i === 0 && entry ? 'border-line bg-mango-soft shadow-hard-sm' : 'border-transparent bg-surface-2'
                  }`}
                >
                  <span className="w-[4.5rem] shrink-0 text-[11px] font-bold leading-tight text-ink-3">
                    {i === 0 ? '지난주' : weekRangeLabel(week)}
                  </span>
                  {entry ? (
                    <>
                      <Framed frame={entry.frame} shape="sticker">
                        <span className="sticker h-9 w-9 shrink-0 bg-surface text-xl shadow-none" aria-hidden="true">
                          {entry.avatar}
                        </span>
                      </Framed>
                      <NameBlock entry={entry} mine={entry.uid === uid} champion />
                      <span className="shrink-0 font-display text-lg tabular-nums">{formatNumber(entry.score)}</span>
                    </>
                  ) : (
                    <span className="flex-1 text-sm text-ink-3">기록 없음</span>
                  )}
                </li>
              ))}
            </ol>
          )}
          <p className="mt-3 text-center text-[11px] text-ink-3">매주 월요일 0시(한국 시간)에 지난주 1등이 이곳에 올라요 · 1등은 '주간 챔피언' 칭호를 받아요</p>
        </div>
      ) : (
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
                <Row key={e.uid} entry={e} place={places[i]} mine={e.uid === uid} champion={champs[game]?.uid === e.uid} {...rowProps(e)} />
              ))}
            </ol>
            {board.me && (
              <>
                <p className="my-2 text-center text-xs font-bold text-ink-3" aria-hidden="true">
                  ···
                </p>
                <ol>
                  <Row entry={board.me.entry} place={board.me.place} mine champion={champs[game]?.uid === board.me.entry.uid} {...rowProps(board.me.entry)} />
                </ol>
              </>
            )}
          </>
        )}
      </div>
      )}
      {!fame && (
      <p className="mt-3 text-center text-[11px] text-ink-3">
        한 사람당 최고 점수 하나만 올라가요 · 오늘 순위는 매일 자정, 이번 주 순위는 월요일에 새로 시작해요 (한국 시간)
        {uid && !isAdmin && ' · 이상한 기록은 깃발 버튼으로 신고해 주세요'}
      </p>
      )}
    </Modal>
  );
};
