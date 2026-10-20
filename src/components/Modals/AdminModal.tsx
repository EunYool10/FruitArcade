import React, { useEffect, useRef, useState } from 'react';
import { Ban, Check, Loader2, RefreshCw, RotateCcw, Trash2, UserSearch } from 'lucide-react';
import type { AdminStats as Stats, FeedbackItem, ReportItem, UserRow } from '../../utils/adminService';
import type { BanEntry } from '../../utils/leaderboardService';
import { boardLabel } from '../../utils/ranking';
import { formatNumber } from '../../utils/format';
import { Modal } from '../ui/Modal';
import { ConfirmButton } from '../ui/ConfirmButton';
import { AdminUsers } from './AdminUsers';
import { AdminStats } from './AdminStats';
import { isOnline } from '../../utils/presence';

const adminApi = () => import('../../utils/adminService');
const rankApi = () => import('../../utils/leaderboardService');

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Signed-in admin's uid (bans record who made them) */
  adminUid: string | null;
}

type Tab = 'stats' | 'users' | 'reports' | 'feedback' | 'bans';

const REASON: Record<ReportItem['reason'], string> = { name: '부적절한 닉네임', score: '의심스러운 점수', other: '기타' };
const KIND: Record<FeedbackItem['kind'], string> = { bug: '🐞 버그', idea: '💡 아이디어', other: '💬 기타' };

const when = (ms: number) =>
  ms ? new Date(ms).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

const Empty: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div className="well grid min-h-[160px] place-items-center p-6 text-center">
    <div>
      <p className="text-3xl" aria-hidden="true">
        {icon}
      </p>
      <p className="mt-1 text-sm font-bold text-ink-2">{text}</p>
    </div>
  </div>
);

const Retry: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="well grid min-h-[160px] place-items-center p-6 text-center">
    <div className="space-y-2">
      <p className="text-sm font-bold text-ink-2">불러오지 못했어요. 권한과 인터넷 연결을 확인해 주세요.</p>
      <button type="button" className="btn btn-sm" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" strokeWidth={2.5} /> 다시 시도
      </button>
    </div>
  </div>
);

const Spinner = () => (
  <div className="grid h-[160px] place-items-center text-ink-3">
    <Loader2 className="h-7 w-7 animate-spin" aria-label="불러오는 중" />
  </div>
);

export const AdminModal: React.FC<Props> = ({ isOpen, onClose, adminUid }) => {
  const [tab, setTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<ReportItem[] | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackItem[] | null>(null);
  const [bans, setBans] = useState<BanEntry[] | null>(null);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [notice, setNotice] = useState<{ text: string; ok: boolean; id: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  /** When the counts last came in, shown next to the refresh button */
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  /** The counts and the user list didn't load: offer a retry instead of a spinner that never ends */
  const [loadFailed, setLoadFailed] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** A line under the tabs; good news goes away by itself */
  const say = (text: string, ok: boolean) => {
    setNotice({ text, ok, id: Date.now() });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    if (ok) noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  };

  useEffect(() => {
    if (isOpen) setNotice(null);
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, [isOpen]);

  /** Show one player in the user list */
  const openUser = (uid: string) => {
    setUserSearch(uid);
    setTab('users');
  };

  // Counts for the tab badges, the summary and the stats page, and the user list
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    setRefreshing(true);
    setLoadFailed(false);
    adminApi()
      .then((api) =>
        Promise.all([
          api.loadStats().then((s) => alive && setStats(s)),
          api.listUsers().then((u) => alive && setUsers(u)),
        ])
      )
      .then(() => alive && setLoadedAt(Date.now()))
      .catch((err) => {
        console.warn('Failed to load admin stats:', err);
        if (alive) {
          setLoadFailed(true);
          say('통계나 유저 목록을 불러오지 못했어요.', false);
        }
      })
      .finally(() => alive && setRefreshing(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, reload]);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    const fail = (what: string) => (err: unknown) => {
      console.warn(`Failed to load ${what}:`, err);
      if (alive) say('목록을 불러오지 못했어요.', false);
    };
    if (tab === 'reports') {
      setReports(null);
      adminApi()
        .then((api) => api.listReports(showDone))
        .then((r) => alive && setReports(r))
        .catch(fail('reports'));
    } else if (tab === 'feedback') {
      setFeedback(null);
      adminApi()
        .then((api) => api.listFeedback())
        .then((f) => alive && setFeedback([...f].sort((a, b) => (a.status === b.status ? b.at - a.at : a.status === 'new' ? -1 : 1))))
        .catch(fail('feedback'));
    } else if (tab === 'bans') {
      setBans(null);
      rankApi()
        .then((api) => api.listBans())
        .then((b) => alive && setBans(b))
        .catch(fail('bans'));
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tab, showDone, reload]);

  /** Runs an admin action, then refreshes the lists and counts */
  const act = async (key: string, done: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setNotice(null);
    try {
      await fn();
      say(done, true);
      setReload((r) => r + 1);
    } catch (err) {
      console.warn('Admin action failed:', err);
      say('처리하지 못했어요. 권한과 인터넷 연결을 확인해 주세요.', false);
    } finally {
      setBusy(null);
    }
  };

  const now = Date.now();
  const onlineNow = users?.filter((u) => isOnline(u.lastSeen, now)).length ?? 0;
  const TABS: { id: Tab; icon: string; label: string; badge?: number }[] = [
    { id: 'stats', icon: '📊', label: '통계' },
    { id: 'users', icon: '👥', label: '유저' },
    { id: 'reports', icon: '🚩', label: '신고', badge: stats?.openReports },
    { id: 'feedback', icon: '💬', label: '의견', badge: stats?.newFeedback },
    { id: 'bans', icon: '🚫', label: '차단' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="관리자" subtitle="유저 · 신고 · 의견 · 차단을 한곳에서" icon="🛡️" tone="grape" size="xl">
      <div role="tablist" aria-label="관리 메뉴" className="grid grid-cols-5 gap-1.5 pt-2.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex flex-col items-center rounded-2xl border-2 border-line px-0.5 py-1.5 font-bold transition-all sm:flex-row sm:justify-center sm:gap-1.5 sm:py-2 ${
              tab === t.id ? '-translate-y-0.5 bg-grape text-white shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'
            }`}
          >
            <span aria-hidden="true" className="text-base leading-tight">
              {t.icon}
            </span>
            <span className="text-[11px] sm:text-sm">{t.label}</span>
            {!!t.badge && (
              <span className="absolute -right-1.5 -top-2 grid h-5 min-w-5 place-items-center rounded-full border-2 border-line bg-berry px-1 text-[10px] text-white">
                {t.badge > 99 ? '99+' : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="my-2 flex items-center justify-end gap-2 text-[11px] font-bold text-ink-3">
        <span>{refreshing ? '불러오는 중…' : loadedAt ? `${new Date(loadedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준` : ''}</span>
        <button
          type="button"
          className="btn btn-sm btn-icon"
          onClick={() => setReload((r) => r + 1)}
          disabled={refreshing}
          aria-label="새로고침"
          title="새로고침"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2.5} />
        </button>
      </div>

      {notice && (
        <p
          key={notice.id}
          role="status"
          className={`mb-3 rounded-2xl border-2 border-line px-3 py-2 text-sm font-bold animate-pop-in ${notice.ok ? 'bg-melon-soft' : 'bg-berry-soft'}`}
        >
          {notice.ok ? '✅' : '⚠️'} {notice.text}
        </p>
      )}

      {tab === 'users' &&
        (!users ? (
          loadFailed ? <Retry onRetry={() => setReload((r) => r + 1)} /> : <Spinner />
        ) : (
          <AdminUsers
            users={users}
            search={userSearch}
            onSearch={setUserSearch}
            busy={busy}
            onCopy={(text, what) =>
              navigator.clipboard
                ?.writeText(text)
                .then(() => say(`${what}를 복사했어요.`, true))
                .catch(() => say('복사하지 못했어요.', false))
            }
            onClearBoards={(u) => act(u.uid, `${u.name}님의 랭킹 기록을 지웠어요.`, async () => (await adminApi()).clearBoardsOf(u.uid))}
            onBan={(u) =>
              act(u.uid, `${u.name}님을 차단했어요.`, async () => {
                if (!adminUid) throw new Error('not signed in');
                await (await rankApi()).banPlayer(adminUid, u.uid, u.rawName);
                await (await adminApi()).closeReportsAbout(u.uid);
              })
            }
            onUnban={(u) => act(u.uid, `${u.name}님의 차단을 풀었어요.`, async () => (await rankApi()).unban(u.uid))}
          />
        ))}

      {tab === 'stats' &&
        (!stats ? (
          loadFailed ? <Retry onRetry={() => setReload((r) => r + 1)} /> : <Spinner />
        ) : (
          <AdminStats
            stats={stats}
            people={users ? { total: users.length, online: onlineNow } : null}
            refreshing={refreshing}
            onOpen={setTab}
          />
        ))}

      {tab === 'reports' && (
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center justify-end gap-1.5 text-xs font-bold text-ink-2">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="h-4 w-4 accent-[var(--grape)]" />
            처리한 신고도 보기
          </label>
          {!reports ? (
            <Spinner />
          ) : reports.length === 0 ? (
            <Empty icon="🎉" text={showDone ? '신고가 없어요.' : '처리할 신고가 없어요.'} />
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.id} className={`rounded-2xl border-2 border-line p-3 ${r.status === 'open' ? 'bg-surface-2' : 'bg-surface opacity-70'}`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-bold">{r.targetName}</span>
                    <span className="chip h-6 bg-berry-soft px-2 text-[11px]">{REASON[r.reason]}</span>
                    {r.status === 'done' && <span className="chip h-6 bg-melon-soft px-2 text-[11px]">처리됨</span>}
                    <span className="ml-auto text-[11px] text-ink-3">{when(r.at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-2">
                    {boardLabel(r.board)} · {formatNumber(r.score)}점 · 신고한 사람 {r.reporter.slice(0, 6)}
                    <button type="button" className="ml-2 font-bold text-grape-ink underline underline-offset-2" onClick={() => openUser(r.target)}>
                      유저 보기
                    </button>
                  </p>
                  {r.note && <p className="mt-1.5 rounded-xl bg-surface px-2.5 py-1.5 text-sm">“{r.note}”</p>}
                  {r.status === 'open' ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <ConfirmButton
                        className="btn btn-sm w-full"
                        question={`${r.targetName}님의 이 기록을 지울까요?`}
                        confirmLabel="지우기"
                        onConfirm={() =>
                          act(r.id, `${r.targetName}님의 기록을 지웠어요.`, async () => {
                            const api = await adminApi();
                            await api.deleteBoardEntry(r.board, r.target);
                            await api.closeReportsAbout(r.target);
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2.5} /> 기록 삭제
                      </ConfirmButton>
                      <ConfirmButton
                        className="btn btn-sm btn-primary w-full"
                        question={`${r.targetName}님을 랭킹에서 차단할까요? 지금 순위표의 기록도 지워져요.`}
                        confirmLabel="차단하기"
                        onConfirm={() =>
                          act(r.id, `${r.targetName}님을 차단했어요.`, async () => {
                            if (!adminUid) throw new Error('not signed in');
                            await (await rankApi()).banPlayer(adminUid, r.target, r.targetName);
                            await (await adminApi()).closeReportsAbout(r.target);
                          })
                        }
                      >
                        <Ban className="h-4 w-4" strokeWidth={2.5} /> 차단
                      </ConfirmButton>
                      <button
                        type="button"
                        className="btn btn-sm w-full"
                        disabled={busy === r.id}
                        onClick={() => act(r.id, '신고를 처리 완료로 바꿨어요.', async () => (await adminApi()).setReportStatus(r.id, 'done'))}
                      >
                        <Check className="h-4 w-4" strokeWidth={3} /> 문제없음
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm mt-2"
                      disabled={busy === r.id}
                      onClick={() => act(r.id, '신고를 다시 열었어요.', async () => (await adminApi()).setReportStatus(r.id, 'open'))}
                    >
                      <RotateCcw className="h-4 w-4" strokeWidth={2.5} /> 다시 열기
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'feedback' &&
        (!feedback ? (
          <Spinner />
        ) : feedback.length === 0 ? (
          <Empty icon="📭" text="아직 받은 의견이 없어요." />
        ) : (
          <ul className="space-y-2">
            {feedback.map((f) => (
              <li key={f.id} className={`rounded-2xl border-2 border-line p-3 ${f.status === 'new' ? 'bg-surface-2' : 'bg-surface opacity-70'}`}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="chip h-6 bg-soda-soft px-2 text-[11px]">{KIND[f.kind]}</span>
                  <span className="font-bold">{f.name}</span>
                  {f.status === 'new' && <span className="chip h-6 bg-berry px-2 text-[11px] text-white">NEW</span>}
                  <span className="ml-auto text-[11px] text-ink-3">{when(f.at)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-surface px-3 py-2 text-sm">{f.message}</p>
                <p className="mt-1 text-[11px] text-ink-3">
                  v{f.version} · {f.device}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={busy === f.id}
                    onClick={() =>
                      act(f.id, f.status === 'new' ? '확인 완료로 표시했어요.' : '새 의견으로 되돌렸어요.', async () =>
                        (await adminApi()).setFeedbackStatus(f.id, f.status === 'new' ? 'done' : 'new')
                      )
                    }
                  >
                    {f.status === 'new' ? (
                      <>
                        <Check className="h-4 w-4" strokeWidth={3} /> 확인 완료
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4" strokeWidth={2.5} /> 새 의견으로
                      </>
                    )}
                  </button>
                  <ConfirmButton
                    className="btn btn-sm"
                    question="이 의견을 지울까요?"
                    confirmLabel="지우기"
                    onConfirm={() => act(f.id, '의견을 지웠어요.', async () => (await adminApi()).deleteFeedback(f.id))}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2.5} /> 삭제
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'bans' &&
        (!bans ? (
          <Spinner />
        ) : bans.length === 0 ? (
          <Empty icon="🕊️" text="차단된 사람이 없어요." />
        ) : (
          <ul className="space-y-1.5">
            {bans.map((b) => (
              <li key={b.uid} className="flex items-center gap-2 rounded-2xl border-2 border-line bg-surface-2 px-3 py-2 text-sm">
                <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 text-left" onClick={() => openUser(b.uid)} aria-label={`${b.name} 유저 보기`}>
                  <UserSearch className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={2.5} />
                  <span className="truncate font-bold">{b.name}</span>
                </button>
                {b.at > 0 && <span className="shrink-0 text-xs text-ink-3">{new Date(b.at).toLocaleDateString('ko-KR')}</span>}
                <button
                  type="button"
                  className="btn btn-sm shrink-0"
                  disabled={busy === b.uid}
                  onClick={() => act(b.uid, `${b.name}님의 차단을 풀었어요.`, async () => (await rankApi()).unban(b.uid))}
                >
                  해제
                </button>
              </li>
            ))}
          </ul>
        ))}
    </Modal>
  );
};
